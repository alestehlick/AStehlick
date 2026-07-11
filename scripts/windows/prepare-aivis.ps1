$ErrorActionPreference = 'Stop'

$engineUrl = if ($env:AIVIS_ENGINE_URL) { $env:AIVIS_ENGINE_URL.TrimEnd('/') } else { 'http://127.0.0.1:10101' }
$defaultSpeakerName = [string]::Concat([char]0x963F, [char]0x4E95, [char]0x7530, ' ', [char]0x8302)
$speakerName = if ($env:AIVIS_SPEAKER_NAME) { $env:AIVIS_SPEAKER_NAME } else { $defaultSpeakerName }
$modelFile = if ($env:AIVIS_MODEL_FILE) { $env:AIVIS_MODEL_FILE } else { 'H:\Aivis\AivisModels\Aida_Shigeru_BaritoneMiddleMale.aivmx' }

function Test-Engine {
    try {
        Invoke-RestMethod -Uri "$engineUrl/version" -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-Engine)) {
    $roots = @(
        'H:\Aivis\AivisSpeech',
        (Join-Path $env:LOCALAPPDATA 'Programs\AivisSpeech'),
        (Join-Path $env:ProgramFiles 'AivisSpeech')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    $engineExe = $null
    if ($env:AIVIS_ENGINE_EXE -and (Test-Path -LiteralPath $env:AIVIS_ENGINE_EXE)) {
        $engineExe = $env:AIVIS_ENGINE_EXE
    } else {
        $engineExe = $roots | ForEach-Object {
            Get-ChildItem -LiteralPath $_ -Filter run.exe -File -Recurse -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -match 'AivisSpeech-Engine' } |
                Select-Object -First 1 -ExpandProperty FullName
        } | Select-Object -First 1
    }
    if (-not $engineExe) {
        throw 'AivisSpeech Engine is not installed. Install AivisSpeech once, then rerun this job.'
    }
    Start-Process -FilePath $engineExe -ArgumentList '--host', '127.0.0.1', '--port', '10101', '--output_log_utf8' -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 90 -and -not (Test-Engine); $attempt += 1) {
        Start-Sleep -Seconds 1
    }
    if (-not (Test-Engine)) { throw "AivisSpeech Engine did not become ready at $engineUrl." }
}

$speakers = Invoke-RestMethod -Uri "$engineUrl/speakers" -TimeoutSec 10
if (-not ($speakers | Where-Object { $_.name -eq $speakerName })) {
    if (-not (Test-Path -LiteralPath $modelFile)) {
        throw "The $speakerName model is not installed and its AIVMX file was not found at $modelFile."
    }
    & curl.exe --fail --silent --show-error -X POST -F "file=@$modelFile" "$engineUrl/aivm_models/install"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install the Aivis model from $modelFile." }
    $speakers = Invoke-RestMethod -Uri "$engineUrl/speakers" -TimeoutSec 30
    if (-not ($speakers | Where-Object { $_.name -eq $speakerName })) {
        throw "The model was imported, but the $speakerName voice was not exposed by the engine."
    }
}

$selected = $speakers | Where-Object { $_.name -eq $speakerName } | Select-Object -First 1
$styles = ($selected.styles | ForEach-Object { "$($_.name) [$($_.id)]" }) -join ', '
Write-Host "AivisSpeech is ready: $($selected.name); styles: $styles"
