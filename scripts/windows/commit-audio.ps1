$ErrorActionPreference = 'Stop'

git add public/assets/audio
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Narration is already current.'
    exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Could not inspect generated narration changes.' }

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Generate Moonlight Reader narration'
if ($LASTEXITCODE -ne 0) { throw 'Could not commit generated narration.' }

git pull --rebase origin $env:GITHUB_REF_NAME
if ($LASTEXITCODE -ne 0) { throw 'Could not rebase generated narration onto the latest branch.' }
git push origin "HEAD:$env:GITHUB_REF_NAME"
if ($LASTEXITCODE -ne 0) { throw 'Could not push generated narration.' }
