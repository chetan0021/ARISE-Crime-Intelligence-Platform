import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, useMap, Marker, Popup, ZoomControl, LayersControl, Polyline, CircleMarker } from 'react-leaflet'
import { useT } from '../i18n/useT'
import { ShieldCheck, Clock, Loader2, AlertTriangle, Globe2, Map, Filter, Layers, MapPin, Building2, Car, Navigation, Radio, X, CheckCircle2 } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import HotspotGlobe3D from '../components/HotspotGlobe3D'
import HotspotGlobeSidebar from '../components/HotspotGlobeSidebar'
import { useDraggablePanel } from '../hooks/useDraggablePanel'
import { STATION_LOCATIONS, getAllStations, getStationById, haversineKm, STATION_COUNT } from '../data/stationLocations'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery · Snatching',
  'BNS-318(4)': 'Cyber Fraud · OTP',
  'BNS-331(3)': 'Housebreaking · Night',
  'BNS-115': 'Assault',
  'BNS-103': 'Murder',
  'BNS-64': 'Sexual Assault',
  'BNS-308': 'Extortion',
}

// ── LAYER COMPONENTS ──────────────────────────────────────

const HeatmapLayer = ({ heatData }) => {
  const map = useMap()
  useEffect(() => {
    let heatLayer = null
    import('leaflet.heat').then(() => {
      if (!map || !heatData || !heatData.length) return
      const points = heatData.map(cell => [cell.lat, cell.lng, cell.weight])
      heatLayer = L.heatLayer(points, {
        radius: 35, blur: 20, maxZoom: 12, max: 1.0,
        gradient: { 0.0: '#1e3a5f', 0.3: '#fafafa', 0.6: '#fafafa', 0.8: '#ef4444', 1.0: '#dc2626' }
      })
      heatLayer.addTo(map)
    })
    return () => { if (heatLayer && map) map.removeLayer(heatLayer) }
  }, [map, heatData])
  return null
}

const PulsingMarker = ({ lat, lng, riskTier, cellData, t }) => {
  useEffect(() => {
    if (!document.getElementById('arise-radar-pulse')) {
      const style = document.createElement('style')
      style.id = 'arise-radar-pulse'
      style.innerHTML = `
        @keyframes ariseRadarPulse {
          0%   { box-shadow: 0 0 0 0 var(--pulse-color-start); }
          70%  { box-shadow: 0 0 0 12px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  let color = 'var(--amber)'
  if (riskTier === 'RED') color = 'var(--red)'
  else if (riskTier === 'ORANGE') color = '#fb923c'
  else if (riskTier === 'YELLOW') color = '#facc15'
  const html = `<div style="width:20px;height:20px;border-radius:50%;background:${color};opacity:0.9;--pulse-color-start:${color}b3;"></div>`
  const icon = L.divIcon({ html, iconSize: [20, 20], iconAnchor: [10, 10], className: '' })
  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          {cellData.isSpike === true && (
            <div style={{ color:'#ef4444', fontWeight:700, fontSize:'11px', marginBottom:'4px', display:'flex', alignItems:'center', gap:'4px' }}>
              ⚠ {cellData.spikeDescription}
              <span style={{ background:'#ef444422', border:'1px solid #ef444444', padding:'1px 6px', borderRadius:'4px', fontFamily:'monospace' }}>
                ↑ {cellData.spikeMultiplier}×
              </span>
            </div>
          )}
          <strong style={{ color: 'var(--red)', fontSize: '13px' }}>⚠ {t('hm.emerging')}</strong>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#09090b', fontWeight: 600 }}>{cellData.policeStation}</div>
          <div style={{ marginTop: '8px', fontSize: '11px' }}><strong>Dominant:</strong> {cellData.dominantCrime}</div>
          <div style={{ marginTop: '4px', fontSize: '11px' }}>
            <span style={{ color: 'var(--red)' }}>7d count: {cellData.count7d}</span> | 30d avg: {Math.round(cellData.count30d / 4)}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

const ZoomAwarePins = ({ pinsData, onPinClick, onAutoDispatch, nearestLoading, dispatchDest, routeResult }) => {
  if (!pinsData) return null
  const pinIcon = L.divIcon({
    className: 'custom-pin-container',
    html: `<div style="position:relative;width:24px;height:24px;">
      <div class="radar-pin-base" style="position:absolute;bottom:0;left:12px;transform:translate(-50%,50%);"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" style="width:24px;height:24px;position:absolute;top:0;left:0;filter:drop-shadow(0px 4px 6px rgba(0,0,0,0.6));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    </div>`,
    iconSize: [24, 24], iconAnchor: [12, 24]
  })
  return (
    <>
      {pinsData.map(pin => {
        const label = BNS_LABELS[pin.section] ? `${pin.section} · ${BNS_LABELS[pin.section]}` : pin.section
        const isSelected = dispatchDest?.firUid === pin.firUid
        return (
          <Marker key={pin.firUid} position={[pin.lat, pin.lng]} icon={pinIcon}
            eventHandlers={{ click: () => onPinClick?.(pin) }}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <div style={{ color: 'var(--amber)', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{pin.firUid}</div>
                <div style={{ fontSize: '13px', color: '#09090b', fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: '#3f3f46', marginBottom: '8px' }}>{pin.address}</div>
                <div style={{ fontSize: '11px', marginBottom: '2px' }}><strong>Time:</strong> {pin.timeSlot}</div>
                <div style={{ fontSize: '11px', marginBottom: '2px' }}><strong>Date:</strong> {new Date(pin.registeredAt).toLocaleDateString()}</div>
                <div style={{ fontSize: '11px', marginBottom: '4px' }}><strong>Status:</strong> {pin.status}</div>
                {pin.weapon && <div style={{ fontSize: '11px', color: 'var(--red)' }}><strong>Weapon:</strong> {pin.weapon}</div>}
                
                {isSelected && routeResult ? (
                  <div style={{ marginTop: 12, padding: '10px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8 }}>
                    <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase' }}>✅ AI Route Secured</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{routeResult.originStation.name}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: 4 }}>
                      Dist: <strong>{routeResult.distanceKm} km</strong> • Time: <strong>{routeResult.timeMin} min</strong>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => onAutoDispatch?.()} disabled={nearestLoading}
                    style={{
                      marginTop: 12, width: '100%', padding: '8px', borderRadius: 6,
                      background: 'linear-gradient(90deg, #0284c7, #4f46e5)', color: '#fff',
                      border: 'none', cursor: nearestLoading ? 'not-allowed' : 'pointer',
                      fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                    {nearestLoading && isSelected ? (
                      <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing route...</>
                    ) : (
                      <>✨ AI: Find Nearest Station</>
                    )}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

const MapController = ({ flyTarget }) => {
  const map = useMap()
  useEffect(() => {
    if (flyTarget) map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 14, { duration: 1.5 })
  }, [flyTarget, map])
  return null
}

// ── Police Station marker (different visual from crime pins) ────────
const StationMarker = ({ station, isOrigin, onSetOrigin, t }) => {
  const map = useMap()
  useEffect(() => {
    if (!document.getElementById('arise-station-pulse')) {
      const style = document.createElement('style')
      style.id = 'arise-station-pulse'
      style.innerHTML = `
        @keyframes ariseStationPulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,229,255,0.6); }
          70%  { box-shadow: 0 0 0 14px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  const bg = isOrigin ? '#00e5ff' : '#38bdf8'
  const ring = isOrigin ? 'rgba(0,229,255,0.6)' : 'rgba(56,189,248,0.45)'
  const size = isOrigin ? 30 : 24
  const html = `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:${bg};--arise-station-start:${ring};"></div>
    <div style="position:relative;width:${size - 6}px;height:${size - 6}px;border-radius:50%;background:#042f4a;border:2px solid ${bg};display:flex;align-items:center;justify-content:center;color:${bg};font-family:monospace;font-weight:900;font-size:12px;">
      ${isOrigin ? '🚨' : '👮'}
    </div>
  </div>`
  const icon = L.divIcon({ html, iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '' })
  return (
    <Marker position={[station.lat, station.lng]} icon={icon}>
      <Popup>
        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 220 }}>
          <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
            POLICE STATION · UnitID {station.unitId}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fafafa', marginBottom: 2 }}>{station.name}</div>
          <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 10 }}>{station.districtName} District</div>
          {station.isApproximate && (
            <div style={{ fontSize: 10, color: '#facc15', marginBottom: 10 }}>
              ⚠ Coordinates are approximate (public locality data). Not an official KSP GPS pin.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => onSetOrigin?.(station)}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6,
                background: isOrigin ? 'rgba(0,229,255,0.18)' : 'rgba(56,189,248,0.08)',
                border: `1px solid ${isOrigin ? '#00e5ff' : '#38bdf8'}66`,
                color: isOrigin ? '#00e5ff' : '#38bdf8', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                justifyContent: 'center', fontFamily: 'Inter, sans-serif'
              }}>
              {isOrigin ? '✓ Dispatch Origin Set' : 'Set as Dispatch Origin'}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

