/**
 * HotspotGlobe3D — Real 3D spinning globe (react-globe.gl + Three.js)
 * Shows Karnataka crime hotspots as points on a real Earth globe.
 * Clicking a FIR pin calls onSwitchTo2D to open it in the 2D Leaflet map.
 */
import { useRef, useEffect, useMemo, useState, useCallback, Component } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'

const EARTH_IMG  = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
const STARFIELD  = 'https://unpkg.com/three-globe/example/img/night-sky.png'

/* ── helpers ── */
function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}
function rng(seed, i) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}
function tierColor(tier, emerging) {
  if (emerging)          return '#ff3366'
  if (tier === 'RED')    return '#ef4444'
  if (tier === 'ORANGE') return '#fb923c'
  if (tier === 'YELLOW') return '#fde047'
  if (tier === 'GREEN')  return '#4ade80'
  return '#00e5ff'
}

/* ── Error boundary ── */
class GlobeErr extends Component {
  state = { err: null }
  static getDerivedStateFromError(e) { return { err: e?.message || 'Globe error' } }
  render() {
    if (this.state.err) return (
      <div style={{ flex:1, height:'100%', background:'#020912', display:'flex',
                    flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:12, fontFamily:'Inter,sans-serif' }}>
        <div style={{ fontSize:32 }}>🌐</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Globe failed to load</div>
        <div style={{ fontSize:11, color:'#475569', maxWidth:300, textAlign:'center' }}>{this.state.err}</div>
        <button onClick={() => this.setState({ err:null })}
          style={{ marginTop:8, padding:'6px 16px', background:'rgba(0,229,255,0.12)',
                   border:'1px solid rgba(0,229,255,0.28)', borderRadius:6,
                   color:'#00e5ff', fontSize:12, cursor:'pointer' }}>Retry</button>
      </div>
    )
    return this.props.children
  }
}

/* ── build point cloud ── */
function buildPoints(heatLayer, pinLayer) {
  const pts = []
  heatLayer.forEach(cell => {
    const col = tierColor(cell.riskTier, cell.emerging)
    // anchor
    pts.push({
      ...cell, pointType:'cell', pointId: cell.cellId,
      lat: cell.lat, lng: cell.lng,
      size: 0.08 + Math.min(cell.weight||0.3,1)*0.10,
      alt:  0.004 + Math.min(cell.weight||0.2,1)*0.014 + (cell.emerging?0.012:0),
      color: col
    })
    // small cloud
    const seed = hashSeed(cell.cellId||`${cell.lat}${cell.lng}`)
    const n = Math.floor(6 + (cell.weight||0.3)*14 + (cell.emerging?10:0))
    for (let i=0; i<n; i++) {
      const r=rng(seed,i), r2=rng(seed,i+1000), r3=rng(seed,i+2000)
      const sp = cell.emerging?0.09:0.06
      pts.push({
        pointType:'cloud',
        lat: cell.lat+(r-0.5)*sp, lng: cell.lng+(r2-0.5)*sp,
        size: 0.010+r3*0.020, alt: 0.001+r*0.008,
        color: cell.emerging
          ? `rgba(255,${Math.floor(40+r*80)},${Math.floor(80+r2*70)},${0.4+r3*0.4})`
          : cell.riskTier==='RED'
            ? `rgba(239,${Math.floor(40+r*60)},68,${0.3+r3*0.4})`
            : `rgba(251,${Math.floor(140+r*70)},36,${0.2+r3*0.35})`
      })
    }
  })
  pinLayer.slice(0,200).forEach(pin => {
    pts.push({
      ...pin, pointType:'pin', pointId:pin.firUid,
      lat:pin.lat, lng:pin.lng,
      size:0.05, alt:0.003,
      color:'rgba(56,189,248,0.90)'
    })
  })
  return pts
}

/* ── build arcs ── */
function buildArcs(heatLayer) {
  const emerging = heatLayer.filter(c=>c.emerging).slice(0,10)
  const reds     = heatLayer.filter(c=>c.riskTier==='RED').slice(0,8)
  const arcs = []
  emerging.forEach(e => {
    const t = reds.find(r=>r.district===e.district)||reds[0]
    if (t && t.cellId!==e.cellId)
      arcs.push({ startLat:e.lat,startLng:e.lng,endLat:t.lat,endLng:t.lng,
                  color:['rgba(147,51,234,0.05)','rgba(255,51,102,0.90)'] })
  })
  for (let i=0; i<Math.min(reds.length-1,6); i++)
    arcs.push({ startLat:reds[i].lat,startLng:reds[i].lng,endLat:reds[i+1].lat,endLng:reds[i+1].lng,
                color:['rgba(56,189,248,0.06)','rgba(0,119,255,0.88)'] })
  return arcs
}

