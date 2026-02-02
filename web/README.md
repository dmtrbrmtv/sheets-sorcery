# Sheets & Sorcery — Web

Browser version of the Google Sheets + Apps Script game.

## Run

```bash
# From project root
npx serve web -p 3333
# Open http://localhost:3333
```

Or open `web/index.html` directly (ESM may require a local server in some browsers).

## Import map from Excel

```bash
npm run import-map
# Or: node tools/import-map.js path/to/Sheets\ \&\ Sorcery.xlsx
```

Place `Sheets & Sorcery.xlsx` in the project root, then run. The script reads the "🗺 База" sheet and writes `web/world_base.js`.
