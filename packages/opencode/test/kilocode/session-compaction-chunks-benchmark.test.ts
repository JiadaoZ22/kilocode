import { describe, expect, test } from "bun:test"
import { Effect, Layer, ManagedRuntime } from "effect"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config/config"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { EventV2Bridge } from "../../src/event-v2-bridge"
import { Reference } from "../../src/reference/reference"
import { Plugin } from "../../src/plugin"
import { provideTestInstance } from "../fixture/fixture"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Snapshot } from "../../src/snapshot"
import { KiloSessionCompaction } from "../../src/kilocode/session/compaction"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionCompaction } from "../../src/session/compaction"
import * as SessionProcessorModule from "../../src/session/processor"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { Session as SessionNs } from "../../src/session/session"
import { SessionStatus } from "../../src/session/status"
import { SessionSummary } from "../../src/session/summary"
import { SyncEvent } from "../../src/sync"
import { ProviderTest } from "../fake/provider"
import { Agent } from "../../src/agent/agent"
import { tmpdir } from "../fixture/fixture"

const providerID = ProviderID.make("test")
const modelID = ModelID.make("test-model")
const ref = { providerID, modelID }

function run<A, E>(fx: Effect.Effect<A, E, SessionNs.Service>) {
  return Effect.runPromise(fx.pipe(Effect.provide(SessionNs.defaultLayer)))
}

const store = {
  updateMessage: <T extends MessageV2.Info>(msg: T) => Effect.promise(() => svc.updateMessage(msg)),
  updatePart: <T extends MessageV2.Part>(part: T) => Effect.promise(() => svc.updatePart(part)),
}

const svc = {
  create(input?: SessionNs.CreateInput) {
    return run(SessionNs.Service.use((svc) => svc.create(input)))
  },
  messages(input: Parameters<SessionNs.Interface["messages"]>[0]) {
    return run(SessionNs.Service.use((svc) => svc.messages(input)))
  },
  updateMessage<T extends MessageV2.Info>(msg: T) {
    return run(SessionNs.Service.use((svc) => svc.updateMessage(msg)))
  },
  updatePart<T extends MessageV2.Part>(part: T) {
    return run(SessionNs.Service.use((svc) => svc.updatePart(part)))
  },
}

const summary = Layer.succeed(
  SessionSummary.Service,
  SessionSummary.Service.of({
    summarize: () => Effect.void,
    diff: () => Effect.succeed([]),
    computeDiff: () => Effect.succeed([]),
  }),
)

async function user(sessionID: SessionID, text: string) {
  const msg = await svc.updateMessage({
    id: MessageID.ascending(),
    role: "user",
    sessionID,
    agent: "build",
    model: ref,
    time: { created: Date.now() },
  })
  await svc.updatePart({
    id: PartID.ascending(),
    messageID: msg.id,
    sessionID,
    type: "text",
    text,
  })
  return msg
}