/* ── rings ── */
function buildRings(heatLayer, districtFilter) {
  const rings = heatLayer
    .filter(c=>c.emerging||c.riskTier==='RED')
    .map(c=>({
      lat:c.lat,lng:c.lng,
      maxR:c.emerging?2.0:1.2,
      propagationSpeed:c.emerging?2.5:1.6,
      repeatPeriod:c.emerging?800:1100,
      color:c.emerging?'#ff3366':'#ef4444',
      isAOI:false
    }))
  if (districtFilter && districtFilter!=='ALL') {
    const cells = heatLayer.filter(c=>c.district===districtFilter)
    if (cells.length) {
      const lat=cells.reduce((s,c)=>s+c.lat,0)/cells.length
      const lng=cells.reduce((s,c)=>s+c.lng,0)/cells.length
      rings.unshift({lat,lng,maxR:4,propagationSpeed:0.5,repeatPeriod:2000,color:'#9333ea',isAOI:true})
    }
  }
  return rings
}

/* ── Build station points (3D) ── */
function buildStationPoints(stations, originUnitId, dispatchDest) {
  const out = []
  if (!stations) return out
  stations.forEach(s => {
    const isOrigin = originUnitId != null && Number(s.unitId) === Number(originUnitId)
    const color = isOrigin
      ? 'rgba(34,197,94,0.95)'
      : (dispatchDest ? 'rgba(56,189,248,0.85)' : 'rgba(125,211,252,0.70)')
    out.push({
      ...s,
      pointType:'station', pointId:`st-${s.unitId}`,
      lat: s.lat, lng: s.lng,
      size: isOrigin ? 0.18 : 0.12,
      alt: isOrigin ? 0.030 : 0.018,
      color,
      isOrigin
    })
  })
  return out
}

