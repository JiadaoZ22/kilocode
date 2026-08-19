// RemoteVersion.resolve: preview/dev builds advertise the base release version
// on the remote wire (protocolVersion / instance version) while preserving the
// full build identity in the additive build/buildVersion fields. Release builds
// (version === base) keep the legacy wire shape byte-identical — no extra field.

import { describe, expect, test } from "bun:test"
import { RemoteVersion } from "../../../src/kilo-sessions/remote-version"
import { InstallationBaseVersion, InstallationVersion } from "@opencode-ai/core/installation/version"

describe("RemoteVersion.resolve", () => {
  test("release build (version === base) sends only the protocol version", () => {
    expect(RemoteVersion.resolve("7.4.22", "7.4.22")).toEqual({ protocol: "7.4.22" })
  })

  test("preview build advertises the base version and preserves the full build identity", () => {
    const preview = "0.0.0-fix-qdrant-check-compatibility-202608181005"
    expect(RemoteVersion.resolve(preview, "7.4.22")).toEqual({ protocol: "7.4.22", build: preview })
  })

  test("unbaked base (dev/test run) falls back to the installation version", () => {
    // KILO_BASE_VERSION is only defined in compiled binaries; here
    // InstallationBaseVersion must fall back to InstallationVersion so the
    // wire shape stays identical to the legacy behavior.
    expect(InstallationBaseVersion).toBe(InstallationVersion)
    expect(RemoteVersion.current).toEqual({ protocol: InstallationVersion })
  })
})
