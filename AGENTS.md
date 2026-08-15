# AGENTS.md

## Cursor Cloud specific instructions

### What this repository is

This is the GitHub **profile README** repository for the user `infektyd` (repo `infektyd/infektyd`). It is **not an application** — there is no source code, no dependency manifest, no test suite, and no build system. The projects described in the README (Minni, AetherKernel, Syntra, etc.) live in *other* repositories linked from here.

The only editable "source" files are:
- `README.md` — the profile content rendered on the GitHub profile page.
- `ha_sigil-light.svg` / `ha_sigil-dark.svg` — hand-authored logo images used by the README `<picture>` block.
- `.github/workflows/metrics.yml` — a scheduled/push GitHub Action that regenerates `github-metrics.svg`.

`github-metrics.svg` is a **generated artifact**, not a source file: it is produced by the `lowlighter/metrics@latest` Action and committed by CI. Do not hand-edit it. It is not embedded in `README.md` (the workflow just keeps it in the repo).

### Preview the README (the "run" step)

The development loop is: edit `README.md`/SVGs → preview → commit. Preview it exactly as GitHub renders it with `grip` (installed into `~/.local/bin` by the update script):

```bash
~/.local/bin/grip README.md 0.0.0.0:6419
```

Then open `http://localhost:6419/`. `grip` re-renders on each page load, so after editing a file just reload the browser. `grip` calls GitHub's public Markdown API, which is rate-limited to **60 requests/hour when unauthenticated** — if renders start returning 403, that's the rate limit, not a bug (set `GRIP_ACCESS_TOKEN` / pass a token to raise it).

### Lint

No linters are configured in-repo. Reasonable local checks:
- Workflow YAML: `~/.local/bin/yamllint -d relaxed .github/workflows/metrics.yml`
- SVG well-formedness: `python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('ha_sigil-light.svg')"` (repeat per SVG).

### Tests / build

There are no automated tests and nothing to build. Don't invent a test/build harness.

### Regenerating `github-metrics.svg` (optional, secret-gated)

This only happens in CI via `.github/workflows/metrics.yml`, which needs the `METRICS_TOKEN` secret (a GitHub PAT). Running the generator locally likewise requires that token to hit the GitHub API with real data. Without it, the committed SVG is the source of truth — leave it as-is.
