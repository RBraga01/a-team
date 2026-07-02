# A Team installer for Windows PowerShell
# Usage:
#   irm https://raw.githubusercontent.com/RBraga01/a-team/main/install.ps1 | iex
#   .\install.ps1 -Destination C:\Projects\my-project

param(
    [string]$Destination = $PWD,
    [switch]$Force
)

$RepoUrl  = if ($env:A_TEAM_REPO_URL) { $env:A_TEAM_REPO_URL } else { "https://github.com/RBraga01/a-team.git" }
$Dirs     = @(".claude", "skills", "hooks", "templates", "scripts")
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "A Team" -ForegroundColor White -NoNewline
Write-Host " — Universal Multi-Agent Infrastructure"
Write-Host "Installing into: $Destination" -ForegroundColor DarkGray
Write-Host ""

# -- Preflight --
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: git is required but not installed." -ForegroundColor Red
    Write-Host "Install from https://git-scm.com/download/win"
    exit 1
}
if (-not (Test-Path $Destination)) {
    Write-Host "Error: destination '$Destination' does not exist." -ForegroundColor Red
    exit 1
}
$Destination = (Resolve-Path -LiteralPath $Destination).Path

# -- Sparse clone into temp dir --
$Tmp = Join-Path $env:TEMP ("a-team-install-" + [System.Guid]::NewGuid().ToString("N").Substring(0,8))
Write-Host "  Fetching required files (sparse checkout)..." -ForegroundColor DarkGray

try {
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    git clone --filter=blob:none --sparse --depth 1 --quiet $RepoUrl $Tmp 2>$null
    $CloneExitCode = $LASTEXITCODE
    $ErrorActionPreference = $PreviousErrorActionPreference
    if ($CloneExitCode -ne 0) { throw "git clone failed with exit code $CloneExitCode" }
    Set-Location $Tmp
    $ErrorActionPreference = "Continue"
    git sparse-checkout set @Dirs
    $SparseCheckoutExitCode = $LASTEXITCODE
    $ErrorActionPreference = $PreviousErrorActionPreference
    if ($SparseCheckoutExitCode -ne 0) { throw "git sparse-checkout failed with exit code $SparseCheckoutExitCode" }
} catch {
    $ErrorActionPreference = $PreviousErrorActionPreference
    Set-Location $Destination
    Write-Host "Error: failed to fetch required files. $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $Tmp) { Remove-Item $Tmp -Recurse -Force }
    exit 1
}

# -- Copy into destination --
Write-Host ""
$Copied = 0; $Skipped = 0

foreach ($dir in $Dirs) {
    $src  = Join-Path $Tmp $dir
    $dest = Join-Path $Destination $dir
    if (Test-Path $src) {
        if ($Force -or -not (Test-Path $dest)) {
            Copy-Item -Path $src -Destination $Destination -Recurse -Force:$Force
            Write-Host "  v $dir/" -ForegroundColor Green
            $Copied++
        } else {
            Write-Host "  -> $dir/ already exists — skipped (use -Force to overwrite)" -ForegroundColor DarkGray
            $Skipped++
        }
    }
}

# INIT.md
$initSrc  = Join-Path $Tmp "INIT_TEMPLATE.md"
$initDest = Join-Path $Destination "INIT.md"
if (-not (Test-Path $initDest)) {
    Copy-Item $initSrc $initDest
    Write-Host "  v INIT.md (from template)" -ForegroundColor Green
    $Copied++
} else {
    Write-Host "  -> INIT.md already exists — skipped" -ForegroundColor DarkGray
    $Skipped++
}

# -- Cleanup --
Set-Location $Destination
Remove-Item $Tmp -Recurse -Force

# -- Smoke check: verify hook scripts are present --
Write-Host ""
$HookScripts = @("scripts/pre_tool_use.py","scripts/watcher.py","scripts/status.py","scripts/metrics.py","scripts/session_export.py")
$MissingCount = 0
foreach ($script in $HookScripts) {
    $scriptPath = Join-Path $Destination $script
    if (-not (Test-Path $scriptPath)) {
        Write-Host "  x $script — not found" -ForegroundColor Red
        $MissingCount++
    }
}
if ($MissingCount -gt 0) {
    Write-Host ""
    Write-Host "  Error: $MissingCount enforcement script(s) missing." -ForegroundColor Red
    Write-Host "  Security gate, watcher, metrics, and status line will be inactive."
    Write-Host "  This is a bug — please report at github.com/RBraga01/a-team/issues"
} else {
    Write-Host "  v All enforcement scripts present" -ForegroundColor Green
}

# -- Done --
Write-Host ""
Write-Host "Done. " -ForegroundColor Green -NoNewline
Write-Host "$Copied item(s) installed, $Skipped skipped."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Edit INIT.md  -- declare your languages, stack, and compliance scope"
Write-Host "  2. Open your project in Claude Code, Codex, Cursor, or OpenCode"
Write-Host "  3. Run /orchestrate init"
Write-Host ""
