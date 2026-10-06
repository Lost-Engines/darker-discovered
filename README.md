# Darker Discovered

A standalone, public-facing companion to the Darker reverse-engineering
investigation: an illustrated article, a 3D city explorer and a model gallery.
Designed for GitHub Pages, including project sites hosted below a repository
path. No backend, account, external fonts, runtime CDN or original game
installation is required.

## Run locally

Node.js 22 or newer (24 is used in CI):

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4175/**. Source/content changes rebuild automatically;
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
checks pull requests; pushes to `main` and manual runs also deploy the result.
In the repository's **Settings → Pages**, choose **GitHub Actions** as the
build source. No domain or repository-name substitution is needed: navigation,
assets and lazy-loaded collections use relative URLs.

The repository is deliberately not connected to a remote by the local setup.
The workflow does not create a repository or enable Pages for you.

Optional links belong in `site.config.json`:

- `analysisUrl`: the separately published full investigation.
- `repositoryUrl`: this site's eventual source repository.

Leave them empty until real destinations exist; the build omits those links.

## Included

- 17 city maps across retail and both supplied demos, loaded one collection
  at a time; orbit, ground-plane pan, zoom, type selection/isolation and gallery
  links.
- Buildings, craft and effects; names/numeric search, original palette shading,
  flat-colour comparison, linked states, gate extension and fountain motion.
- A Markdown investigation with static HTML output, contents navigation,
  original-game evidence, reconstruction screenshots and authored SVG diagrams.
- Responsive layouts, keyboard-focus styles, native labelled controls,
  explicit loading/failure messages and a readable non-JavaScript article.

## Publishing boundary

This is a curated presentation, not the full analysis toolkit or a playable
port. No original executable, pack, save, OBJ export, sound bank or raw resource
is bundled. No UI offers asset downloads. The renderer necessarily receives
**derived geometry, palettes and map layouts**: those browser-visible files
are not a mechanism for concealing or securing game data.

Excluded: save editing, raw hex/disassembly, native test harnesses, executable
patches, resource downloads, audio collections, and the evolving C++ engine.
The full investigation can be released independently.

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

## Fidelity

These are inspection reconstructions. Visibility branches are flattened,
projection and clipping differ from DOS, most dynamic shade tokens use a
fixed inspection value, and original distance fading is omitted. Gate motion
uses the recovered parameter formula in world space; it does not reproduce
all original projected-coordinate rounding. The city view defaults energy
beacons to lit. No modern material lighting or replacement textures are added.
The article distinguishes native checks, observations and hypotheses.

## Attribution

See [RIGHTS.md](RIGHTS.md) for the distinction between the site code, derived
game content and dependencies. No blanket licence is assigned to the original
game content.
