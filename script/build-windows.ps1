#!/usr/bin/env pwsh
# Build the Kilo CLI for Windows.
# This mirrors the Unix local-binary build path but uses Bun on Windows.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$opencodeDir = Join-Path $repoRoot "packages" "opencode"

function Test-Bun {
    try {
        $bunVersion = & bun --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Found Bun $bunVersion"
            return $true
        }
    } catch {
        # fall through
    }
    return $false
}

if (-not (Test-Bun)) {
    Write-Error "Bun is not installed or not on PATH. Install Bun for Windows first: https://bun.sh/docs/installation"
}

Write-Host "Installing dependencies..."
& bun install
if ($LASTEXITCODE -ne 0) {
    Write-Error "bun install failed"
}

Write-Host "Building Windows CLI binary..."
& bun run --cwd $opencodeDir script/build.ts --single --skip-install
if ($LASTEXITCODE -ne 0) {
    Write-Error "CLI build failed"
}

$binary = Join-Path $opencodeDir "dist" "@kilocode" "cli-windows-x64" "bin" "kilo.exe"
if (Test-Path $binary) {
    Write-Host "Build succeeded: $binary"
} else {
    Write-Error "Expected binary not found at $binary"
}
