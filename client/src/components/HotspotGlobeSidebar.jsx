import { Layers, Activity, MapPin, Clock, ChevronRight, Filter, Globe2 } from 'lucide-react'

const TIER_COLORS = {
  RED:    '#ef4444',
  ORANGE: '#fb923c',
  YELLOW: '#facc15',
  GREEN:  '#22c55e',
  ALL:    '#00e5ff'
}

/* ─ Progress bar filter row ─────────────────────────────── */
function FilterBar({ label, count, max, color, active, onClick }) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: active ? 'rgba(0,229,255,0.07)' : 'transparent',
        border: active ? '1px solid rgba(0,229,255,0.22)' : '1px solid transparent',
        borderRadius: 5,
        padding: '5px 8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: active ? '#e2e8f0' : '#7c93b0', fontWeight: active ? 600 : 400 }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{count}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          borderRadius: 2, transition: 'width 0.4s ease'
        }} />
      </div>
    </button>
  )
}

function aggregateCounts(items, key, fallback = 'Unknown') {
  const map = {}
  items.forEach(item => {
    const k = item[key] || fallback
    map[k] = (map[k] || 0) + 1
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

/* ─ Section wrapper ─────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8, paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Icon size={11} color="#3d5a80" />
        <span style={{
          fontSize: 10, color: '#3d5a80', fontWeight: 700,
          letterSpacing: '0.09em', textTransform: 'uppercase'
        }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </div>
    </div>
  )
}

/* ─ Sidebar icon tab ────────────────────────────────────── */
function NavIcon({ Icon, active, onClick, title }) {
  return (
    <div
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, cursor: onClick ? 'pointer' : 'default',
        background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
        color: active ? '#00e5ff' : '#334e68',
        transition: 'background 0.15s, color 0.15s'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.background = 'rgba(0,229,255,0.07)'; e.currentTarget.style.color = '#7aafcc' } }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(0,229,255,0.12)' : 'transparent'; e.currentTarget.style.color = active ? '#00e5ff' : '#334e68' }}
    >
      <Icon size={14} />
    </div>
  )
}

export default function HotspotGlobeSidebar({
  heatLayer = [],
  summary = {},
  tierFilter,
  setTierFilter,
  districtFilter,
  onDistrictChange,
  timeFilter,
  setTimeFilter,
  appFont,
  t,
  onTogglePanel,
  activePanels = {}
}) {
  const tiers = ['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN']
  const tierCounts = tiers.reduce((acc, tier) => {
    acc[tier] = tier === 'ALL'
      ? heatLayer.length
      : heatLayer.filter(c => c.riskTier === tier).length
    return acc
  }, {})
  const maxTier = Math.max(...Object.values(tierCounts), 1)

  const crimeTypes   = aggregateCounts(heatLayer, 'dominantCrime').slice(0, 6)
  const maxCrime     = crimeTypes[0]?.[1] || 1
  const districts    = aggregateCounts(heatLayer, 'district').slice(0, 8)
  const maxDistrict  = districts[0]?.[1] || 1
  const timeSlots    = ['ALL', 'DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'MIDNIGHT']

  return (
    <div style={{
      width: 272,
      minWidth: 272,
      height: '100%',
      // Palantir Gotham exact palette — deep navy
      background: 'linear-gradient(180deg, #07111e 0%, #050d18 60%, #040c16 100%)',
      borderRight: '1px solid rgba(0,229,255,0.10)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: appFont,
      zIndex: 1002,
      overflow: 'hidden',
      boxShadow: '6px 0 28px rgba(0,0,0,0.55)'
    }}>

      {/* ── Icon nav strip (Palantir left-rail) ── */}
      <div style={{
        display: 'flex', gap: 2,
        padding: '8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.28)'
      }}>
        <NavIcon Icon={Filter}  active={activePanels.filter} title="Toggle Tier Filter"      onClick={() => onTogglePanel?.('filter')} />
        <NavIcon Icon={Layers}  active={activePanels.layers} title="Toggle Risk Zones"       onClick={() => onTogglePanel?.('layers')} />
        <NavIcon Icon={Globe2}  active={true} title="Globe view" />
        <NavIcon Icon={MapPin}  active={activePanels.mappin} title="Toggle AI Recommendations" onClick={() => onTogglePanel?.('mappin')} />
        <NavIcon Icon={Clock}   active={activePanels.clock} title="Toggle Time Slider"     onClick={() => onTogglePanel?.('clock')} />
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>

        {/* Header block */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 9, color: '#00e5ff', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5
          }}>
            Geospatial Intelligence
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>
            Crime Hotspot Capabilities
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 1.6 }}>
            <span style={{ color: '#00e5ff', fontWeight: 700, fontFamily: 'monospace' }}>
              {heatLayer.length.toLocaleString()}
            </span>{' '}
            active cells ·{' '}
            <span style={{ color: '#ef4444', fontWeight: 700 }}>
              {summary.emergingClusters || 0}
            </span>{' '}
            emerging
          </div>
        </div>

        {/* Risk Tier */}
        <Section title="Risk Tier" icon={Activity}>
          {tiers.map(tier => (
            <FilterBar
              key={tier}
              label={tier === 'ALL' ? 'All Tiers' : tier}
              count={tierCounts[tier]}
              max={maxTier}
              color={TIER_COLORS[tier]}
              active={tierFilter === tier}
              onClick={() => setTierFilter(tier)}
            />
          ))}
        </Section>

        {/* Crime Type */}
        <Section title="Crime Type" icon={Layers}>
          {crimeTypes.length === 0
            ? <div style={{ fontSize: 10, color: '#334e68', padding: '4px 0' }}>No data loaded</div>
            : crimeTypes.map(([type, count]) => (
              <FilterBar
                key={type}
                label={type.length > 22 ? `${type.slice(0, 20)}…` : type}
                count={count}
                max={maxCrime}
                color="#a78bfa"
                active={false}
                onClick={() => {}}
              />
            ))
          }
        </Section>

        {/* District */}
        <Section title="District" icon={MapPin}>
          <FilterBar
            label="All Districts"
            count={heatLayer.length}
            max={maxDistrict}
            color="#00e5ff"
            active={districtFilter === 'ALL'}
            onClick={() => onDistrictChange('ALL')}
          />
          {districts.map(([name, count]) => (
            <FilterBar
              key={name}
              label={name}
              count={count}
              max={maxDistrict}
              color="#38bdf8"
              active={districtFilter === name}
              onClick={() => onDistrictChange(name)}
            />
          ))}
        </Section>

        {/* Time of Operation */}
        <Section title="Time of Operation" icon={Clock}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {timeSlots.map(slot => {
              const active = timeFilter === slot
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeFilter(slot)}
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                    cursor: 'pointer',
                    border: active
                      ? '1px solid rgba(0,229,255,0.38)'
                      : '1px solid rgba(255,255,255,0.07)',
                    background: active ? 'rgba(0,229,255,0.11)' : 'transparent',
                    color: active ? '#00e5ff' : '#475569'
                  }}
                >
                  {slot === 'ALL' ? 'ALL' : slot.slice(0, 4)}
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* ── CTA footer ── */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div 
          onClick={() => onTogglePanel?.('mappin')}
          style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px',
          background: 'linear-gradient(135deg, rgba(0,80,200,0.32) 0%, rgba(0,229,255,0.18) 100%)',
          border: '1px solid rgba(0,229,255,0.32)',
          borderRadius: 7,
          color: '#00e5ff', fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}>
          {t?.('hm.deployRec') || 'Open Simulation Parameters →'}
          <ChevronRight size={14} />
        </div>
        <div style={{
          fontSize: 8, color: '#1e3a5f', textAlign: 'center',
          marginTop: 8, letterSpacing: '0.07em', textTransform: 'uppercase'
        }}>
          PALANTIR-CLASS GEOSPATIAL VIEW · ARISE v2
        </div>
      </div>
    </div>
  )
}
