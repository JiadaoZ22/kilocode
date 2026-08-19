// kilocode_change - new file
// Wire-version derivation for the remote session relay.
//
// Preview/dev builds carry InstallationVersion like `0.0.0-<channel>-<date>`
// (see Script.version in packages/script). That string is sent on the remote
// wire as the heartbeat protocolVersion and the instance advertisement
// version, where the relay / mobile app uses it for CLI capability detection —
// a `0.0.0-*` build can be treated as an unknown or ancient CLI, so its
// sessions list fine but refuse to open ("not found" on mobile).
//
// The wire therefore advertises the base release version (package.json version
// baked as KILO_BASE_VERSION at build time) and preserves the full build
// identity in additive optional fields (heartbeat `buildVersion`, instance
// advertisement `build`) for diagnostics and cloud-side display. Local
// surfaces (--version, TUI, logs, User-Agent, Session.Info.version) keep the
// full InstallationVersion unchanged.
import { InstallationBaseVersion, InstallationVersion } from "@opencode-ai/core/installation/version"

export namespace RemoteVersion {
  export function resolve(version: string, base: string): { protocol: string; build?: string } {
    if (version === base) return { protocol: base }
    return { protocol: base, build: version }
  }

  export const current = resolve(InstallationVersion, InstallationBaseVersion)
}