/* ── Main Globe component ── */
function GlobeInner({ heatLayer=[], pinLayer=[], flyTarget, onPointSelect, onSwitchTo2D,
                     districtFilter='ALL', stations=[], dispatchDest=null, dispatchOriginUnitId=null,
                     onStationClick, onCrimePointClick }) {
  const globeRef     = useRef()
  const containerRef = useRef()
  const [dims, setDims]   = useState({ w:900, h:700 })
  const [tick, setTick]   = useState(0)

  const points = useMemo(() => [
    ...buildPoints(heatLayer, pinLayer),
    ...buildStationPoints(stations, dispatchOriginUnitId, dispatchDest)
  ], [heatLayer, pinLayer, stations, dispatchOriginUnitId, dispatchDest])

  const arcs   = useMemo(() => buildArcs(heatLayer),            [heatLayer])
  const rings  = useMemo(() => buildRings(heatLayer, districtFilter), [heatLayer, districtFilter])

  const labels = useMemo(() => [
    ...heatLayer.filter(c=>c.riskTier==='RED'||c.emerging).slice(0,18).map(c=>({
      lat:c.lat, lng:c.lng,
      text: c.policeStation||c.district||'',
      color:'rgba(226,232,240,0.90)', size:0.32, alt:0.014
    })),
    ...(stations || []).slice(0, 24).map(s => ({
      lat:s.lat, lng:s.lng,
      text: `👮 ${s.name.split(' Police')[0]}`,
      color: s.unitId === dispatchOriginUnitId ? 'rgba(34,197,94,0.90)' : 'rgba(125,211,252,0.82)',
      size: 0.26, alt: 0.040
    }))
  ], [heatLayer, stations, dispatchOriginUnitId])

  /* resize observer */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width>0 && height>0) setDims({ w:width, h:height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* live HUD tick */
  useEffect(() => {
    const id = setInterval(() => setTick(t=>(t+1)%100), 2000)
    return () => clearInterval(id)
  }, [])

  /* globe init — delayed 400ms so Three.js scene is ready */
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const g = globeRef.current
        if (!g) return
        const ctrl = g.controls()
        if (ctrl) {
          ctrl.autoRotate      = true
          ctrl.autoRotateSpeed = 0.20
          ctrl.enableZoom      = true
          ctrl.minDistance     = 110
          ctrl.maxDistance     = 500
          ctrl.enablePan       = false
        }
        g.pointOfView({ lat:15.5, lng:76.0, altitude:1.6 }, 0)
        try {
          const mat = g.globeMaterial()
          if (mat) {
            mat.bumpScale         = 15
            mat.specular          = new THREE.Color('#1e3a5f')
            mat.shininess         = 10
            mat.emissive          = new THREE.Color('#0c1929')
            mat.emissiveIntensity = 0.4
          }
        } catch(_) {}
      } catch(err) {
        console.warn('[Globe] init error:', err)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  /* fly to target */
  useEffect(() => {
    if (!flyTarget || !globeRef.current) return
    globeRef.current.pointOfView(
      { lat:flyTarget.lat, lng:flyTarget.lng, altitude: flyTarget.altitude ?? 0.40 },
      1400
    )
  }, [flyTarget])

  const handlePointClick = useCallback(pt => {
    if (pt?.pointType==='cloud') return
    if (pt?.pointType==='station') {
      onStationClick?.(pt)
      onPointSelect?.(pt)
    } else if (pt?.pointType==='pin') {
      onCrimePointClick?.(pt)
      onPointSelect?.(pt)
      onSwitchTo2D?.(pt)
    } else {
      onCrimePointClick?.(pt)
      onPointSelect?.(pt)
    }
    if (globeRef.current && pt?.lat!=null)
      globeRef.current.pointOfView({ lat:pt.lat, lng:pt.lng, altitude:0.28 }, 1000)
  }, [onPointSelect, onSwitchTo2D, onStationClick, onCrimePointClick])

  const redCount      = heatLayer.filter(c=>c.riskTier==='RED').length
  const emergingCount = heatLayer.filter(c=>c.emerging).length
  const stationCount  = (stations || []).length

  return (
    <div ref={containerRef} style={{ flex:1, height:'100%', background:'#020912', position:'relative', overflow:'hidden' }}>

      {/* deep-space glow */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
        background:[
          'radial-gradient(ellipse 80% 70% at 62% 42%, rgba(0,60,140,0.10) 0%, transparent 58%)',
          'radial-gradient(ellipse 45% 45% at 22% 68%, rgba(100,30,180,0.07) 0%, transparent 52%)'
        ].join(',') }} />

      <Globe
        ref={globeRef}
        width={dims.w} height={dims.h}
        globeImageUrl={EARTH_IMG}
        bumpImageUrl={EARTH_BUMP}
        backgroundImageUrl={STARFIELD}
        backgroundColor="rgba(2,9,18,1)"
        showAtmosphere atmosphereColor="#3b7fd4" atmosphereAltitude={0.22}
        showGraticules graticuleColor="rgba(100,149,237,0.04)"
        /* points */
        pointsData={points}
        pointLat="lat" pointLng="lng" pointAltitude="alt"
        pointRadius="size" pointColor="color"
        pointsMerge={false} pointsTransitionDuration={500}
        pointLabel={d => {
          if (d.pointType==='cloud') return null
          if (d.pointType==='station')
            return `<div style="background:rgba(4,18,38,0.96);border:1px solid ${d.isOrigin?'rgba(34,197,94,0.55)':'rgba(56,189,248,0.55)'};padding:10px 13px;border-radius:9px;font-family:Inter,sans-serif;font-size:11px;color:#e2e8f0;max-width:260px;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
              <strong style="color:${d.isOrigin?'#22c55e':'#38bdf8'};font-size:10px;letter-spacing:0.07em">👮 POLICE STATION${d.isOrigin?' · DISPATCH ORIGIN':''}</strong><br/>
              <span style="font-size:13px;font-weight:700;color:#f1f5f9">${d.name||''}</span><br/>
              <span style="color:#94a3b8">${d.district||''} · UnitID ${d.unitId||''}</span>${d.isApproximate?'<br/><span style="color:#fbbf24;font-size:9px">📍 Approximate coordinate (verified street address not provided)</span>':''}<br/>
              <span style="color:${d.isOrigin?'#86efac':'#7dd3fc'};font-size:9px">Click → ${d.isOrigin?'already selected as origin':'Set as dispatch origin'}</span>
            </div>`
          if (d.pointType==='cell')
            return `<div style="background:rgba(4,18,38,0.96);border:1px solid rgba(0,229,255,0.45);padding:10px 13px;border-radius:9px;font-family:Inter,sans-serif;font-size:11px;color:#e2e8f0;max-width:240px;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
              <strong style="color:${d.emerging?'#ff3366':'#00e5ff'};font-size:10px;letter-spacing:0.07em">${d.emerging?'⚡ EMERGING':d.riskTier+' ZONE'}</strong><br/>
              <span style="font-size:13px;font-weight:700;color:#f1f5f9">${d.policeStation||''}</span><br/>
              <span style="color:#94a3b8">${d.district||''} · ${d.count7d??'?'} cases (7d)</span><br/>
              <span style="color:#7dd3fc;font-size:9px">Click → select as dispatch target in 2D</span>
            </div>`
          return `<div style="background:rgba(4,18,38,0.93);border:1px solid rgba(56,189,248,0.5);padding:7px 10px;border-radius:6px;font-size:10px;color:#e2e8f0;font-family:monospace">${d.firUid||''}<br/><span style="color:#38bdf8;font-size:9px">Click → open in 2D map + set as dispatch target</span></div>`
        }}
        onPointClick={handlePointClick}
        /* arcs */
        arcsData={arcs}
        arcStartLat="startLat" arcStartLng="startLng"
        arcEndLat="endLat"     arcEndLng="endLng"
        arcColor="color" arcDashLength={0.42} arcDashGap={0.16}
        arcDashAnimateTime={2000} arcStroke={0.50} arcAltitudeAutoScale={0.45}
        /* rings */
        ringsData={rings}
        ringLat="lat" ringLng="lng"
        ringColor={d => t => {
          const a = Math.max(0, 1-t)
          if (d.isAOI) return `rgba(147,51,234,${a*0.65})`
          return d.color==='#ff3366' ? `rgba(255,51,102,${a*0.90})` : `rgba(239,68,68,${a*0.76})`
        }}
        ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod" ringAltitude={0.003}
        /* labels */
        labelsData={labels}
        labelLat="lat" labelLng="lng" labelText="text"
        labelColor="color" labelSize="size" labelAltitude="alt"
        labelDotRadius={0.20} labelResolution={2} labelIncludeDot
      />

      {/* AOI panel */}
      <div style={{
        position:'absolute', top:12, right:12, zIndex:10, width:205,
        background:'rgba(4,14,32,0.93)', border:'1px solid rgba(0,229,255,0.17)',
        borderRadius:9, backdropFilter:'blur(12px)', fontFamily:'Inter,sans-serif', overflow:'hidden'
      }}>
        <div style={{ padding:'9px 12px', borderBottom:'1px solid rgba(0,229,255,0.09)',
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#00e5ff', letterSpacing:'0.10em' }}>AOI</span>
          <span style={{ fontSize:9, color:'#64748b', fontFamily:'monospace' }}>KSP · SCRB</span>
        </div>
        <div style={{ padding:'9px 12px', display:'flex', flexDirection:'column', gap:6 }}>
          {[['Active Zones',heatLayer.length,'#f1f5f9'],['Red Zones',redCount,'#ef4444'],
            ['Emerging',emergingCount,'#ff3366'],['FIR Pins',pinLayer.length,'#38bdf8'],
            ['Police Stations',stationCount,'#22c55e']
          ].map(([l,v,c]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#64748b' }}>{l}</span>
              <span style={{ color:c, fontWeight:700, fontFamily:'monospace' }}>{v}</span>
            </div>
          ))}
        </div>
        {districtFilter!=='ALL' && (
          <div style={{ margin:'0 12px 9px', padding:'5px 9px', background:'rgba(147,51,234,0.13)',
                        border:'1px solid rgba(147,51,234,0.32)', borderRadius:5,
                        fontSize:10, color:'#c084fc', fontWeight:600 }}>
            🔒 AOI: {districtFilter}
          </div>
        )}
        <div style={{ padding:'6px 12px', borderTop:'1px solid rgba(0,229,255,0.06)',
                      display:'flex', alignItems:'center', gap:5, fontSize:9, color:'#475569' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e',
                        boxShadow:tick%2===0?'0 0 7px #22c55e':'none', transition:'box-shadow 0.4s' }} />
          LIVE · react-globe.gl
        </div>
      </div>

      {/* bottom timeline */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:10, height:33,
        background:'rgba(4,14,32,0.95)', borderTop:'1px solid rgba(0,229,255,0.09)',
        display:'flex', alignItems:'center', padding:'0 14px', gap:10,
        fontFamily:'monospace', fontSize:10
      }}>
        <span style={{ color:'#00e5ff', fontWeight:700, letterSpacing:'0.04em', minWidth:145 }}>
          {new Date().toLocaleString('en-IN',{
            day:'2-digit',month:'short',year:'numeric',
            hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
          }).toUpperCase()}
        </span>
        {['◀◀','◀','▶','▶▶'].map((s,i)=>(
          <span key={i} style={{ color:i===2?'#00e5ff':'#475569', fontSize:i===2?10:8 }}>{s}</span>
        ))}
        <span style={{ color:'#475569' }}>1×</span>
        <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.05)', borderRadius:1, position:'relative' }}>
          <div style={{ position:'absolute',inset:0,width:'62%',
                        background:'linear-gradient(90deg,#1e40af,#00e5ff)',borderRadius:1 }} />
          <div style={{ position:'absolute',top:'50%',left:'62%',transform:'translate(-50%,-50%)',
                        width:8,height:8,borderRadius:'50%',background:'#00e5ff',boxShadow:'0 0 6px #00e5ff' }} />
        </div>
        {[['LIVE','#22c55e'],['SCRB','#38bdf8'],['3D','#a78bfa']].map(([l,c])=>(
          <span key={l} style={{ fontSize:8,fontWeight:700,color:c,padding:'1px 5px',
                                 border:`1px solid ${c}44`,borderRadius:3,background:`${c}11` }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

export default function HotspotGlobe3D(props) {
  return (
    <GlobeErr>
      <GlobeInner {...props} />
    </GlobeErr>
  )
}
