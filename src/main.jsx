import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Globe from 'react-globe.gl';
import './styles.css';

const GEO_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,population,area,languages,currencies,flags,maps,cca3,altSpellings,timezones,tld';
const EARTH_DAY = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
const EARTH_BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const NIGHT_SKY = 'https://unpkg.com/three-globe/example/img/night-sky.png';

function normalizeName(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

const aliases = {
  'unitedstatesofamerica': ['United States', 'USA'], 'southkorea': ['South Korea', 'Korea, Republic of'],
  'northkorea': ['North Korea', "Korea, Democratic People's Republic of"], 'czechrepublic': ['Czechia'],
  'ivorycoast': ["Côte d'Ivoire", 'Ivory Coast'], 'capeverde': ['Cabo Verde'], 'turkey': ['Türkiye', 'Turkey'],
  'laos': ['Laos', "Lao People's Democratic Republic"], 'vietnam': ['Vietnam'], 'vatican': ['Vatican City'],
  'democraticrepublicofthecongo': ['DR Congo', 'Democratic Republic of the Congo'], 'republicofthecongo': ['Republic of the Congo', 'Congo'],
  'swaziland': ['Eswatini'], 'burma': ['Myanmar'], 'easttimor': ['Timor-Leste'], 'brunei': ['Brunei'],
  'palestine': ['Palestine'], 'moldova': ['Moldova'], 'macedonia': ['North Macedonia']
};

function findCountryFact(geoName, countries) {
  const target = normalizeName(geoName);
  const allNames = (country) => [country.name?.common, country.name?.official, country.cca3, ...(country.altSpellings || [])].filter(Boolean);
  const exact = countries.find((country) => allNames(country).some((name) => normalizeName(name) === target));
  if (exact) return exact;
  const aliasMatch = countries.find((country) => (aliases[target] || []).some((name) => allNames(country).some((candidate) => normalizeName(candidate) === normalizeName(name))));
  if (aliasMatch) return aliasMatch;
  return countries.find((country) => allNames(country).some((name) => {
    const candidate = normalizeName(name);
    return candidate.length > 5 && (target.includes(candidate) || candidate.includes(target));
  })) || null;
}

function formatNumber(value) { return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : '—'; }

function CountryPanel({ country, geoName, loading, error, onClose }) {
  if (!country && !loading && !error) return null;
  const currencies = country?.currencies ? Object.entries(country.currencies).map(([code, c]) => `${c.name || code}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ') : '—';
  const languages = country?.languages ? Object.values(country.languages).join(', ') : '—';
  const timezones = country?.timezones?.slice(0, 3).join(', ') || '—';

  return (
    <aside className="country-panel" aria-live="polite">
      <button className="close" onClick={onClose} aria-label="Close country details">×</button>
      {loading ? (
        <div className="loading"><span className="spinner" /><span>Loading country facts…</span></div>
      ) : error ? (
        <div className="error-state"><div className="error-icon">!</div><p className="eyebrow">Country selected</p><h2>{geoName}</h2><p>We couldn't load the live country data right now. Please try selecting the country again.</p></div>
      ) : (
        <>
          <div className="country-heading">
            <img className="flag-image" src={country.flags?.svg || country.flags?.png || ''} alt="" />
            <div><p className="eyebrow">Country selected</p><h2>{country.name?.common || geoName}</h2><p className="muted">{country.name?.official || 'Official name unavailable'}</p></div>
          </div>
          <div className="facts-grid">
            <div><span>Capital</span><strong>{country.capital?.join(', ') || 'No capital'}</strong></div>
            <div><span>Region</span><strong>{[country.region, country.subregion].filter(Boolean).join(' · ') || '—'}</strong></div>
            <div><span>Population</span><strong>{formatNumber(country.population)}</strong></div>
            <div><span>Area</span><strong>{country.area ? `${formatNumber(country.area)} km²` : '—'}</strong></div>
            <div><span>Languages</span><strong>{languages}</strong></div>
            <div><span>Currency</span><strong>{currencies}</strong></div>
            <div><span>Country code</span><strong>{country.cca3 || '—'}</strong></div>
            <div><span>Time zones</span><strong>{timezones}</strong></div>
          </div>
          <div className="panel-footer">{country.tld?.[0] && <span>{country.tld[0]}</span>}{country.maps?.googleMaps && <a className="map-link" href={country.maps.googleMaps} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>}</div>
        </>
      )}
    </aside>
  );
}

function App() {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [countries, setCountries] = useState([]);
  const [countryFactsData, setCountryFactsData] = useState([]);
  const [countryFacts, setCountryFacts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [dataError, setDataError] = useState(false);
  const [factsError, setFactsError] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch(GEO_URL).then((r) => { if (!r.ok) throw new Error('World map failed'); return r.json(); })
      .then((data) => setCountries(data.features || [])).catch((error) => { console.error(error); setDataError(true); });
  }, []);

  useEffect(() => {
    const cached = sessionStorage.getItem('3dearth-country-facts');
    if (cached) { try { setCountryFactsData(JSON.parse(cached)); return; } catch { sessionStorage.removeItem('3dearth-country-facts'); } }
    fetch(COUNTRIES_URL).then((r) => { if (!r.ok) throw new Error('Country data failed'); return r.json(); })
      .then((data) => { const list = Array.isArray(data) ? data : []; setCountryFactsData(list); sessionStorage.setItem('3dearth-country-facts', JSON.stringify(list)); })
      .catch((error) => { console.error(error); setFactsError(true); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setFactsError(false); setCountryFacts(null);
    const geoName = selected.properties?.name || 'Unknown country';
    const fact = findCountryFact(geoName, countryFactsData);
    if (fact) { setCountryFacts(fact); setLoading(false); return; }
    fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(geoName)}?fields=name,capital,region,subregion,population,area,languages,currencies,flags,maps,cca3,altSpellings,timezones,tld`)
      .then((r) => { if (!r.ok) throw new Error('Country not found'); return r.json(); })
      .then((data) => { const factFromSearch = Array.isArray(data) ? data[0] : null; if (!factFromSearch) throw new Error('Country not found'); setCountryFacts(factFromSearch); })
      .catch((error) => { console.error(error); setFactsError(true); }).finally(() => setLoading(false));
  }, [selected, countryFactsData]);

  const polygons = useMemo(() => countries.map((feature) => ({ ...feature, __id: feature.properties?.name })), [countries]);
  const focusCountry = (polygon) => setSelected(polygon);
  const resetView = () => { globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.4 }, 900); setSelected(null); setCountryFacts(null); setFactsError(false); };

  const setGlobeMotion = (enabled) => {
    const controls = globeRef.current?.controls();
    if (controls) { controls.autoRotate = enabled; controls.autoRotateSpeed = 0.35; }
  };

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="brand-mark">◉</span><div><strong>3D EARTH</strong><small>COUNTRY EXPLORER</small></div></div>
        <div className="top-actions">
          <button className="mode-toggle" onClick={() => setNightMode((value) => !value)}>{nightMode ? '☀ Day' : '☾ Night'}</button>
          <button className="reset" onClick={resetView}>↻ Reset view</button>
        </div>
      </div>

      <section className="hero-copy"><p className="eyebrow">Interactive world atlas</p><h1>Explore the world,<br /><em>one country at a time.</em></h1><p className="subtitle">Drag the globe to rotate it freely. Hover over a country, then click to reveal reliable live facts.</p></section>

      <div className="globe-wrap">
        <Globe
          ref={globeRef} width={size.width} height={size.height} backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={nightMode ? EARTH_NIGHT : EARTH_DAY} bumpImageUrl={EARTH_BUMP} backgroundImageUrl={NIGHT_SKY}
          polygonsData={polygons}
          polygonAltitude={(d) => d.__id === selected?.properties?.name ? 0.045 : d.__id === hovered?.properties?.name ? 0.022 : 0.004}
          polygonCapColor={(d) => d.__id === selected?.properties?.name ? 'rgba(72, 229, 175, 0.82)' : d.__id === hovered?.properties?.name ? 'rgba(100, 205, 255, 0.62)' : 'rgba(7, 18, 30, 0.03)'}
          polygonSideColor={() => 'rgba(70, 155, 190, 0.28)'}
          polygonStrokeColor={(d) => d.__id === selected?.properties?.name ? '#75f0c0' : 'rgba(120, 190, 220, 0.5)'}
          polygonLabel={(d) => `<div class="globe-label">${d.properties?.name || ''}</div>`}
          onPolygonHover={setHovered} onPolygonClick={focusCountry} polygonsTransitionDuration={250} enablePointerInteraction animateIn
          showAtmosphere atmosphereColor={nightMode ? '#6f8cff' : '#59c5ff'} atmosphereAltitude={0.18}
          onGlobeReady={() => { globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.4 }); setGlobeMotion(true); }}
        />
      </div>

      <div className="controls-hint"><span>✦</span> Drag to rotate <i /> Scroll to zoom <i /> Click a country</div>
      <CountryPanel country={countryFacts} geoName={selected?.properties?.name} loading={loading} error={factsError} onClose={() => { setSelected(null); setCountryFacts(null); setFactsError(false); }} />
      <div className="status"><span className="pulse" /> {dataError ? 'World map failed to load' : countries.length ? `${countries.length} countries ready to explore` : 'Loading world map…'}</div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