async function assistant(sessionID: SessionID, parentID: MessageID, root: string, text: string) {
  const msg: MessageV2.Assistant = {
    id: MessageID.ascending(),
    role: "assistant",
    sessionID,
    mode: "build",
    agent: "build",
    path: { cwd: root, root },
    cost: 0,
    tokens: { output: 0, input: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    modelID,
    providerID,
    parentID,
    time: { created: Date.now() },
    finish: "stop",
  }
  await svc.updateMessage(msg)
  await svc.updatePart({
    id: PartID.ascending(),
    messageID: msg.id,
    sessionID,
    type: "text",
    text,
  })
  return msg
}

function delayedRuntime(delayMs: number) {
  const calls: number[] = []
  const bus = Bus.layer
  const processor = Layer.effect(
    SessionProcessorModule.SessionProcessor.Service,
    Effect.gen(function* () {
      const sessions = yield* SessionNs.Service
      return SessionProcessorModule.SessionProcessor.Service.of({
        create: Effect.fn("TestSessionProcessor.create")((input) =>
          Effect.succeed({
            get message() {
              return input.assistantMessage
            },
            updateToolCall: Effect.fn("TestSessionProcessor.updateToolCall")(
              (_toolCallID, _update) => Effect.succeed(undefined),
            ),
            metadata: Effect.fn("TestSessionProcessor.metadata")(() => Effect.void),
            completeToolCall: Effect.fn("TestSessionProcessor.completeToolCall")(
              (_toolCallID, _output) => Effect.void,
            ),
            process: Effect.fn("TestSessionProcessor.process")(
              (stream: import("../../src/session/llm").LLM.StreamInput) =>
                Effect.gen(function* () {
                  calls.push(performance.now())
                  yield* Effect.sleep(`${delayMs} millis`)
                  yield* sessions.updatePart({
                    id: PartID.ascending(),
                    messageID: input.assistantMessage.id,
                    sessionID: input.sessionID,
                    type: "text",
                    text: "chunk summary",
                  })
                  input.assistantMessage.finish = "stop"
                  return "continue" as const
                }),
            ),
          } satisfies SessionProcessorModule.SessionProcessor.Handle),
        ),
      })
    }),
  )
  const model = ProviderTest.model({ providerID, id: modelID, limit: { context: 10_000, output: 1_000 } })
  return {
    calls,
    rt: ManagedRuntime.make(
      Layer.mergeAll(SessionCompaction.layer.pipe(Layer.provide(processor)), processor, bus).pipe(
        Layer.provide(ProviderTest.fake({ model }).layer),
        Layer.provide(SessionNs.defaultLayer),
        Layer.provide(Agent.defaultLayer),
        Layer.provide(Plugin.defaultLayer),
        Layer.provide(SyncEvent.defaultLayer),
        Layer.provide(EventV2Bridge.defaultLayer),
        Layer.provide(RuntimeFlags.layer()),
        Layer.provide(Reference.defaultLayer),
        Layer.provide(bus),
        Layer.provide(
          Layer.mock(Config.Service)({
            get: () => Effect.succeed({ ...{}, compaction: { reserved: 1_000 } }),
          }),
        ),
      ),
    ),
  }
}

describe("KiloCompactionChunks benchmark", () => {
  test("processes chunks concurrently (3-at-a-time)", async () => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const session = await svc.create({})
        // Create enough large messages to force multiple chunks
        for (let i = 0; i < 6; i++) {
          const u = await user(session.id, `message ${i} ` + "a".repeat(8_000))
          await assistant(session.id, u.id, tmp.path, `reply ${i} ` + "b".repeat(8_000))
        }
        await Effect.runPromise(
          KiloSessionCompaction.create({
            session: store,
            sessionID: session.id,
            agent: "build",
            model: ref,
            auto: false,
          }),
        )

        const delayMs = 250
        const { rt, calls } = delayedRuntime(delayMs)
        try {
          const msgs = await svc.messages({ sessionID: session.id })
          const parent = msgs.at(-1)?.info.id
          expect(parent).toBeTruthy()

          const start = performance.now()
          const result = await rt.runPromise(
            SessionCompaction.Service.use((svc) =>
              svc.process({
                parentID: parent!,
                messages: msgs,
                sessionID: session.id,
                auto: false,
              }),
            ),
          )
          const elapsed = performance.now() - start

          expect(result).toBe("continue")
          expect(calls.length).toBeGreaterThanOrEqual(2)

          // Serial time for N chunks would be N * delayMs.
          // With concurrency 3, it should be ~ceil(N/3) * delayMs + overhead.
          // We allow generous overhead; anything below serial time proves concurrency.
          const chunkCount = calls.length
          const serialEstimate = chunkCount * delayMs
          const concurrentEstimate = Math.ceil(chunkCount / 3) * delayMs + 200

          console.log(`Benchmark: ${chunkCount} chunks, elapsed ${elapsed.toFixed(1)} ms, serial estimate ${serialEstimate} ms, concurrent estimate ${concurrentEstimate} ms`)

          expect(elapsed).toBeLessThan(serialEstimate * 0.8)
          expect(elapsed).toBeLessThan(concurrentEstimate * 1.5)
        } finally {
          await rt.dispose()
        }
      },
    })
  })
})
