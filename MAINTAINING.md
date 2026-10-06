# Maintaining Darker Discovered

Build, publishing and data-refresh notes for contributors.

## Run locally

Node.js 22 or newer (24 is used in CI):

```sh
npm ci
npm run dev
```

The development server prints its local address. Source/content changes rebuild automatically;
refresh the browser to see them. Alternatively:

```sh
npm run build
npm run check
npm run preview
```

`dist/` is the complete static site. Opening HTML through `file://` is not
supported: the viewers fetch their data through HTTP.

## Publish on GitHub Pages

Make this directory the repository root. The included workflow builds and
checks pull requests; pushes to `master` and manual runs also deploy the result.
In the repository's **Settings → Pages**, choose **GitHub Actions** as the
build source. No domain or repository-name substitution is needed: navigation,
assets and lazy-loaded collections use relative URLs.

Optional links belong in `site.config.json`:

- `analysisUrl`: the separately published full investigation.
- `repositoryUrl`: this site's eventual source repository.

Leave them empty until real destinations exist; the build omits those links.

## Editing and refreshing

- `content/investigation.md`: the article; diagrams/screenshots are in
  `public/images/`.
- `src/`: independent presentation and Three.js viewer code. Palette-index
  shading and the recovered animation formulas are retained; projection,
  rasterization, input and UI are modern.
- `public/data/`: a committed, deterministic display snapshot. Normal builds
  need **only this repository**.
- `content/research-sources.md`: claim-to-evidence guide for maintainers.
- `content/data-provenance.json`: source hashes and snapshot scope.

To deliberately refresh the snapshot from a complete analysis checkout:

```sh
python3 scripts/import-analysis.py /path/to/darker_reverse
```

This optional maintainer operation reads the parent project's extraction
outputs and Python tools. It is not part of the website build or CI. It writes
only this site's display data and provenance file. The source tools' Python
dependencies must already be available. Rerun the build and checks afterwards.