// ── Layer to render all static station markers + origin highlight ───
const StationLayer = ({ originId, onSetOrigin, t }) => {
  const stations = useMemo(() => getAllStations(), [])
  return (
    <>
      {stations.map(station => (
        <StationMarker
          key={station.unitId}
          station={station}
          isOrigin={originId === station.unitId}
          onSetOrigin={onSetOrigin}
          t={t}
        />
      ))}
    </>
  )
}

// ── OSRM real-road routing layer (not straight line) ────────────────
// Uses public demo router.project-osmirror.org (no API key).
// Limitation: rate-limited public demo — for production, self-host OSRM
// or switch to Mapbox Directions / Google Directions with a real key.
const RoadRouteLayer = ({ originStation, destPoint, destLabel, onRouteResult, onRouteError }) => {
  const map = useMap()
  const routeLayerRef = useRef([])
  useEffect(() => {
    // Clear any previous route
    routeLayerRef.current.forEach(layer => { try { map.removeLayer(layer) } catch (_) {} })
    routeLayerRef.current = []
    onRouteResult?.(null)
    if (!originStation || !destPoint) return
    const origin = `${originStation.lng.toFixed(6)},${originStation.lat.toFixed(6)}`
    const dest = `${destPoint.lng.toFixed(6)},${destPoint.lat.toFixed(6)}`
    const url = `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?geometries=geojson&overview=full&steps=false&annotations=false`
    let cancelled = false
    const ctrl = new AbortController()
    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (!json?.routes || json.routes.length === 0) {
          onRouteError?.('OSRM returned no route')
          return
        }
        const route = json.routes[0]
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        const distKm = Number((route.distance / 1000).toFixed(2))
        const timeMin = Math.max(1, Math.round(route.duration / 60))
        // Line with drop-shadow via dashed highlight underneath
        const shadow = L.polyline(coords, { color: '#0c4a6e', weight: 9, opacity: 0.45, lineJoin: 'round' })
        const line = L.polyline(coords, { color: '#00e5ff', weight: 5, opacity: 0.92, lineJoin: 'round', dashArray: '1 0' })
        shadow.addTo(map)
        line.addTo(map)
        routeLayerRef.current.push(shadow, line)
        // Fit bounds to route
        try {
          const bounds = L.latLngBounds(coords)
          map.fitBounds(bounds.pad(0.35), { padding: [40, 40], maxZoom: 14, animate: true, duration: 1 })
        } catch (_) {}
        onRouteResult?.({ distanceKm: distKm, timeMin, path: coords, originStation, destPoint, destLabel })
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        if (cancelled) return
        onRouteError?.(err.message || 'OSRM request failed')
      })
    return () => {
      cancelled = true
      try { ctrl.abort() } catch (_) {}
      routeLayerRef.current.forEach(layer => { try { map.removeLayer(layer) } catch (_) {} })
      routeLayerRef.current = []
    }
  }, [map, originStation, destPoint, destLabel, onRouteResult, onRouteError])
  return null
}

// ── Destination pin (selected crime point for dispatch) ──────────────
const DestinationMarker = ({ lat, lng, label }) => {
  if (lat == null || lng == null) return null
  const html = `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.15);"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fafafa;box-shadow:0 0 0 3px rgba(239,68,68,0.35);"></div>
  </div>`
  const icon = L.divIcon({ html, iconSize: [28, 28], iconAnchor: [14, 14], className: '' })
  return <Marker position={[lat, lng]} icon={icon}><Popup><div style={{fontFamily:'Inter,sans-serif'}}>🎯 Dispatch target<br/>{label || 'Selected crime point'}</div></Popup></Marker>
}

