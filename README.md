# Sheets & Sorcery

<p align="center">
  <img src="poster.png" alt="Sheets & Sorcery Movie Poster" width="600">
</p>

Tactical RPG with resource gathering, crafting, and combat. Playable in the browser.

## Quick Start (Browser)

```bash
pnpm install
pnpm dev
# Open http://localhost:3333
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local server |
| `pnpm lint` | Run Biome and knip checks |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm a11y:check:all` | Run WCAG checks against `docs/index.html` |
| `pnpm a11y:serve` | Serve `docs/` for accessibility testing |
| `pnpm a11y:check` | Run Axe WCAG checks against the local server |

## WCAG Testing

We use `@axe-core/cli` to run automated WCAG 2.0 A/AA checks against `docs/index.html`.

Common workflows:
```bash
pnpm lint
```

Or run just accessibility checks:
```bash
pnpm a11y:check:all
```

Notes:
- The `a11y:check:all` task starts a temporary server on `http://localhost:3333` and runs Axe in headless Chrome.
- Automated checks catch only a subset of issues; manual testing is still required.
