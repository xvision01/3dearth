# 🌍 3D Earth Explorer

An interactive 3D globe for exploring the world one country at a time. Drag to rotate, scroll to zoom, hover to highlight a country, and click a country to inspect its facts.

## ✨ Features

- Realistic Earth texture with terrain bump mapping
- Day and Night Earth modes
- Space / night-sky background
- Atmospheric glow around the planet
- Gentle automatic globe rotation
- Country borders with hover and selected-state highlighting
- Country fact panel with flag, capital, region, population, area, languages, currency, country code, and time zones
- Google Maps link for selected countries when available
- Country-name matching with aliases for common GeoJSON naming differences
- Session caching for country facts to reduce repeated API requests
- Responsive desktop and mobile UI
- Reset view control

## 🛠️ Tech stack

- React
- Vite
- react-globe.gl
- Three.js
- REST Countries API
- GeoJSON

## 🚀 Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Production build

```bash
npm run build
npm run preview
```

## Data sources

Country geometry is loaded from the public world GeoJSON dataset used by the D3 Graph Gallery. Country facts are loaded from REST Countries. The application caches the country list in the browser session and falls back to a country-specific request when a GeoJSON name does not match directly.

## Roadmap

- Country search
- Smarter camera focus when selecting a country
- More detailed country information
- Country comparison
- Further visual polish and performance improvements