// ── Small severity-aware simulated-notify modal ──────────────────────
//    NOTE: rendered via Portal to document.body → React reconciliation of modal
//    does NOT trigger sibling re-renders (Leaflet MapContainer tile tearing stopped)
function DispatchNotifyModal({ isOpen, onClose, station, crimePoint, severity, gravityLabel }) {
  if (!isOpen || typeof document === 'undefined') return null
  const isHeinous = severity === 'HEINOUS' || gravityLabel === 'Heinous'
  const accent = isHeinous ? '#ef4444' : '#38bdf8'
  const accentBg = isHeinous ? 'rgba(239,68,68,0.10)' : 'rgba(56,189,248,0.08)'
  return createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.82)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: 20, pointerEvents: 'auto'
      }}
      role="dialog" aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#041224', border: `1px solid ${accent}55`, borderRadius: 14,
          width: 'min(440px, 94vw)', boxShadow: `0 20px 60px ${accent}33`,
          overflow: 'hidden', pointerEvents: 'auto',
          animation: 'dispatchPop 180ms ease-out'
        }}>
        <div style={{
          background: accentBg, padding: '14px 18px', display: 'flex',
          alignItems: 'center', gap: 10, borderBottom: `1px solid ${accent}33`
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: `${accent}22`,
            border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: accent
          }}>
            <Radio size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: accent, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.08em' }}>
              {isHeinous ? '🚨 URGENT DISPATCH' : '📞 STATION NOTIFICATION'}
            </div>
            <div style={{ color: '#fafafa', fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              {station?.name || 'Unknown Station'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 18, padding: 4
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 18px' }}>
          <div style={{
            background: accentBg, border: `1px solid ${accent}33`, borderRadius: 8,
            padding: '12px 14px', marginBottom: 14
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Message routed to station</div>
            <div style={{ color: '#fafafa', fontSize: 13, fontWeight: 600, lineHeight: 1.55 }}>
              {isHeinous
                ? <>{`URGENT dispatch — Heinous gravity case (${crimePoint?.firUid || 'Active incident'}) reported at ${crimePoint?.address || crimePoint?.label || 'selected location'}. Deploy nearest available patrol immediately and confirm containment.`}</>
                : <>{`Routine dispatch — Non-Heinous incident (${crimePoint?.firUid || 'Case ID'}) at ${crimePoint?.address || crimePoint?.label || 'selected location'}. Assign responding officer and log acknowledgement.`}</>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>RECEIVING UNIT</div>
              <div style={{ color: '#fafafa', fontSize: 12, fontWeight: 600 }}>{station?.name}</div>
              <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2 }}>{station?.districtName}</div>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>CASE GRAVITY</div>
              <div style={{ color: accent, fontSize: 12, fontWeight: 700 }}>
                {isHeinous ? '⚠ HEINOUS' : gravityLabel || 'Non-Heinous'}
              </div>
              <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2 }}>{crimePoint?.section || 'BNS-303'}</div>
            </div>
          </div>

          {/* Honest simulated-dispatch disclaimer */}
          <div style={{
            background: 'rgba(250,204,21,0.06)', border: '1px solid #facc1533',
            padding: '10px 12px', borderRadius: 8, marginBottom: 16
          }}>
            <div style={{ color: '#facc15', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> SIMULATED DISPATCH
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.55 }}>
              Dispatch is simulated — no live messaging system is connected yet. This will route through the officer's actual station assignment once account authentication is implemented.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              background: `${accent}18`, border: `1px solid ${accent}66`, color: accent,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center'
            }}>
              <CheckCircle2 size={14} /> Acknowledge (simulated)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Toast component ────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: 'rgba(4,14,32,0.97)',
      border: '1px solid rgba(0,229,255,0.35)', borderRadius: 8,
      padding: '10px 20px', color: '#00e5ff', fontSize: 13, fontWeight: 600,
      fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,229,255,0.15)',
      display: 'flex', alignItems: 'center', gap: 10
    }}>
      <span>🗺</span>
      {message}
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, marginLeft: 4 }}>✕</button>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────

