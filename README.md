# Moonlight Reader

Moonlight Reader is a progressive Japanese literary reader designed for GitHub Pages. A page is not transformed automatically: every reading layer is an authored whole-page interpretation, moving from English orientation to the complete Japanese passage.

The first release contains one original demonstration passage inspired by the quiet supernatural tension of _Ugetsu Monogatari_. It does not reproduce a source passage.

## Local development

Requirements: Node.js 22 or later and npm.

```bash
npm install
npm run validate:content
npm test
npm run dev
```

The production build validates all content before Vite writes the site:

```bash
npm run build
```

Other useful checks:

```bash
npm run lint
npm run format:check
npm run check:links
```

## Content model

Runtime loading begins with `public/content/library.json`. Every book, page, layer, notes file, and commentary file is reached through an explicit manifest path. The app never discovers content by inspecting folders.

To add another page to `ugetsu`:

1. Create `public/content/books/ugetsu/pages/NNN/page.json`.
2. Define that page’s own layer sequence in `page.json`, then add the authored layer files under its `layers/` directory. Each layer may introduce **at most three new Japanese vocabulary or grammar items**; content validation enforces this limit.
3. Add `notes.json` and `commentary.md` beside the page file.
4. Add the page to `public/content/books/ugetsu/manifest.json`, or run `npm run build:manifest -- ugetsu`.
5. Run `npm run validate:content` and `npm test`.

All referenced annotation IDs must exist in the page's `notes.json`. Schemas live in `schemas/`, and the validation script also checks duplicate IDs, file links, page/book consistency, unsupported blocks, and unsafe commentary HTML.

## Navigation and progress

- Library route: `#/library`
- Reader route: `#/book/ugetsu/page/001/layer/01`
- Left / Right: previous or next layer
- Shift + Left / Right: previous or next page
- Escape: close notes
- Enter / Space on an annotation: open its note

Progress is local to the device and stored under `moonlight-reader.progress.v1`. It remembers the last location, the highest layer reached for each page, and whether the final layer has been reached. The reader includes a reset action and tolerates unavailable or malformed browser storage.

Kanji shown as a note term link directly to the matching entry at the companion Shirakawa Dictionary site. Kana and punctuation remain plain text.

## Narration

Japanese phrases and sentences use explicit `audioSegments` ranges in each layer file. Segment boundaries are authored rather than guessed, and content validation rejects overlaps, invalid ranges, duplicate IDs, and segments longer than one sentence.

Narration is generated for free by the local AivisSpeech engine with the **阿井田 茂 / Calm** voice: a mature baritone chosen for the passage's restrained supernatural atmosphere. Generated MP3 files are stored under `public/assets/audio/{book}/{page}/layer-NN/`. The audio manifest hashes the text, local speaker, style, pacing settings, and output format so unchanged segments are not synthesized again.

Automatic narration runs on a private Windows self-hosted GitHub runner labelled `aivis`. The runner starts the local engine when necessary, imports the existing model from `H:\Aivis\AivisModels\Aida_Shigeru_BaritoneMiddleMale.aivmx` if it is not installed, synthesizes changed segments, converts WAV output to 128 kbps MP3 with FFmpeg, caches the narration, and deploys the complete site directly to GitHub Pages. It does not require Git or a paid cloud service on the narration computer.

One-time runner setup:

1. Install AivisSpeech and FFmpeg on the Windows narration computer.
2. In the repository, open **Settings > Actions > Runners**, choose **New self-hosted runner**, and copy the temporary registration token.
3. Open PowerShell in the repository and run `./scripts/windows/install-github-runner.ps1 -Token "TOKEN"`.
4. Keep the Windows user signed in. The installer creates a hidden logon task that keeps the runner available while that user is logged in.

No cloud API key, paid speech service, or GitHub secret is used.

For a local generation run, start AivisSpeech and run:

```bash
npm run generate:audio
```

The engine, speaker UUID/name, style, style ID, and FFmpeg executable can be overridden with `AIVIS_ENGINE_URL`, `AIVIS_SPEAKER_UUID`, `AIVIS_SPEAKER_NAME`, `AIVIS_STYLE_NAME`, `AIVIS_STYLE_ID`, and `FFMPEG_PATH`. Run `npm run check:audio` to verify engine and voice discovery without generating files. The Windows runner starts AivisSpeech with GPU acceleration; the packaged Windows engine uses its supported Windows GPU backend (normally DirectML).

## GitHub Pages

The workflow at `.github/workflows/narration.yml` validates, tests, generates or restores narration, builds, and deploys on pushes to `main` or `master`. The Vite base path is derived from `GITHUB_REPOSITORY`, so project Pages URLs such as `/AStehlick/` work without a hard-coded repository name. A root user-site repository ending in `.github.io` builds with `/` instead.

In the repository settings, open **Pages** and set **Source** to **GitHub Actions**. The next successful deployment will publish the `dist` artifact.

## Visual assets

The supplied moonlit residence artwork is stored at `public/assets/backgrounds/heian-night.webp` and rendered as a fixed, full-bleed background. Its opacity remains controlled by `--background-image-opacity` in `src/styles/tokens.css` so reading contrast can be tuned without editing the image.
