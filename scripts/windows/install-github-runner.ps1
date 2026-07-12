param(
    [Parameter(Mandatory = $true)]
    [string]$Token,
    [string]$RepositoryUrl = 'https://github.com/alestehlick/AStehlick',
    [string]$InstallDirectory = 'H:\GitHubRunner\AStehlick'
)

$ErrorActionPreference = 'Stop'
$InstallDirectory = [IO.Path]::GetFullPath($InstallDirectory)
if (-not $InstallDirectory.StartsWith('H:\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The runner must be installed on H: to avoid consuming C: drive space.'
}

New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
$configPath = Join-Path $InstallDirectory 'config.cmd'
if (-not (Test-Path -LiteralPath $configPath)) {
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/actions/runner/releases/latest' -Headers @{ 'User-Agent' = 'Moonlight-Reader-Setup' }
    $asset = $release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-.+\.zip$' } | Select-Object -First 1
    if (-not $asset) { throw 'Could not find the current Windows x64 GitHub runner download.' }
    $archive = Join-Path $env:TEMP $asset.name
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $InstallDirectory -Force
    Remove-Item -LiteralPath $archive -Force
}

if (-not (Test-Path -LiteralPath (Join-Path $InstallDirectory '.runner'))) {
    Push-Location $InstallDirectory
    try {
        & .\config.cmd --unattended --url $RepositoryUrl --token $Token --name "Moonlight-$env:COMPUTERNAME" --labels aivis --work _work
        if ($LASTEXITCODE -ne 0) { throw 'GitHub runner registration failed.' }
    } finally {
        Pop-Location
    }
}

$launcher = Join-Path $InstallDirectory 'start-moonlight-runner.ps1'
@"
`$runner = Start-Process -FilePath '$InstallDirectory\run.cmd' -WorkingDirectory '$InstallDirectory' -WindowStyle Hidden -PassThru
`$runner.WaitForExit()
exit `$runner.ExitCode
"@ | Set-Content -LiteralPath $launcher -Encoding UTF8

$taskName = 'Moonlight Reader GitHub Runner'
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
& schtasks.exe /Create /F /SC ONLOGON /TN $taskName /TR $taskCommand | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not create the runner logon task.' }
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $launcher -WindowStyle Hidden
Write-Host "Runner installed in $InstallDirectory and started with label 'aivis'." -ForegroundColor Green
