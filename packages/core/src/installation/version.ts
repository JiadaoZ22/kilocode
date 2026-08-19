declare global {
  const KILO_VERSION: string
  const KILO_DISPLAY_VERSION: string
  const KILO_CHANNEL: string
  const KILO_BUILD_KIND: string // kilocode_change
  const KILO_BASE_VERSION: string // kilocode_change - release version baked from package.json, for wire compatibility
}

export const InstallationVersion = typeof KILO_VERSION === "string" ? KILO_VERSION : "local"
export const InstallationDisplayVersion =
  typeof KILO_DISPLAY_VERSION === "string" ? KILO_DISPLAY_VERSION : InstallationVersion
export const InstallationChannel = typeof KILO_CHANNEL === "string" ? KILO_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// kilocode_change start - distinguish release builds from source / local builds
export const InstallationBuildKind: "source" | "release" =
  typeof KILO_BUILD_KIND === "string" && KILO_BUILD_KIND === "release" ? "release" : "source"
// kilocode_change end
// kilocode_change start - base release version for remote-wire compatibility.
// Preview/dev builds carry InstallationVersion like `0.0.0-<channel>-<date>`,
// which the session relay / mobile app can treat as an unknown CLI when gating
// session attach. InstallationBaseVersion stays a plain release version so
// version-based checks keep working; the full build identity is sent alongside
// in additive fields (see kilo-sessions/remote-version.ts).
export const InstallationBaseVersion =
  typeof KILO_BASE_VERSION === "string" && KILO_BASE_VERSION.length > 0 ? KILO_BASE_VERSION : InstallationVersion
// kilocode_change end
