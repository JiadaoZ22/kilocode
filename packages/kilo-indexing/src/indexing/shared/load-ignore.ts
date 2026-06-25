import fs from "fs/promises"
import ignore, { type Ignore } from "ignore"
import os from "os"
import path from "path"

const files = [".gitignore", ".kilocodeignore"] as const
const GLOBAL_KILOINDEXIGNORE = path.join(os.homedir(), ".kilocode", ".kiloindexignore")

function notFound(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false
  }
  return "code" in err && err.code === "ENOENT"
}

async function read(root: string, name: string): Promise<string | undefined> {
  return fs.readFile(path.join(root, name), "utf8").catch((err) => {
    if (notFound(err)) {
      return undefined
    }
    throw err
  })
}

async function readGlobal(): Promise<string | undefined> {
  return fs.readFile(GLOBAL_KILOINDEXIGNORE, "utf8").catch((err) => {
    if (notFound(err)) {
      return undefined
    }
    throw err
  })
}

export async function loadIgnore(root: string): Promise<Ignore> {
  const ig = ignore()

  // Load global indexing-only ignore patterns first (lowest priority).
  // `~/.kilocode/.kiloindexignore` is intentionally separate from
  // `.kilocodeignore`: it excludes directories from indexing while still
  // leaving them accessible to the code agent when explicitly targeted.
  const globalTxt = await readGlobal()
  if (globalTxt?.trim()) {
    ig.add(globalTxt)
  }

  for (const name of files) {
    const txt = await read(root, name)
    if (!txt?.trim()) {
      continue
    }

    ig.add(txt)
    ig.add(name)
  }

  return ig
}

/**
 * Load raw ignore patterns from the same sources as `loadIgnore`.
 * These gitignore-style strings can be passed to tools like `glob`
 * so directory pruning happens during traversal instead of after.
 */
export async function loadIgnorePatterns(root: string): Promise<string[]> {
  const patterns: string[] = []

  const globalTxt = await readGlobal()
  if (globalTxt?.trim()) {
    patterns.push(...globalTxt.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")))
  }

  for (const name of files) {
    const txt = await read(root, name)
    if (!txt?.trim()) {
      continue
    }
    patterns.push(...txt.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")))
    patterns.push(name)
  }

  return patterns
}
