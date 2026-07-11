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
2. Add the six authored layer files under that page's `layers/` directory.
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

## GitHub Pages

The workflow at `.github/workflows/deploy.yml` validates, tests, builds, and deploys on pushes to `main` or `master`. The Vite base path is derived from `GITHUB_REPOSITORY`, so project Pages URLs such as `/AStehlick/` work without a hard-coded repository name. A root user-site repository ending in `.github.io` builds with `/` instead.

In the repository settings, open **Pages** and set **Source** to **GitHub Actions**. The next successful deployment will publish the `dist` artifact.

## Visual assets

The initial release intentionally ships without a decorative background image. To add one later, place `heian-night.webp` in `public/assets/backgrounds/`, set `--background-image` to `url('/assets/backgrounds/heian-night.webp')`, and raise `--background-image-opacity` in `src/styles/tokens.css` from `0` after checking text contrast.
