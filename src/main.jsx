import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Globe from 'react-globe.gl';
import './styles.css';

const GEO_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,population,area,languages,currencies,flags,maps,cca3,altSpellings';

function normalizeName(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function findCountryFact(geoName, countries) {
  const target = normalizeName(geoName);
  const aliases = {
    [normalizeName('United States of America')]: 'United States',
    [normalizeName('USA')]: 'United States',
    [normalizeName('Russia')]: 'Russian Federation',
    [normalizeName('South Korea')]: 'Korea (Republic of)',
    [normalizeName('North Korea')]: "Korea (Democratic People's Republic of)",
    [normalizeName('Czechia')]: 'Czech Republic',
    [normalizeName('Czech Republic')]: 'Czechia',
    [normalizeName('Ivory Coast')]: "Côte d'Ivoire",
    [normalizeName('Cape Verde')]: 'Cabo Verde',
    [normalizeName('Eswatini')]: 'Eswatini',
    [normalizeName('Turkey')]: 'Türkiye',
    [normalizeName('Laos')]: "Lao People's Democratic Republic",
    [normalizeName('Moldova')]: 'Moldova',
    [normalizeName('Venezuela')]: 'Venezuela',
    [normalizeName('Bolivia')]: 'Bolivia'
  };

  const direct = countries.find((c) => {
    const names = [c.name?.common, c.name?.official, c.cca3, ...(c.altSpellings || [])];
    return names.some((name) => normalizeName(name) === target);
  });
  if (direct) return direct;

  const aliasTarget = aliases[target];
  if (aliasTarget) {
    const alias = normalizeName(aliasTarget);
    return countries.find((c) => [c.name?.common, c.name?.official, ...(c.altSpellings || [])].some((name) => normalizeName(name) === alias));
  }
  return null;
}

function formatNumber(value) {
  return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : '—';
}

function CountryPanel({ country, loading, onClose }) {
  if (!country && !loading) return null;
  const currencies = country?.currencies ? Object.values(country.currencies).map((c) => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ') : '—';
  const languages = country?.languages ? Object.values(country.languages).join(', ') : '—';

  return (
    <aside className="country-panel" aria-live="polite">
      <button className="close" onClick={onClose} aria-label="Close country details">×</button>
      {loading ? (
        <div className="loading"><span className="spinner" />Loading country facts…</div>
      ) : (
        <>
          <div className="country-heading">
            <div className="flag">{country.flag || '🌐'}</div>
            <div><p className="eyebrow">Country selected</p><h2>{country.name?.common}</h2><p className="muted">{country.name?.official}</p></div>
          </div>
          <div className="facts-grid">
            <div><span>Capital</span><strong>{country.capital?.join(', ') || '—'}</strong></div>
            <div><span>Region</span><strong>{[country.region, country.subregion].filter(Boolean).join(' · ') || '—'}</strong></div>
            <div><span>Population</span><strong>{formatNumber(country.population)}</strong></div>
            <div><span>Area</span><strong>{country.area ? `${formatNumber(country.area)} km²` : '—'}</strong></div>
            <div><span>Languages</span><strong>{languages}</strong></div>
            <div><span>Currency</span><strong>{currencies}</strong></div>
          </div>
          {country.maps?.googleMaps && <a className="map-link" href={country.maps.googleMaps} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>}
        </>
      )}
    </aside>
  );
}

function App() {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [countries, setCountries] = useState([]);
  const [countryFacts, setCountryFacts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(GEO_URL).then((r) => { if (!r.ok) throw new Error('World map failed'); return r.json(); }),
      fetch(COUNTRIES_URL).then((r) => { if (!r.ok) throw new Error('Country data failed'); return r.json(); })
    ])
      .then(([geo, facts]) => { setCountries(geo.features || []); setCountryFactsData(facts); })
      .catch((error) => { console.error(error); setDataError(true); });
  }, []);

  const [countryFactsData, setCountryFactsData] = useState([]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    const geoName = selected.properties?.name;
    const fact = findCountryFact(geoName, countryFactsData);
    setCountryFacts(fact || { name: { common: geoName, official: 'Country facts could not be matched' } });
    setLoading(false);
  }, [selected, countryFactsData]);

  const polygons = useMemo(() => countries.map((feature) => ({ ...feature, __id: feature.properties?.name })), [countries]);

  const resetView = () => {
    globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.4 }, 900);
    setSelected(null); setCountryFacts(null);
  };

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">◉</span><div><strong>3D EARTH</strong><small>COUNTRY EXPLORER</small></div></div>
        <button className="reset" onClick={resetView}>↻ Reset view</button>
      </div>
      <section className="hero-copy">
        <p className="eyebrow">Interactive world atlas</p>
        <h1>Explore the world,<br /><em>one country at a time.</em></h1>
        <p className="subtitle">Drag the globe to rotate it freely. Hover over a country, then click to reveal its key facts.</p>
      </section>
      <div className="globe-wrap">
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={polygons}
          polygonAltitude={(d) => d.__id === selected?.properties?.name ? 0.035 : d.__id === hovered?.properties?.name ? 0.018 : 0.006}
          polygonCapColor={(d) => d.__id === selected?.properties?.name ? 'rgba(76, 230, 176, 0.78)' : d.__id === hovered?.properties?.name ? 'rgba(120, 210, 255, 0.55)' : 'rgba(7, 18, 30, 0.08)'}
          polygonSideColor={() => 'rgba(75, 160, 190, 0.22)'}
          polygonStrokeColor={(d) => d.__id === selected?.properties?.name ? '#75f0c0' : 'rgba(120, 190, 220, 0.45)'}
          polygonLabel={(d) => `<div class="globe-label">${d.properties?.name || ''}</div>`}
          onPolygonHover={setHovered}
          onPolygonClick={setSelected}
          polygonsTransitionDuration={250}
          enablePointerInteraction
          animateIn
          showAtmosphere
          atmosphereColor="#5bb9ff"
          atmosphereAltitude={0.16}
          onGlobeReady={() => globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.4 })}
        />
      </div>
      <div className="controls-hint"><span>✦</span> Drag to rotate <i /> Scroll to zoom <i /> Click a country</div>
      <CountryPanel country={countryFacts} loading={loading} onClose={() => { setSelected(null); setCountryFacts(null); }} />
      <div className="status"><span className="pulse" /> {dataError ? 'Country data unavailable' : countries.length ? `${countries.length} countries ready to explore` : 'Loading world map…'}</div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
