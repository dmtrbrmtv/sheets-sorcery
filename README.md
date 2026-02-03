# Sheets & Sorcery

<p align="center">
  <img src="poster.png" alt="Sheets & Sorcery Movie Poster" width="600">
</p>

Tactical RPG with resource gathering, crafting, and combat. Playable in browser or Google Sheets.

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
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm import-map` | Import map from Excel |

## Google Sheets Version

Requires [clasp](https://github.com/google/clasp) for deployment:

```bash
clasp push
```
