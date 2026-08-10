# 🌍 3D Earth Explorer

An interactive 3D globe for exploring the world one country at a time. Rotate the Earth, search for a country, fly to it, inspect live facts, and compare countries side by side.

## ✨ Features

- Realistic Earth texture with terrain bump mapping
- Day and Night Earth modes
- Space / night-sky background and atmospheric glow
- Smooth automatic rotation with pause/resume control
- Country borders with hover and selected-state highlighting
- Smooth camera focus when a country is selected
- Country search with flag, region, keyboard Enter/Escape support, and instant selection
- Country fact panel with flag, capital, region, population, area, languages, currency, country code, time zones, TLD, and Google Maps
- Country-name matching and aliases for common GeoJSON naming differences
- Browser-session caching for country facts
- Fallback country-specific API lookup when a GeoJSON name does not match directly
- Side-by-side comparison for up to two countries
- Responsive desktop and mobile layouts
- Reset view control

## 🛠️ Tech stack

- React 19
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

## 🌐 Deployment

The repository includes a GitHub Actions workflow for GitHub Pages. The Vite base path is configured for `/3dearth/`.

## Data sources

Country geometry is loaded from the public world GeoJSON dataset used by the D3 Graph Gallery. Country facts are loaded from REST Countries. The application caches the country list in the browser session and falls back to a country-specific request when a GeoJSON name does not match directly.

## Roadmap

The original core roadmap is now implemented. Future improvements can focus on richer visual effects, additional geography data, performance tuning, accessibility, and optional features such as historical country data.
