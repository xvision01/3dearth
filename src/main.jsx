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

const aliases = {
  unitedstatesofamerica: ['United States', 'USA'], southkorea: ['South Korea', 'Korea, Republic of'],
  northkorea: ['North Korea', "Korea, Democratic People's Republic of"], czechrepublic: ['Czechia'],
  ivorycoast: ["Côte d'Ivoire", 'Ivory Coast'], capeverde: ['Cabo Verde'], turkey: ['Türkiye', 'Turkey'],
  laos: ['Laos', "Lao People's Democratic Republic"], vietnam: ['Vietnam'], vatican: ['Vatican City'],
  democraticrepublicofthecongo: ['DR Congo', 'Democratic Republic of the Congo'], republicofthecongo: ['Republic of the Congo', 'Congo'],
  swaziland: ['Eswatini'], burma: ['Myanmar'], easttimor: ['Timor-Leste'], macedonia: ['North Macedonia']
};

function normalizeName(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}
function namesOf(country) { return [country?.name?.common, country?.name?.official, country?.cca3, ...(country?.altSpellings || [])].filter(Boolean); }
function findCountryFact(geoName, countries) {
  const target = normalizeName(geoName);
  const exact = countries.find((c) => namesOf(c).some((n) => normalizeName(n) === target));
  if (exact) return exact;
  const alias = countries.find((c) => (aliases[target] || []).some((n) => namesOf(c).some((candidate) => normalizeName(candidate) === normalizeName(n))));
  if (alias) return alias;
  return countries.find((c) => namesOf(c).some((n) => { const candidate = normalizeName(n); return candidate.length > 5 && (target.includes(candidate) || candidate.includes(target)); })) || null;
}
function formatNumber(value) { return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : '—'; }
function centroid(feature) {
  const geometry = feature?.geometry;
  const points = geometry?.type === 'Polygon' ? geometry.coordinates.flat(1) : geometry?.type === 'MultiPolygon' ? geometry.coordinates.flat(2) : [];
  if (!points.length) return null;
  let lng = 0, lat = 0; points.forEach(([x, y]) => { lng += x; lat += y; });
  return { lat: lat / points.length, lng: lng / points.length };
}
function focusCountry(globe, feature, altitude = 1.55) {
  const center = feature?.properties?.center?.length === 2 ? { lng: feature.properties.center[0], lat: feature.properties.center[1] } : centroid(feature);
  if (center) globe?.pointOfView({ ...center, altitude }, 900);
}