export default function HotspotMap() {
  const t = useT()
  const { lang } = useLang()

  const [data, setData] = useState(null)
  const [aiRecs, setAiRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [aiRecsLoading, setAiRecsLoading] = useState(false)

  const [timeFilter, setTimeFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [districtFilter, setDistrictFilter] = useState('ALL')
  const [flyTarget, setFlyTarget] = useState(null)
  const [viewMode, setViewMode] = useState('3d')
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [toast, setToast] = useState(null)

  // ── Dispatch / Routing / Nearest-station state ────────────────────
  const [dispatchOrigin, setDispatchOrigin] = useState(null) // unitId of selected station
  const [dispatchDest, setDispatchDest] = useState(null)    // { lat, lng, label, firUid, section, address, gravityId, firUid }
  const [routeResult, setRouteResult] = useState(null)      // { distanceKm, timeMin, ... }
  const [routeError, setRouteError] = useState(null)
  const [nearestLoading, setNearestLoading] = useState(false)
  const [nearestResult, setNearestResult] = useState(null)  // { station, distanceKm, timeMin, shortlist }
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyGravity, setNotifyGravity] = useState('Non-Heinous')
  const [showDispatchPanel, setShowDispatchPanel] = useState(true)

  // TODO: source from authenticated user's UnitID once auth exists
  // This is the logged-in officer's assigned station. Placeholder for Governance → Authentication phase.
  const [manualStationSelector, setManualStationSelector] = useState('')  // dropdown for admin override

  // Panel visibility toggles
  const [showRiskZones, setShowRiskZones] = useState(true)
  const [showAiPanel, setShowAiPanel] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showTimeSlider, setShowTimeSlider] = useState(true)
  const [showTierFilter, setShowTierFilter] = useState(false)

  // Draggable panels — arranged to avoid overlap by default:
  //   LEFT COLUMN (data/intelligence):    Risk Zones (top, short) → AI Deploy (bottom-left, stacked)
  //   RIGHT COLUMN (action/dispatch):     Dispatch Console (top-right, full width 320) → Legend (bottom-right, under dispatch)
  //   BOTTOM CENTER:                      Time Slider (under everything, at very bottom of viewport)
  const riskPanel    = useDraggablePanel({ x: 12, y: 72 })
  const aiPanel      = useDraggablePanel({ x: 12, y: window.innerHeight - 340 })
  const legendPanel  = useDraggablePanel({ x: window.innerWidth - 340, y: window.innerHeight - 220 })
  const sliderPanel  = useDraggablePanel({ x: Math.max(12, (window.innerWidth - 620) / 2), y: window.innerHeight - 90 })
  const dispatchPanel = useDraggablePanel({ x: window.innerWidth - 340, y: 72 })

  const appFont = lang === 'kn' ? "'Noto Sans Kannada', sans-serif" : 'Inter, sans-serif'
  const glassStyle = {
    background: 'var(--bg-overlay)', backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-default)', borderRadius: '10px',
    fontFamily: appFont, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
  }
  const dragHandleStyle = {
    cursor: 'grab', padding: '10px 16px',
    borderBottom: '1px solid var(--border-default)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    userSelect: 'none'
  }

  const is3d = viewMode === '3d'

  const fetchHotspots = async (slot = 'ALL') => {
    setLoading(true)
    setError(false)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics'
      const url = `${baseUrl}/api/hotspots?time_slot=${slot}&t=${Date.now()}` // Cache buster!
      console.log('Fetching hotspots from:', url)
      const res = await fetch(url, { cache: 'no-store' }) // No cache!
      console.log('Hotspots response status:', res.status)
      if (!res.ok) throw new Error('Fetch failed')
      const json = await res.json()
      console.log('Hotspots JSON:', json)
      setData(json.data)
    } catch (err) {
      console.error('Error fetching hotspots:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchAiRecs = async (district = 'ALL') => {
    setAiRecsLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics'
      const res = await fetch(`${baseUrl}/api/hotspots/resource-deploy?district=${encodeURIComponent(district)}`)
      if (res.ok) {
        const json = await res.json()
        setAiRecs(json.data.recommendations || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAiRecsLoading(false)
    }
  }

  useEffect(() => { fetchHotspots(timeFilter) }, [timeFilter])
  useEffect(() => { fetchAiRecs(districtFilter) }, [districtFilter])

  const heatLayerFiltered = data?.heatLayer?.filter(cell => {
    if (tierFilter !== 'ALL' && cell.riskTier !== tierFilter) return false
    if (districtFilter !== 'ALL' && cell.district !== districtFilter) return false
    return true
  }) || []

  const pinLayerFiltered = data?.pinLayer?.filter(pin => {
    if (districtFilter !== 'ALL' && pin.district !== districtFilter) return false
    return true
  }) || []

  const availableDistricts = ['ALL', ...Array.from(new Set([
    ...(data?.heatLayer?.map(c => c.district) || []),
    ...(data?.pinLayer?.map(p => p.district) || [])
  ])).filter(Boolean).sort()]

  const handleDistrictChange = (d) => {
    setDistrictFilter(d)
    if (d === 'ALL') {
      setFlyTarget(is3d ? { lat: 15.3173, lng: 75.7139, altitude: 1.55 } : { lat: 15.3173, lng: 75.7139, zoom: 7 })
    } else {
      const cells = data?.heatLayer?.filter(c => c.district === d)
      if (cells && cells.length > 0) {
        const avgLat = cells.reduce((sum, c) => sum + c.lat, 0) / cells.length
        const avgLng = cells.reduce((sum, c) => sum + c.lng, 0) / cells.length
        setFlyTarget(is3d ? { lat: avgLat, lng: avgLng, altitude: 0.45 } : { lat: avgLat, lng: avgLng, zoom: 11 })
      } else {
        const pins = data?.pinLayer?.filter(p => p.district === d)
        if (pins && pins.length > 0) {
          const avgLat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length
          const avgLng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length
          setFlyTarget(is3d ? { lat: avgLat, lng: avgLng, altitude: 0.45 } : { lat: avgLat, lng: avgLng, zoom: 11 })
        }
      }
    }
  }

  const flyToZone = (zone) => {
    setSelectedPoint(zone)
    // Clicking a risk zone also selects it as dispatch destination
    setDestFromCrimePoint({
      lat: zone.lat, lng: zone.lng,
      firUid: zone.cellId || zone.policeStation,
      policeStation: zone.policeStation,
      address: `${zone.policeStation || ''} · ${zone.district || ''}`,
      section: zone.dominantCrime,
      district: zone.district,
      status: `${zone.count7d || 0} cases (7d)`,
      gravityId: zone.riskTier === 'RED' || zone.riskTier === 'ORANGE' ? 1 : 2
    })
    setFlyTarget(is3d ? { lat: zone.lat, lng: zone.lng, altitude: 0.32 } : { lat: zone.lat, lng: zone.lng, zoom: 15 })
  }

  // Called when a FIR pin is clicked in 3D mode — switch to 2D and fly
  const handleSwitchTo2D = (pin) => {
    setViewMode('2d')
    setFlyTarget({ lat: pin.lat, lng: pin.lng, zoom: 16 })
    setToast(`Switched to 2D map · FIR: ${pin.firUid || 'Unknown'}`)
  }

  // Sidebar nav icon toggle handler
  const handleTogglePanel = (panelName) => {
    if (panelName === 'filter')    setShowTierFilter(v => !v)
    if (panelName === 'layers')    setShowRiskZones(v => !v)
    if (panelName === 'mappin')    setShowAiPanel(v => !v)
    if (panelName === 'clock')     setShowTimeSlider(v => !v)
    if (panelName === 'radio')     setShowDispatchPanel(v => !v)
  }

  const topRiskZones = [...heatLayerFiltered].sort((a, b) => b.weight - a.weight).slice(0, 10)

  // ── Dispatch helpers ──────────────────────────────────────────────
  const originStation = useMemo(() =>
    dispatchOrigin ? getStationById(dispatchOrigin) : null
  , [dispatchOrigin])

  const setOriginFromStation = useCallback((station) => {
    if (!station) return
    setDispatchOrigin(station.unitId)
    setManualStationSelector(String(station.unitId))
    setRouteError(null)
    setToast(`Dispatch origin set: ${station.name}`)
  }, [])

  const setDestFromCrimePoint = useCallback((point) => {
    if (!point || (point.lat == null || point.lng == null)) return
    // Decide gravity from point (backend returns gravityId/gravityLabel on pins; if not, default Non-Heinous)
    const gravityLabel = point.gravityLabel || (point.gravityId === 1 ? 'Heinous' : (point.gravityId === 2 ? 'Non-Heinous' : 'Non-Heinous'))
    const label = point.firUid || point.policeStation || point.district || `Lat ${point.lat.toFixed(3)} / Lng ${point.lng.toFixed(3)}`
    const destObj = {
      lat: Number(point.lat),
      lng: Number(point.lng),
      label,
      firUid: point.firUid || '',
      section: point.section || (point.dominantCrime ? String(point.dominantCrime).split(' ')[0] : ''),
      address: point.address || point.policeStation || '',
      gravityId: point.gravityId != null ? Number(point.gravityId) : null,
      gravityLabel,
      status: point.status || ''
    }
    setDispatchDest(destObj)
    setNotifyGravity(gravityLabel)
    setNearestResult(null)
    setRouteError(null)
    // Auto-switch to 2D so routing overlay is visible
    if (viewMode === '3d') {
      setViewMode('2d')
      setTimeout(() => setFlyTarget({ lat: destObj.lat, lng: destObj.lng, zoom: 14 }), 50)
    } else {
      setFlyTarget({ lat: destObj.lat, lng: destObj.lng, zoom: 15 })
    }
    setToast(`Crime point selected for dispatch: ${label}`)
  }, [viewMode])

  // ── Two-step nearest-station (Part 4) ─────────────────────────────
  const findNearestStation = useCallback(async () => {
    if (!dispatchDest) { setToast('Select a crime point first'); return }
    setNearestLoading(true)
    setNearestResult(null)
    setRouteError(null)
    try {
      const all = getAllStations()
      // STEP 1 — haversine shortlist of 5 stations (fast, in-memory, no external calls)
      const withDistance = all.map(s => ({
        station: s,
        straightKm: haversineKm(dispatchDest.lat, dispatchDest.lng, s.lat, s.lng)
      }))
      withDistance.sort((a, b) => a.straightKm - b.straightKm)
      const shortlist = withDistance.slice(0, 5)
      // STEP 2 — OSRM real-road route for each shortlisted station (only 5, not 30)
      const roadPromises = shortlist.map(async (row) => {
        try {
          const s = row.station
          const origin = `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`
          const dest = `${dispatchDest.lng.toFixed(6)},${dispatchDest.lat.toFixed(6)}`
          const url = `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?geometries=geojson&overview=false&steps=false&annotations=false`
          const resp = await fetch(url)
          if (!resp.ok) return { ...row, error: `OSRM HTTP ${resp.status}` }
          const json = await resp.json()
          const route = json?.routes?.[0]
          if (!route) return { ...row, error: 'no route' }
          return {
            ...row,
            roadKm: Number((route.distance / 1000).toFixed(2)),
            roadMin: Math.max(1, Math.round(route.duration / 60))
          }
        } catch (e) {
          return { ...row, error: e.message || 'network error' }
        }
      })
      const resolved = await Promise.all(roadPromises)
      // Pick the one with the shortest road distance (prefer road time)
      const candidates = resolved.filter(r => !r.error && r.roadKm != null)
      let best = null
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.roadMin - b.roadMin)
        best = candidates[0]
      } else {
        // Fallback: straight-line first (OSRM failed all)
        best = shortlist[0]
      }
      const resultObj = {
        station: best.station,
        roadKm: best.roadKm ?? null,
        roadMin: best.roadMin ?? null,
        straightKm: Number(best.straightKm.toFixed(2)),
        shortlist: resolved.map(r => ({
          unitId: r.station.unitId,
          name: r.station.name,
          straightKm: Number(r.straightKm.toFixed(2)),
          roadKm: r.roadKm ?? null,
          roadMin: r.roadMin ?? null,
          error: r.error || null
        }))
      }
      setNearestResult(resultObj)
      // Auto-set as dispatch origin
      setOriginFromStation(resultObj.station)
      setToast(`Nearest station: ${resultObj.station.name}${resultObj.roadMin ? ` · ${resultObj.roadMin} min (${resultObj.roadKm} km)` : ''}`)
    } catch (e) {
      setRouteError(e.message || 'Nearest-station search failed')
    } finally {
      setNearestLoading(false)
    }
  }, [dispatchDest, setOriginFromStation])

  const openNotifyModal = useCallback(() => {
    if (!originStation) { setToast('Select a dispatch origin first'); return }
    if (!dispatchDest) { setToast('Select a crime point first'); return }
    setNotifyOpen(true)
  }, [originStation, dispatchDest])

  // Keep manual station selector in sync if origin changes via popup/find-nearest
  useEffect(() => {
    if (dispatchOrigin && String(manualStationSelector) !== String(dispatchOrigin)) {
      setManualStationSelector(String(dispatchOrigin))
    }
  }, [dispatchOrigin])

  const handleManualStationChange = (val) => {
    setManualStationSelector(val)
    if (val) {
      const st = getStationById(Number(val))
      if (st) setOriginFromStation(st)
    } else {
      setDispatchOrigin(null)
    }
  }

  // Expose pin clicker to child layers (wrap ZoomAwarePins' onPinClick to dispatch-dest too)
  const handlePinClick = useCallback((pin) => {
    setDestFromCrimePoint(pin)
  }, [setDestFromCrimePoint])

  return (
    <>
      <DispatchNotifyModal
        isOpen={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        station={originStation}
        crimePoint={dispatchDest}
        severity={notifyGravity === 'Heinous' ? 'HEINOUS' : 'NONHEINOUS'}
        gravityLabel={notifyGravity}
      />
      <div className="arise-page-enter" style={{
        position: 'relative', height: 'calc(100vh - 56px)',
        display: is3d ? 'flex' : 'block', overflow: 'hidden'
      }}>

      {/* Toast notification */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Palantir-style left control panel (3D only) */}
      {is3d && (
        <HotspotGlobeSidebar
          heatLayer={heatLayerFiltered}
          summary={data?.summary || {}}
          tierFilter={tierFilter}
          setTierFilter={setTierFilter}
          districtFilter={districtFilter}
          onDistrictChange={handleDistrictChange}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          appFont={appFont}
          t={t}
          onTogglePanel={handleTogglePanel}
          activePanels={{ filter: showTierFilter, layers: showRiskZones, mappin: showAiPanel, clock: showTimeSlider }}
        />
      )}

      <div style={{ flex: 1, position: 'relative', height: '100%', minWidth: 0 }}>

        {/* View mode toggle */}
        <div style={{ ...glassStyle, position: 'absolute', top: '20px', left: '12px', zIndex: 1001, padding: '4px', display: 'flex', gap: '2px' }}>
          <button onClick={() => setViewMode('3d')} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: viewMode === '3d' ? 'rgba(0,229,255,0.15)' : 'transparent',
            color: viewMode === '3d' ? 'var(--cyan)' : 'var(--text-muted)',
            fontSize: '11px', fontWeight: 600, fontFamily: appFont
          }}>
            <Globe2 size={14} /> 3D Globe
          </button>
          <button onClick={() => setViewMode('2d')} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: viewMode === '2d' ? 'rgba(0,229,255,0.15)' : 'transparent',
            color: viewMode === '2d' ? 'var(--cyan)' : 'var(--text-muted)',
            fontSize: '11px', fontWeight: 600, fontFamily: appFont
          }}>
            <Map size={14} /> 2D Map
          </button>
        </div>

        {/* 3D mode: compact stats HUD */}
        {is3d && (
          <div style={{ ...glassStyle, position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, padding: '6px 14px', display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>🔴 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.redZones || 0}</span> red</span>
            <span>⚡ <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.emergingClusters || 0}</span> emerging</span>
            <span>📍 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.totalPins || 0}</span> FIRs</span>
            {loading && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan)' }}>
              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> loading
            </span>}
          </div>
        )}

        {/* 1. MAP CONTAINER */}
        {is3d ? (
          loading ? (
            <div style={{ flex: 1, height: '100%', background: '#020912', display: 'flex',
                          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 16, fontFamily: 'Inter, sans-serif' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%',
                            border: '2px solid rgba(0,229,255,0.15)',
                            borderTop: '2px solid #00e5ff',
                            animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: 13, color: '#475569' }}>Loading intelligence layer...</div>
            </div>
          ) : (
            <HotspotGlobe3D
              heatLayer={heatLayerFiltered}
              pinLayer={pinLayerFiltered}
              flyTarget={flyTarget}
              districtFilter={districtFilter}
              onPointSelect={setSelectedPoint}
              onSwitchTo2D={handleSwitchTo2D}
              stations={getAllStations()}
              dispatchDest={dispatchDest}
              dispatchOriginUnitId={dispatchOrigin}
              onStationClick={(st) => { setOriginFromStation(st); setToast(`3D → origin set: ${st.name}`); }}
              onCrimePointClick={(pt) => setDestFromCrimePoint(pt)}
            />
          )
        ) : (
          <MapContainer
            center={[15.3173, 75.7139]}
            zoom={7}
            minZoom={4}
            maxZoom={19}
            zoomControl={false}
            style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-base)', zIndex: 0 }}
          >
            <style>{`
              .leaflet-popup-pane { z-index: 1100 !important; }
              .leaflet-control-container .leaflet-top { z-index: 900 !important; }
              .leaflet-control-container .leaflet-bottom { z-index: 900 !important; }
              .leaflet-control-layers { background: var(--bg-overlay) !important; color: #fafafa !important;
                border: 1px solid var(--border-default) !important; border-radius: 8px !important; }
              .leaflet-control-layers-list label { color: #fafafa !important; }
              @keyframes radarPing {
                0% { transform: scale(0.2); opacity: 1; border-width: 2px; }
                80% { transform: scale(3.5); opacity: 0; border-width: 0px; }
                100% { transform: scale(4); opacity: 0; border-width: 0px; }
              }
              @keyframes dispatchPop {
                0%   { transform: scale(0.90); opacity: 0.20; }
                60%  { transform: scale(1.015); opacity: 0.95; }
                100% { transform: scale(1); opacity: 1; }
              }
              .custom-pin-container { background: transparent; border: none; }
              .radar-pin-base { width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%;
                box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444; }
              .radar-pin-base::after { content: ''; position: absolute; top: -10px; left: -10px;
                right: -10px; bottom: -10px; border: 2px solid #ef4444; border-radius: 50%; }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
            <LayersControl position="bottomleft">
              <LayersControl.BaseLayer checked name="Dark Mode">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO' />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  attribution="&copy; Google Maps" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Light Mode">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO' />
              </LayersControl.BaseLayer>
            </LayersControl>
            <ZoomControl position="bottomright" />
            <MapController flyTarget={flyTarget} />
            {heatLayerFiltered.length > 0 && <HeatmapLayer heatData={heatLayerFiltered} />}
            {heatLayerFiltered.filter(c => c.isSpike === true).map(c => (
              <PulsingMarker key={c.cellId} lat={c.lat} lng={c.lng} riskTier={c.riskTier} cellData={c} t={t} />
            ))}
            {pinLayerFiltered.length > 0 && (
              <ZoomAwarePins 
                pinsData={pinLayerFiltered} 
                onPinClick={handlePinClick} 
                onAutoDispatch={findNearestStation}
                nearestLoading={nearestLoading}
                dispatchDest={dispatchDest}
                routeResult={routeResult}
              />
            )}

            {/* ── New dispatch layers ──────────────────────────────── */}
            <StationLayer originUnitId={dispatchOrigin} onSetOrigin={setOriginFromStation} />
            {originStation && dispatchDest && (
              <RoadRouteLayer
                originStation={originStation}
                destPoint={dispatchDest}
                onRouteResult={setRouteResult}
                onRouteError={setRouteError}
              />
            )}
            {dispatchDest && <DestinationMarker lat={dispatchDest.lat} lng={dispatchDest.lng} label={dispatchDest.label} />}
          </MapContainer>
        )}

        {/* 2D mode top filter bar — placed BELOW the view toggle at top: 68px */}
        {!is3d && (
          <div style={{ ...glassStyle, background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)',
            position: 'absolute', top: '68px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center',
            flexWrap: 'nowrap', width: 'max-content', maxWidth: '95vw', overflowX: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>District:</span>
              <select value={districtFilter} onChange={(e) => handleDistrictChange(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '6px',
                  fontSize: '11px', outline: 'none', cursor: 'pointer', fontFamily: appFont }}>
                {availableDistricts.map(d => (
                  <option key={d} value={d} style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}>
                    {d === 'ALL' ? 'All Districts' : d}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-default)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tier:</span>
              {['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'].map(tier => {
                const isActive = tierFilter === tier
                let color = 'var(--text-muted)'
                if (isActive) {
                  if (tier === 'RED') color = 'var(--red)'
                  else if (tier === 'ORANGE') color = '#fb923c'
                  else if (tier === 'YELLOW') color = '#facc15'
                  else if (tier === 'GREEN') color = 'var(--green)'
                  else color = 'var(--text-primary)'
                }
                return (
                  <button key={tier} onClick={() => setTierFilter(tier)} style={{
                    background: isActive ? 'var(--amber-dim)' : 'transparent',
                    border: `1px solid ${isActive ? `${color}66` : 'var(--border-default)'}`,
                    color, padding: '4px 10px', borderRadius: '12px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: appFont
                  }}>{tier}</button>
                )
              })}
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-default)' }} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span>🔴 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.redZones || 0}</span> {t('hm.redZones')}</span>
              <span>⚡ <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.emergingClusters || 0}</span> {t('hm.emerging')}</span>
              <span>📍 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data?.summary?.totalPins || 0}</span> {t('hm.incidents')}</span>
              <span style={{ color: 'rgba(56,189,248,0.85)' }}>👮 <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{STATION_COUNT}</span> Stations</span>
              {loading && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan)' }}>
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> loading
              </span>}
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-default)' }} />
            <button onClick={() => setShowDispatchPanel(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 8, cursor: 'pointer', fontFamily: appFont,
              background: showDispatchPanel ? 'linear-gradient(90deg, rgba(56,189,248,0.2), rgba(167,139,250,0.2))' : 'transparent',
              border: `1px solid ${showDispatchPanel ? 'rgba(56,189,248,0.55)' : 'var(--border-default)'}`,
              color: showDispatchPanel ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em'
            }}>
              <Radio size={12} /> {showDispatchPanel ? 'Hide Dispatch' : 'Dispatch Console'}
            </button>
          </div>
        )}

        {/* Selected hotspot detail (3D) */}
        {is3d && selectedPoint?.pointType !== 'pin' && selectedPoint?.cellId && (
          <div style={{ ...glassStyle, position: 'absolute', top: '72px', left: '12px', width: '240px', zIndex: 1000, padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>
              {selectedPoint.emerging ? '⚡ EMERGING CLUSTER' : selectedPoint.riskTier}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPoint.policeStation}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{selectedPoint.district}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {selectedPoint.count7d} cases (7d) · {selectedPoint.dominantCrime}
            </div>
          </div>
        )}

        {/* DRAGGABLE: Risk Zones panel */}
        {showRiskZones && (
          <div ref={riskPanel.panelRef} style={{ ...glassStyle, ...riskPanel.style, width: '260px', maxHeight: 'calc(100vh - 420px)', display: 'flex', flexDirection: 'column' }}>
            <div data-drag-handle="true" style={{ ...dragHandleStyle, cursor: 'grab' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>{t('hm.riskZones')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ backgroundColor: 'var(--amber)22', color: 'var(--amber)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600 }}>{topRiskZones.length} {t('hm.active')}</span>
                <button onClick={() => setShowRiskZones(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {topRiskZones.map((zone, idx) => {
                let bg = 'var(--amber)22', color = 'var(--amber)', border = 'var(--amber)44'
                if (zone.riskTier === 'RED') { bg = 'var(--red)22'; color = 'var(--red)'; border = 'var(--red)44' }
                else if (zone.riskTier === 'ORANGE') { bg = '#fb923c22'; color = '#fb923c'; border = 'transparent' }
                else if (zone.riskTier === 'YELLOW') { bg = '#facc1522'; color = '#facc15'; border = 'transparent' }
                else if (zone.riskTier === 'GREEN') { bg = 'var(--green)22'; color = 'var(--green)'; border = 'transparent' }
                return (
                  <div key={zone.cellId} onClick={() => flyToZone(zone)}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    {zone.isSpike === true && (
                      <div style={{ color:'#ef4444', fontWeight:700, fontSize:'11px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'4px' }}>
                        ⚠ {zone.spikeDescription}
                        <span style={{ background:'#ef444422', border:'1px solid #ef444444', padding:'1px 6px', borderRadius:'4px', fontFamily:'monospace' }}>
                          ↑ {zone.spikeMultiplier}×
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, width: '20px' }}>#{idx + 1}</div>
                      <div style={{ flex: 1, padding: '0 8px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {zone.emerging && <span style={{ color: 'var(--amber)', marginRight: '4px' }}>⚡</span>}
                          {zone.policeStation}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{zone.district}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ backgroundColor: bg, border: `1px solid ${border}`, color, fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>
                          {zone.riskTier}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{zone.count7d} cases (7d)</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '10px 16px', fontSize: '10px', color: '#3f3f46', textAlign: 'center' }}>
              {t('hm.zoomHint')}
            </div>
          </div>
        )}

        {/* DRAGGABLE: AI Deployment Recommendations panel */}
        {showAiPanel && (
          <div ref={aiPanel.panelRef} style={{ ...glassStyle, ...aiPanel.style, width: '300px' }}>
            <div data-drag-handle="true" style={{ ...dragHandleStyle, cursor: 'grab' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={14} color="var(--amber)" />
                <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>{t('hm.deployRec')}</span>
                {aiRecsLoading && <Loader2 size={12} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />}
              </div>
              <button onClick={() => setShowAiPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiRecs.slice(0, 3).map((rec, i) => {
                let bColor = 'var(--text-muted)'
                if (rec.priority === 'CRITICAL') bColor = 'var(--red)'
                else if (rec.priority === 'HIGH') bColor = 'var(--amber)'
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${bColor}`, paddingLeft: '12px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '9px', fontWeight: 700, color: bColor, letterSpacing: '0.05em' }}>{rec.priority}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, paddingRight: '40px' }}>{rec.recommendation}</div>
                    <div style={{ color: 'var(--amber)', fontFamily: 'monospace', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>{rec.deployTime}</div>
                  </div>
                )
              })}
              {aiRecs.length === 0 && !aiRecsLoading && (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No recommendations available.</div>
              )}
              {aiRecsLoading && aiRecs.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing threat vectors...
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px 12px', fontSize: '10px', color: '#3f3f46' }}>Powered by AI · Based on last 7 days</div>
          </div>
        )}

        {/* DRAGGABLE: Legend panel */}
        {showLegend && (
          <div ref={legendPanel.panelRef} style={{ ...glassStyle, ...legendPanel.style, minWidth: 160 }}>
            <div data-drag-handle="true" style={{ ...dragHandleStyle, cursor: 'grab' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t('hm.legend')}</span>
              <button onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #1e3a5f, #fafafa, #fafafa, #ef4444, #dc2626)', marginBottom: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Low</span><span>High</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--red)' }} />
                  {t('hm.emerging')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--amber)', transform: 'rotate(45deg)' }} />
                  Night / Midnight
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--cyan)', transform: 'rotate(45deg)' }} />
                  Dawn / Morning
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--violet)', transform: 'rotate(45deg)' }} />
                  Afternoon / Evening
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '12px', paddingTop: '10px', fontSize: '10px', color: '#3f3f46' }}>
                Map auto-clusters by tier
              </div>
            </div>
          </div>
        )}

        {/* DRAGGABLE: Time slider panel */}
        {showTimeSlider && (
          <div ref={sliderPanel.panelRef} style={{ ...glassStyle, ...sliderPanel.style, width: 'min(600px, 80vw)', padding: '0 0 12px' }}>
            <div data-drag-handle="true" style={{ ...dragHandleStyle, cursor: 'grab' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="var(--amber)" />
                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>{t('hm.crimeActivity')}</span>
                {loading && <Loader2 size={12} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: 'var(--amber)', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--amber)22', padding: '2px 8px', borderRadius: '4px' }}>
                  {timeFilter === 'ALL' ? t('hm.allHours') : timeFilter}
                </div>
                <button onClick={() => setShowTimeSlider(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>
            <div style={{ padding: '0 20px 4px', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <input
                type="range" min="0" max="6" step="1"
                value={['ALL', 'DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'MIDNIGHT'].indexOf(timeFilter)}
                onChange={(e) => {
                  const slots = ['ALL', 'DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'MIDNIGHT']
                  setTimeFilter(slots[parseInt(e.target.value, 10)])
                }}
                style={{
                  width: '100%', WebkitAppearance: 'none',
                  background: 'linear-gradient(90deg, #1e3a5f 0%, #1e3a5f 14%, #38bdf8 28%, #a78bfa 56%, #fafafa 70%, #dc2626 84%, #dc2626 100%)',
                  height: '4px', borderRadius: '2px', outline: 'none', marginTop: 8
                }}
              />
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none; appearance: none;
                  width: 16px; height: 16px; border-radius: 50%;
                  background: var(--amber); border: 2px solid var(--bg-overlay); cursor: pointer;
                }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>ALL</span><span>DAWN</span><span>MORN</span><span>AFTN</span><span>EVEN</span><span>NIGHT</span><span>MDNT</span>
              </div>
            </div>
          </div>
        )}

        {/* DRAGGABLE: Dispatch panel */}
        {showDispatchPanel && (
          <div ref={dispatchPanel.panelRef} style={{
            ...glassStyle, ...dispatchPanel.style, width: 320,
            maxHeight: 'calc(100vh - 340px)',
            padding: 0, zIndex: 1003, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            border: `1px solid ${notifyGravity === 'Heinous' ? 'rgba(239,68,68,0.35)' : 'rgba(56,189,248,0.35)'}`,
            boxShadow: `0 8px 40px ${notifyGravity === 'Heinous' ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.18)'}`
          }}>
            <div data-drag-handle="true" style={{
              ...dragHandleStyle, cursor: 'grab',
              background: notifyGravity === 'Heinous' ? 'linear-gradient(90deg, rgba(239,68,68,0.12), transparent)' : 'linear-gradient(90deg, rgba(56,189,248,0.12), transparent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={14} style={{ color: notifyGravity === 'Heinous' ? 'var(--red)' : 'var(--cyan)' }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>DISPATCH CONSOLE</span>
                <span style={{
                  fontSize: '10px', fontFamily: 'monospace',
                  color: notifyGravity === 'Heinous' ? '#fca5a5' : '#7dd3fc',
                  background: notifyGravity === 'Heinous' ? 'rgba(239,68,68,0.12)' : 'rgba(56,189,248,0.12)',
                  padding: '1px 7px', borderRadius: 4, fontWeight: 700
                }}>{STATION_COUNT} STATIONS</span>
              </div>
              <button onClick={() => setShowDispatchPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
              {/* Destination */}
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>🎯 Crime Target</div>
                {dispatchDest ? (
                  <>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.3 }}>{dispatchDest.label || 'Selected point'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                      {dispatchDest.section || ''} {dispatchDest.section && dispatchDest.address ? '· ' : ''}{dispatchDest.address || ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: notifyGravity === 'Heinous' ? 'rgba(239,68,68,0.18)' : 'rgba(56,189,248,0.12)',
                        color: notifyGravity === 'Heinous' ? '#fca5a5' : '#7dd3fc'
                      }}>GRAVITY: {notifyGravity}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        {dispatchDest.lat.toFixed(4)}, {dispatchDest.lng.toFixed(4)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click a crime pin, FIR, or Risk Zone on the map</div>
                )}
              </div>

              {/* Manual station selector (TODO: replace with auth-bound UnitID) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '10px', color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🚓 Dispatch Origin
                  <span style={{ color: '#475569', marginLeft: 5, fontStyle: 'italic' }}>(admin placeholder)</span>
                </label>
                <select
                  value={manualStationSelector}
                  onChange={(e) => handleManualStationChange(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)', padding: '7px 10px', borderRadius: 7,
                    fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: 600
                  }}
                >
                  <option value="" style={{ background: '#0f172a', color: 'var(--text-primary)' }}>— Select a station —</option>
                  {getAllStations().sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                    <option key={s.unitId} value={s.unitId} style={{ background: '#0f172a', color: 'var(--text-primary)' }}>
                      [{s.unitId}] {s.name} · {s.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nearest station finder button */}
              <button onClick={findNearestStation} disabled={nearestLoading || !dispatchDest} style={{
                background: nearestLoading ? 'rgba(56,189,248,0.35)' : 'linear-gradient(90deg, rgba(56,189,248,0.22), rgba(167,139,250,0.22))',
                border: '1px solid rgba(56,189,248,0.45)', color: 'var(--cyan)',
                padding: '9px 12px', borderRadius: 8, cursor: nearestLoading || !dispatchDest ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: dispatchDest ? 1 : 0.45, transition: 'all 0.15s'
              }}>
                {nearestLoading ? (
                  <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Finding nearest (2-step: haversine → OSRM)...</>
                ) : (
                  <><Navigation size={13} /> Find nearest station (by road)</>
                )}
              </button>

              {/* Nearest result */}
              {nearestResult && !nearestLoading && (
                <div style={{
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.28)',
                  borderRadius: 8, padding: '10px 12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#7dd3fc', fontWeight: 700, marginBottom: 2 }}>NEAREST BY ROAD</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{nearestResult.station.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{nearestResult.station.district}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {nearestResult.roadMin != null ? (
                        <>
                          <div style={{ fontSize: '15px', color: 'var(--cyan)', fontWeight: 800 }}>{nearestResult.roadMin} min</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{nearestResult.roadKm} km · {nearestResult.straightKm} km direct</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{nearestResult.straightKm} km direct</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Route summary */}
              {(routeResult || routeError) && (
                <div style={{
                  borderLeft: `3px solid ${routeError ? 'var(--red)' : 'var(--cyan)'}`,
                  paddingLeft: 10, borderRadius: 4
                }}>
                  {routeError ? (
                    <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                      <strong>Routing:</strong> {routeError}
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
                        Public OSRM demo server may be rate-limited — see report for caveats.
                      </div>
                    </div>
                  ) : (
                    routeResult && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {originStation?.name || 'Origin'} → {routeResult.destLabel || 'Target'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Car size={12} color="var(--cyan)" />
                            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                              {routeResult.distanceKm} km
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Navigation size={12} color="var(--cyan)" />
                            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                              {routeResult.timeMin} min
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  )}
                </div>
              )}

              {/* Notify Station button */}
              <button onClick={openNotifyModal} disabled={!originStation || !dispatchDest}
                style={{
                  background: notifyGravity === 'Heinous'
                    ? 'linear-gradient(90deg, rgba(239,68,68,0.28), rgba(251,146,60,0.22))'
                    : 'linear-gradient(90deg, rgba(56,189,248,0.22), rgba(99,102,241,0.22))',
                  border: `1px solid ${notifyGravity === 'Heinous' ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.5)'}`,
                  color: notifyGravity === 'Heinous' ? '#fecaca' : '#bae6fd',
                  padding: '11px 12px', borderRadius: 8,
                  cursor: (!originStation || !dispatchDest) ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: (!originStation || !dispatchDest) ? 0.4 : 1,
                  boxShadow: notifyGravity === 'Heinous' ? '0 0 24px rgba(239,68,68,0.25)' : '0 0 24px rgba(56,189,248,0.2)'
                }}>
                {notifyGravity === 'Heinous' ? '🚨 URGENT: NOTIFY STATION' : '📞 Notify Station'}
              </button>

              <div style={{
                fontSize: '9.5px', color: '#475569', lineHeight: 1.45,
                padding: '7px 9px', borderRadius: 5,
                border: '1px dashed rgba(100,116,139,0.25)',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <strong>Scope / caveats:</strong> Routing uses public OSRM demo (router.project-osrm.org) — not for production, rate-limited.
                Dispatch notifications are <u>UI-simulated</u>; no records persisted, no live messaging connected.
                Station coordinates: approximate ({STATION_COUNT} of 30 seeded Karnataka districts).
                Full statewide ~1,100-station list awaits KSP-provided data.
              </div>
            </div>
          </div>
        )}

        {/* Tier filter quick panel (toggled by Filter icon in sidebar) */}
        {showTierFilter && (
          <div style={{ ...glassStyle, position: 'absolute', top: '72px', left: is3d ? '290px' : '68px', zIndex: 1005, padding: '12px 14px', width: 200 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tier Filter</div>
            {['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'].map(tier => {
              const isActive = tierFilter === tier
              let color = isActive ? 'var(--text-primary)' : 'var(--text-muted)'
              if (isActive && tier === 'RED') color = 'var(--red)'
              else if (isActive && tier === 'ORANGE') color = '#fb923c'
              else if (isActive && tier === 'YELLOW') color = '#facc15'
              else if (isActive && tier === 'GREEN') color = 'var(--green)'
              return (
                <button key={tier} onClick={() => setTierFilter(tier)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4,
                  borderRadius: 6, border: `1px solid ${isActive ? `${color}55` : 'transparent'}`,
                  background: isActive ? `${color}18` : 'transparent',
                  color, fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: 'pointer'
                }}>{tier}</button>
              )
            })}
          </div>
        )}

        {/* Loading overlay */}
        {loading && !is3d && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(9,9,11,0.8)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} color="var(--amber)" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px', fontFamily: appFont }}>{t('hm.loading')}</div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(9,9,11,0.9)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--red)44', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <AlertTriangle size={32} color="var(--red)" />
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '16px', fontFamily: appFont }}>Failed to load geospatial data</div>
              <button onClick={() => fetchHotspots(timeFilter)} style={{ marginTop: '16px', background: 'var(--red)22', border: '1px solid var(--red)44', color: 'var(--red)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: appFont }}>
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
