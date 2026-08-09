# 3D Earth Explorer

An interactive 3D globe for exploring countries. Drag to rotate the Earth, scroll to zoom, and click any country to inspect its facts.

## Features

- Interactive 3D Earth with mouse/touch rotation and zoom
- Country borders and hover highlighting
- Click a country to open a fact panel
- Country facts loaded from REST Countries
- Responsive dark UI
- Reset view control
- Built with React, Vite, Three.js, and react-globe.gl

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
npm run preview
```

## Data

Country geometry is loaded from the public world GeoJSON dataset used by the D3 Graph Gallery. Country facts are requested from REST Countries when a country is selected.
