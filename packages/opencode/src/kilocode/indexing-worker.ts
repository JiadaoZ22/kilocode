import { CodeIndexManager } from "@kilocode/kilo-indexing/engine"
import { normalizeIndexingStatus } from "@kilocode/kilo-indexing/status"
import type { Request, Result, Event } from "./indexing-worker-protocol"

let manager: CodeIndexManager | undefined
let progress: { dispose(): void } | undefined
let telemetry: { dispose(): void } | undefined

function send(message: Result | Event) {
  postMessage(message)
}

function dispose() {
  progress?.dispose()
  telemetry?.dispose()
  progress = undefined
  telemetry = undefined
  manager?.dispose()
  manager = undefined
}

async function init(request: Extract<Request, { method: "init" }>) {
  dispose()
  if (request.input.lancedbPath) process.env.KILO_LANCEDB_PATH = request.input.lancedbPath
  const next = new CodeIndexManager(request.input.directory, request.input.root)
  manager = next
  progress = next.onProgressUpdate.on(() => {
    send({ type: "event", event: "status", data: normalizeIndexingStatus(next) })
  })
  telemetry = next.onTelemetry.on((data) => {
    send({ type: "event", event: "telemetry", data })
  })
  try {
    await next.initialize(request.input.config)
    send({ type: "result", id: request.id, method: "init", ok: true, value: normalizeIndexingStatus(next) })
  } catch (err) {
    // Dispose the partially-initialized manager so later search requests do not
    // interact with a broken state.
    dispose()
    throw err
  }
}

onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data
  const requestId = request.id
  const requestMethod = request.method
  try {
    if (request.method === "dispose") {
      dispose()
      send({ type: "result", id: request.id, method: "dispose", ok: true, value: undefined })
      return
    }

    if (request.method === "search") {
      const value = manager ? await manager.searchIndex(request.input.query, request.input.directoryPrefix) : []
      send({ type: "result", id: request.id, method: "search", ok: true, value })
      return
    }

    if (request.method === "init") {
      await init(request)
      return
    }

    send({
      type: "result",
      id: requestId,
      method: requestMethod,
      ok: false,
      error: `Unknown indexing worker method: ${requestMethod}`,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    send({ type: "result", id: requestId, method: requestMethod, ok: false, error })
  }
}