function CountryPanel({ country, geoName, loading, error, onClose, onCompare }) {
  if (!country && !loading && !error) return null;
  const currencies = country?.currencies ? Object.entries(country.currencies).map(([code, c]) => `${c.name || code}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ') : '—';
  const languages = country?.languages ? Object.values(country.languages).join(', ') : '—';
  const timezones = country?.timezones?.slice(0, 3).join(', ') || '—';
  return <aside className="country-panel" aria-live="polite">
    <button className="close" onClick={onClose} aria-label="Close country details">×</button>
    {loading ? <div className="loading"><span className="spinner" /><span>Loading country facts…</span></div> : error ? <div className="error-state"><div className="error-icon">!</div><p className="eyebrow">Country selected</p><h2>{geoName}</h2><p>We couldn't load country data right now. Try again in a moment.</p></div> : <>
      <div className="country-heading"><img className="flag-image" src={country.flags?.svg || country.flags?.png || ''} alt="" /><div><p className="eyebrow">Country selected</p><h2>{country.name?.common || geoName}</h2><p className="muted">{country.name?.official || 'Official name unavailable'}</p></div></div>
      <div className="facts-grid">
        <div><span>Capital</span><strong>{country.capital?.join(', ') || 'No capital'}</strong></div><div><span>Region</span><strong>{[country.region, country.subregion].filter(Boolean).join(' · ') || '—'}</strong></div>
        <div><span>Population</span><strong>{formatNumber(country.population)}</strong></div><div><span>Area</span><strong>{country.area ? `${formatNumber(country.area)} km²` : '—'}</strong></div>
        <div><span>Languages</span><strong>{languages}</strong></div><div><span>Currency</span><strong>{currencies}</strong></div>
        <div><span>Country code</span><strong>{country.cca3 || '—'}</strong></div><div><span>Time zones</span><strong>{timezones}</strong></div>
      </div>
      <div className="panel-footer">{country.tld?.[0] && <span>{country.tld[0]}</span>}{country.maps?.googleMaps && <a className="map-link" href={country.maps.googleMaps} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>}</div>
      <button className="compare-button" onClick={() => onCompare(country)}>＋ Add to comparison</button>
    </>}
  </aside>;
}

function ComparisonPanel({ countries, onClose, onRemove }) {
  if (!countries.length) return null;
  return <aside className="comparison-panel"><div className="comparison-header"><div><p className="eyebrow">Side by side</p><h3>Country comparison</h3></div><button className="close small" onClick={onClose}>×</button></div><div className="compare-grid">{countries.map((c) => <div className="compare-country" key={c.cca3 || c.name.common}><button className="remove-country" onClick={() => onRemove(c)}>×</button><img src={c.flags?.svg || c.flags?.png} alt=""/><strong>{c.name?.common}</strong><span>Capital<br/><b>{c.capital?.[0] || '—'}</b></span><span>Population<br/><b>{formatNumber(c.population)}</b></span><span>Area<br/><b>{formatNumber(c.area)} km²</b></span><span>Region<br/><b>{c.region || '—'}</b></span><span>Currency<br/><b>{c.currencies ? Object.keys(c.currencies).join(', ') : '—'}</b></span></div>)}</div></aside>;
}

function App() {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [countries, setCountries] = useState([]); const [factsData, setFactsData] = useState([]); const [facts, setFacts] = useState(null);
  const [selected, setSelected] = useState(null); const [hovered, setHovered] = useState(null); const [loading, setLoading] = useState(false); const [factsError, setFactsError] = useState(false); const [mapError, setMapError] = useState(false);
  const [nightMode, setNightMode] = useState(false); const [search, setSearch] = useState(''); const [searchOpen, setSearchOpen] = useState(false); const [comparison, setComparison] = useState([]); const [comparisonOpen, setComparisonOpen] = useState(false); const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => { const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight }); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  useEffect(() => { fetch(GEO_URL).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => setCountries(d.features || [])).catch(() => setMapError(true)); }, []);
  useEffect(() => {
    const cached = sessionStorage.getItem('3dearth-country-facts');
    if (cached) { try { setFactsData(JSON.parse(cached)); return; } catch { sessionStorage.removeItem('3dearth-country-facts'); } }
    fetch(COUNTRIES_URL).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => { const list = Array.isArray(d) ? d : []; setFactsData(list); sessionStorage.setItem('3dearth-country-facts', JSON.stringify(list)); }).catch(() => setFactsError(true));
  }, []);
  useEffect(() => { const controls = globeRef.current?.controls(); if (controls) { controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.35; controls.enableDamping = true; controls.dampingFactor = 0.08; } }, [autoRotate, size]);
  useEffect(() => {
    if (!selected) return;
    const geoName = selected.properties?.name || 'Unknown country'; setLoading(true); setFacts(null); setFactsError(false);
    const local = findCountryFact(geoName, factsData);
    if (local) { setFacts(local); setLoading(false); return; }
    fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(geoName)}?fields=name,capital,region,subregion,population,area,languages,currencies,flags,maps,cca3,altSpellings,timezones,tld`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => { if (!d?.[0]) throw new Error(); setFacts(d[0]); }).catch(() => setFactsError(true)).finally(() => setLoading(false));
  }, [selected, factsData]);

  const polygons = useMemo(() => countries.map((f) => ({ ...f, __id: f.properties?.name })), [countries]);
  const searchResults = useMemo(() => { const q = normalizeName(search.trim()); if (!q) return []; return factsData.filter((c) => namesOf(c).some((n) => normalizeName(n).includes(q))).slice(0, 7); }, [search, factsData]);
  const selectFeature = (feature) => { setSelected(feature); setSearch(''); setSearchOpen(false); focusCountry(globeRef.current, feature); setAutoRotate(false); };
  const selectSearchResult = (country) => { const polygon = countries.find((f) => findCountryFact(f.properties?.name, [country])); const fallback = countries.find((f) => normalizeName(f.properties?.name) === normalizeName(country.name?.common)); if (polygon || fallback) selectFeature(polygon || fallback); };
  const reset = () => { globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.45 }, 1000); setSelected(null); setFacts(null); setFactsError(false); setSearch(''); setSearchOpen(false); setAutoRotate(true); };
  const addComparison = (country) => { setComparison((prev) => prev.some((c) => c.cca3 === country.cca3) || prev.length >= 2 ? prev : [...prev, country]); setComparisonOpen(true); };
  const removeComparison = (country) => setComparison((prev) => prev.filter((c) => c.cca3 !== country.cca3));

  return <main className="app-shell">
    <div className="topbar"><div className="brand"><span className="brand-mark">◉</span><div><strong>3D EARTH</strong><small>COUNTRY EXPLORER</small></div></div><div className="top-actions">
      <div className="search-box"><span className="search-icon">⌕</span><input value={search} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } if (e.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0]); }} placeholder="Search country…" aria-label="Search country" />{search && <button className="search-clear" onClick={() => { setSearch(''); setSearchOpen(false); }}>×</button>}{searchOpen && search && <div className="search-results">{searchResults.length ? searchResults.map((c) => <button key={c.cca3 || c.name.common} onMouseDown={(e) => e.preventDefault()} onClick={() => selectSearchResult(c)}><img src={c.flags?.svg || c.flags?.png} alt=""/><span>{c.name.common}</span><small>{c.region || ''}</small></button>) : <div className="no-results">No country found</div>}</div>}</div>
      <button className="mode-toggle" onClick={() => setNightMode((v) => !v)}>{nightMode ? '☀ Day' : '☾ Night'}</button><button className={`rotate-toggle ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate((v) => !v)}>◌ {autoRotate ? 'Auto' : 'Paused'}</button><button className="reset" onClick={reset}>↻ Reset</button>
    </div></div>
    <section className="hero-copy"><p className="eyebrow">Interactive world atlas</p><h1>Explore the world,<br/><em>one country at a time.</em></h1><p className="subtitle">Search, hover or click a country. Rotate the globe freely and discover live facts.</p></section>
    <div className="globe-wrap"><Globe ref={globeRef} width={size.width} height={size.height} backgroundColor="rgba(0,0,0,0)" globeImageUrl={nightMode ? EARTH_NIGHT : EARTH_DAY} bumpImageUrl={EARTH_BUMP} backgroundImageUrl={NIGHT_SKY} polygonsData={polygons} polygonAltitude={(d) => d.__id === selected?.properties?.name ? 0.055 : d.__id === hovered?.properties?.name ? 0.025 : 0.004} polygonCapColor={(d) => d.__id === selected?.properties?.name ? 'rgba(72,229,175,.85)' : d.__id === hovered?.properties?.name ? 'rgba(100,205,255,.65)' : 'rgba(7,18,30,.04)'} polygonSideColor={() => 'rgba(70,155,190,.3)'} polygonStrokeColor={(d) => d.__id === selected?.properties?.name ? '#75f0c0' : 'rgba(120,190,220,.55)'} polygonLabel={(d) => `<div class="globe-label">${d.properties?.name || ''}</div>`} onPolygonHover={setHovered} onPolygonClick={selectFeature} polygonsTransitionDuration={350} enablePointerInteraction animateIn showAtmosphere atmosphereColor={nightMode ? '#718cff' : '#59c5ff'} atmosphereAltitude={0.2} onGlobeReady={() => { globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.45 }); }} /></div>
    <div className="controls-hint"><span>✦</span> Drag to rotate <i/> Scroll to zoom <i/> Click a country</div>
    {comparison.length > 0 && <button className="compare-floating" onClick={() => setComparisonOpen(true)}>⚖ Compare <span>{comparison.length}/2</span></button>}
    <CountryPanel country={facts} geoName={selected?.properties?.name} loading={loading} error={factsError} onClose={() => { setSelected(null); setFacts(null); }} onCompare={addComparison}/>
    {comparisonOpen && <ComparisonPanel countries={comparison} onClose={() => setComparisonOpen(false)} onRemove={removeComparison}/>} 
    <div className="status"><span className="pulse"/>{mapError ? 'World map unavailable' : countries.length ? `${countries.length} countries ready` : 'Loading world map…'}</div>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
