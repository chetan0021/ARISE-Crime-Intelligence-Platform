import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign, AlertTriangle, Shield, Network, Search,
  ChevronRight, X, Loader2, TrendingUp, Phone, CreditCard,
  Smartphone, Bitcoin, Mail, Eye, Link, FileText
} from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* ── TOKEN TYPE CONFIG ─────────────────────────────── */
const TOKEN_CONFIG = {
  UPI_ID:        { icon: '₹',  color: 'var(--green)', label: 'UPI ID',        bgColor: 'var(--green-dim)' },
  BANK_ACCOUNT:  { icon: '🏦', color: 'var(--blue)', label: 'Bank account',  bgColor: 'var(--blue-dim)' },
  MOBILE:        { icon: '📱', color: 'var(--purple)', label: 'Mobile number', bgColor: 'var(--purple-dim)' },
  PHONE:         { icon: '📱', color: 'var(--purple)', label: 'Phone number',  bgColor: 'var(--purple-dim)' },
  CRYPTO_WALLET: { icon: '₿',  color: 'var(--text-primary)', label: 'Crypto wallet', bgColor: 'var(--amber-dim)' },
  IMEI:          { icon: '📟', color: 'var(--text-muted)', label: 'IMEI',          bgColor: 'rgba(113,113,122,0.1)' },
  EMAIL:         { icon: '@',  color: 'var(--amber)', label: 'Email',         bgColor: 'var(--amber-dim)' }
}
const getTokenConfig = (type) =>
  TOKEN_CONFIG[type] || { icon: '?', color: 'var(--text-muted)', label: type || 'Unknown', bgColor: 'rgba(82,82,91,0.1)' }

/* ── RISK LEVEL CONFIG ─────────────────────────────── */
const RISK_CONFIG = {
  CRITICAL: { color: 'var(--red)', bg: 'var(--red-dim)',  border: 'rgba(239,68,68,0.25)' },
  HIGH:     { color: 'var(--text-primary)', bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)' },
  MEDIUM:   { color: 'var(--text-primary)', bg: 'var(--amber-dim)', border: 'rgba(245, 158, 11,0.25)' },
  LOW:      { color: 'var(--text-muted)', bg: 'transparent',           border: 'var(--border-active)' }
}

/* ── FORMAT HELPERS ────────────────────────────────── */
function formatINR(amount) {
  if (!amount || isNaN(amount)) return '₹0'
  const n = parseFloat(amount)
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

/* ── STYLES (inline) ───────────────────────────────── */
const S = {
  page: { display: 'flex', height: '100%', fontFamily: "var(--font-sans)", background: 'var(--bg-base)', color: 'var(--text-primary)' },
  leftPanel: { flex: '0 0 440px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-default)', height: '100%', overflow: 'hidden' },
  rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  rightScroll: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  headerBar: { background: 'var(--bg-page)', padding: '16px', borderBottom: '1px solid var(--border-default)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' },
  kpiCard: { background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-active)' },
  kpiLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' },
  kpiValue: { fontSize: '20px', fontWeight: 700 },
  searchWrap: { position: 'relative', marginBottom: '10px' },
  searchInput: { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-active)', borderRadius: '6px', padding: '8px 12px 8px 34px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
  searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  pillRow: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' },
  pill: (active, clr) => ({
    padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 500, cursor: 'pointer', border: '1px solid',
    background: active ? (clr ? `${clr}18` : 'var(--amber-dim)') : 'transparent',
    borderColor: active ? (clr || 'var(--text-primary)') : 'var(--border-active)',
    color: active ? (clr || 'var(--text-primary)') : 'var(--text-muted)',
    transition: 'all .15s'
  }),
  tokenCount: { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', padding: '0 4px' },
  tokenList: { flex: 1, overflowY: 'auto' },
  tokenCard: (selected) => ({
    padding: '12px 16px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer',
    borderLeft: selected ? '2px solid var(--text-primary)' : '2px solid transparent',
    background: selected ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
    transition: 'background .12s'
  }),
  tokenRow1: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  typeBadge: (cfg) => ({
    width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: cfg.bgColor, border: `1px solid ${cfg.color}30`, fontSize: '18px', flexShrink: 0
  }),
  tokenMid: { flex: 1, minWidth: 0 },
  maskedVal: { fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subText: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' },
  subText2: { fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' },
  riskBadge: (level) => {
    const c = RISK_CONFIG[level] || RISK_CONFIG.LOW
    return { fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '0.3px' }
  },
  flagDot: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--red)', marginTop: '3px' },
  statsRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', flexWrap: 'wrap' },
  linkedRow: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  flagReason: { fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tab: (active) => ({
    padding: '8px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
    color: active ? 'var(--amber)' : 'var(--text-muted)', transition: 'all .15s', background: 'none', border: 'none', borderBottomStyle: 'solid'
  }),
  tabBar: { display: 'flex', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' },
  patternCard: (borderClr) => ({
    background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-active)', borderLeft: `3px solid ${borderClr}`, padding: '16px', marginBottom: '12px'
  }),
  patternTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' },
  countBadge: (clr) => ({
    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: `${clr}18`, color: clr, marginLeft: '8px'
  }),
  patternItem: { background: 'var(--bg-page)', borderRadius: '6px', border: '1px solid var(--border-default)', padding: '10px 12px', marginBottom: '6px' },
  detailHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)', position: 'relative' },
  closeBtn: { position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  detailMasked: { fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' },
  flagStrip: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '8px 12px', marginTop: '10px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  statBox: { background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-active)', padding: '12px' },
  statLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '18px', fontWeight: 700, marginTop: '2px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' },
  offenderCard: { background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-active)', padding: '12px', marginBottom: '8px' },
  relBadge: (clr) => ({ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: `${clr}15`, color: clr, border: `1px solid ${clr}30`, textTransform: 'uppercase' }),
  firCard: { background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-active)', padding: '10px 12px', marginBottom: '6px' },
  trailBox: { display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap', margin: '12px 0' },
  trailNode: (clr) => ({ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${clr}50`, background: `${clr}10`, fontSize: '12px', fontWeight: 500, color: clr, maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  trailArrow: { color: 'var(--text-muted)', fontSize: '16px', margin: '0 6px', flexShrink: 0 },
  amberBtn: { width: '100%', padding: '12px', background: 'var(--text-primary)', color: 'var(--bg-base)', fontWeight: 600, fontSize: '13px', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '16px', transition: 'opacity .15s' },
  skeleton: { background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border-active) 50%, var(--bg-card) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '6px' },
  emptyMsg: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' },
  barContainer: { background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-active)', padding: '14px', marginBottom: '8px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  barFill: (pct, clr) => ({ height: '6px', borderRadius: '3px', background: clr, width: `${pct}%`, transition: 'width .4s ease' }),
  barTrack: { flex: 1, height: '6px', borderRadius: '3px', background: 'var(--border-active)' },
  ziaPill: (clr) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', border: `1px solid ${clr}40`, color: clr, margin: '2px 4px 2px 0' }),
  centerMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' },
}

/* ── SHIMMER KEYFRAMES (inject once) ───────────────── */
if (typeof document !== 'undefined' && !document.getElementById('fc-shimmer-style')) {
  const style = document.createElement('style')
  style.id = 'fc-shimmer-style'
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .fc-token-card:hover { background: rgba(255,255,255,0.02) !important; }
  .fc-close-btn:hover { color: var(--text-primary) !important; }
  .fc-amber-btn:hover { opacity: 0.9; }`
  document.head.appendChild(style)
}

export default function FinancialCrime() {
  const t = useT()
  const { lang } = useLang()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedToken, setSelectedToken] = useState(null)
  const [tokenDetail, setTokenDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('patterns')
  const [moneyTrail, setMoneyTrail] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/financial/overview`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Failed to load')
        setData(json.data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleTokenClick(token) {
    setSelectedToken(token)
    setDetailLoading(true)
    setTokenDetail(null)
    setMoneyTrail(null)
    fetch(`${API_BASE}/api/financial/token/${token.token_uid}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setTokenDetail(json.data)
          // Fetch money trail if there are linked offenders
          const firstOffender = json.data.linkedOffenders?.[0]
          const offUid = firstOffender?.offender_uid || firstOffender?.offenderUid
          if (offUid) {
            fetch(`${API_BASE}/api/financial/money-trail/${offUid}`)
              .then(r2 => r2.json())
              .then(j2 => { if (j2.success) setMoneyTrail(j2.data) })
              .catch(() => {})
          }
        }
      })
      .catch(e => console.error('Token detail failed:', e))
      .finally(() => setDetailLoading(false))
  }

  const filteredTokens = useMemo(() => {
    if (!data?.tokens) return []
    return data.tokens.filter(tok => {
      const matchSearch = !searchTerm ||
        (tok.token_value_masked || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tok.bank_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tok.flag_reason_text || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = typeFilter === 'ALL' || tok.token_type === typeFilter
      const matchRisk = riskFilter === 'ALL' || tok.riskLevel === riskFilter
      return matchSearch && matchType && matchRisk
    })
  }, [data, searchTerm, typeFilter, riskFilter])

  /* ── LOADING STATE ───────────────────────────────── */
  if (loading) {
    return (
      <div className="arise-page-enter" style={S.page}>
        <div style={S.leftPanel}>
          <div style={S.headerBar}>
            <div style={S.kpiGrid}>
              {[0,1,2,3].map(i => <div key={i} style={{ ...S.skeleton, height: '56px' }} />)}
            </div>
            <div style={{ ...S.skeleton, height: '34px', marginBottom: '8px' }} />
            <div style={{ ...S.skeleton, height: '24px', width: '60%' }} />
          </div>
          <div style={{ padding: '12px 16px', flex: 1 }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ ...S.skeleton, height: '72px', marginBottom: '8px' }} />)}
          </div>
        </div>
        <div style={{ ...S.rightPanel, ...S.centerMsg }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-primary)' }} />
          <span style={{ fontSize: '13px' }}>Loading financial intelligence...</span>
        </div>
      </div>
    )
  }

  /* ── ERROR STATE ─────────────────────────────────── */
  if (error) {
    return (
      <div style={{ ...S.page, ...S.centerMsg }}>
        <AlertTriangle size={32} color="var(--red)" />
        <span style={{ color: 'var(--red)', fontSize: '14px' }}>{error}</span>
        <button onClick={() => window.location.reload()} style={{ ...S.amberBtn, width: 'auto', padding: '8px 24px', marginTop: '8px' }}>Retry</button>
      </div>
    )
  }

  const summary = data?.summary || {}
  const typeKeys = Object.keys(summary.tokensByType || {})
  const totalPatternsDetected = (summary.simSwapCount || 0) + (summary.muleAccountCount || 0) + (summary.multiRoutingCount || 0)

  /* ── RENDER ──────────────────────────────────────── */
  return (
    <div className="arise-page-enter" style={S.page}>
      {/* ══════════ LEFT PANEL ══════════ */}
      <div style={S.leftPanel}>
        <div style={S.headerBar}>
          {/* KPI strip */}
          <div style={S.kpiGrid}>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>Total instruments</div>
              <div style={{ ...S.kpiValue, color: 'var(--text-primary)' }}>{summary.totalTokens || 0}</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{t('fc.flagged')}</div>
              <div style={{ ...S.kpiValue, color: (summary.flaggedCount || 0) > 0 ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(summary.flaggedCount || 0) > 0 && <AlertTriangle size={16} />}
                {summary.flaggedCount || 0}
              </div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{t('fc.suspiciousValue')}</div>
              <div style={{ ...S.kpiValue, color: 'var(--text-primary)' }}>{formatINR(summary.totalSuspiciousAmount)}</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>{t('fc.patterns')}</div>
              <div style={{ ...S.kpiValue, color: 'var(--purple)' }}>{totalPatternsDetected}</div>
            </div>
          </div>

          {/* Search */}
          <div style={S.searchWrap}>
            <Search size={14} style={S.searchIcon} />
            <input
              style={S.searchInput}
              placeholder="Token value, bank, reason..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type pills */}
          <div style={S.pillRow}>
            <span style={S.pill(typeFilter === 'ALL', null)} onClick={() => setTypeFilter('ALL')}>ALL</span>
            {['UPI_ID', 'BANK_ACCOUNT', 'MOBILE', 'CRYPTO_WALLET', 'IMEI', 'EMAIL'].map(tp => (
              <span key={tp} style={S.pill(typeFilter === tp, getTokenConfig(tp).color)} onClick={() => setTypeFilter(tp)}>
                {getTokenConfig(tp).label}
              </span>
            ))}
          </div>

          {/* Risk pills */}
          <div style={S.pillRow}>
            <span style={S.pill(riskFilter === 'ALL', null)} onClick={() => setRiskFilter('ALL')}>ALL</span>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
              <span key={r} style={S.pill(riskFilter === r, RISK_CONFIG[r].color)} onClick={() => setRiskFilter(r)}>{r}</span>
            ))}
          </div>

          <div style={S.tokenCount}>{filteredTokens.length} instruments</div>
        </div>

        {/* Token list */}
        <div style={S.tokenList}>
          {filteredTokens.map(tok => {
            const cfg = getTokenConfig(tok.token_type)
            const isSelected = selectedToken?.token_uid === tok.token_uid
            return (
              <div
                key={tok.token_uid}
                className="fc-token-card"
                style={S.tokenCard(isSelected)}
                onClick={() => handleTokenClick(tok)}
              >
                <div style={S.tokenRow1}>
                  <div style={S.typeBadge(cfg)}>{cfg.icon}</div>
                  <div style={S.tokenMid}>
                    <div style={S.maskedVal}>{tok.token_value_masked || tok.token_uid}</div>
                    <div style={S.subText}>{[tok.bank_name, tok.telecom_operator].filter(Boolean).join(' · ') || cfg.label}</div>
                    {tok.registered_state && <div style={S.subText2}>{tok.registered_state}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={S.riskBadge(tok.riskLevel)}>{tok.riskLevel}</span>
                    {tok.is_flagged && (
                      <div style={S.flagDot}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                        Flagged
                      </div>
                    )}
                  </div>
                </div>
                <div style={S.statsRow}>
                  <span>{tok.txCount} transactions</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span style={{ color: tok.amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{formatINR(tok.amount)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{tok.linkedOffenderCount} linked accused</span>
                </div>
                {tok.linkedOffenders?.length > 0 && (
                  <div style={S.linkedRow}>
                    <span style={{ color: 'var(--text-muted)' }}>Linked: </span>
                    {tok.linkedOffenders.slice(0, 2).map(o => o.fullName).join(', ')}
                    {tok.linkedOffenders.length > 2 && ` +${tok.linkedOffenders.length - 2}`}
                  </div>
                )}
                {tok.is_flagged && tok.flag_reason_text && (
                  <div style={S.flagReason}>{tok.flag_reason_text.length > 60 ? tok.flag_reason_text.slice(0, 60) + '…' : tok.flag_reason_text}</div>
                )}
              </div>
            )
          })}
          {filteredTokens.length === 0 && (
            <div style={{ ...S.centerMsg, padding: '40px' }}>
              <Search size={24} color="var(--text-muted)" />
              <span style={{ fontSize: '12px' }}>No instruments match filters</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div style={S.rightPanel}>
        {!selectedToken ? (
          /* ── No selection: fraud pattern analysis ── */
          <>
            <div style={S.tabBar}>
              {[
                { key: 'patterns', label: 'Fraud patterns' },
                { key: 'breakdown', label: 'Token breakdown' },
                { key: 'zia', label: 'Zia intelligence' }
              ].map(tb => (
                <button key={tb.key} style={S.tab(activeTab === tb.key)} onClick={() => setActiveTab(tb.key)}>
                  {tb.label}
                </button>
              ))}
            </div>
            <div style={S.rightScroll}>

              {/* ── FRAUD PATTERNS TAB ── */}
              {activeTab === 'patterns' && (
                <>
                  {/* SIM-Swap */}
                  <div style={S.patternCard('var(--red)')}>
                    <div style={S.patternTitle}>
                      <Phone size={16} color="var(--red)" />
                      {t('fc.simSwap')}
                      <span style={S.countBadge('var(--red)')}>{data?.fraudPatterns?.simSwap?.length || 0} cases detected</span>
                    </div>
                    {(data?.fraudPatterns?.simSwap?.length || 0) > 0 ? data.fraudPatterns.simSwap.map((c, i) => (
                      <div key={i} style={S.patternItem}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>{c.maskedValue}</div>
                        {c.operator && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operator: {c.operator}</div>}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {c.linkedFirs?.map((f, j) => (
                            <span key={j} style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '10px', background: 'var(--amber-dim)', color: 'var(--text-primary)', border: '1px solid rgba(245, 158, 11,0.25)' }}>
                              {f.firUid || f}
                            </span>
                          ))}
                        </div>
                        {c.linkedOffenders?.map((o, j) => (
                          <div key={j} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{o.fullName}</div>
                        ))}
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                          Typical pattern: SIM swap → OTP intercept → fund transfer
                        </div>
                      </div>
                    )) : <div style={S.emptyMsg}>No SIM-swap patterns detected</div>}
                  </div>

                  {/* Mule accounts */}
                  <div style={S.patternCard('var(--text-primary)')}>
                    <div style={S.patternTitle}>
                      <CreditCard size={16} color="var(--text-primary)" />
                      {t('fc.muleAccount')}
                      <span style={S.countBadge('var(--text-primary)')}>{data?.fraudPatterns?.muleAccounts?.length || 0} accounts</span>
                    </div>
                    {(data?.fraudPatterns?.muleAccounts?.length || 0) > 0 ? data.fraudPatterns.muleAccounts.map((m, i) => (
                      <div key={i} style={S.patternItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={S.riskBadge('HIGH')}>{m.patternType === 'MULE_ACCOUNT' ? 'MULE' : m.patternType}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>{m.maskedValue}</span>
                        </div>
                        {m.bank && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bank: {m.bank}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.txCount} transactions · {formatINR(m.amount)}</div>
                        {m.linkedOffenders?.map((o, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{o.fullName}</span>
                            {o.relationshipType && <span style={S.relBadge(o.relationshipType === 'CONDUIT' ? 'var(--purple)' : o.relationshipType === 'HANDLER' ? 'var(--red)' : 'var(--text-primary)')}>{o.relationshipType}</span>}
                          </div>
                        ))}
                      </div>
                    )) : <div style={S.emptyMsg}>No mule accounts detected</div>}
                  </div>

                  {/* Multi-account routing */}
                  <div style={S.patternCard('var(--purple)')}>
                    <div style={S.patternTitle}>
                      <Network size={16} color="var(--purple)" />
                      {t('fc.multiRouting')}
                      <span style={S.countBadge('var(--purple)')}>{data?.fraudPatterns?.multiAccountRouting?.length || 0} offenders</span>
                    </div>
                    {(data?.fraudPatterns?.multiAccountRouting?.length || 0) > 0 ? data.fraudPatterns.multiAccountRouting.map((entry, i) => (
                      <div key={i} style={S.patternItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.offender?.fullName || 'Unknown'}</span>
                          {entry.offender?.riskScore > 0 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>Risk: {(parseFloat(entry.offender.riskScore) * 100).toFixed(0)}%</span>
                          )}
                        </div>
                        {entry.tokens?.map((tk, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ ...S.riskBadge('MEDIUM'), fontSize: '8px' }}>{tk.type}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{tk.masked}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{formatINR(tk.amount)}</span>
                          </div>
                        ))}
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>
                          {t('fc.totalExposure')}: {formatINR(entry.tokens?.reduce((s, tk) => s + (parseFloat(tk.amount) || 0), 0))}
                        </div>
                      </div>
                    )) : <div style={S.emptyMsg}>No multi-account routing detected</div>}
                  </div>
                </>
              )}

              {/* ── TOKEN BREAKDOWN TAB ── */}
              {activeTab === 'breakdown' && (
                <>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Instrument type distribution</h3>
                  {typeKeys.map(tp => {
                    const total = summary.tokensByType[tp] || 0
                    const flagged = (summary.flaggedByType || {})[tp] || 0
                    const maxCount = Math.max(...Object.values(summary.tokensByType || {}), 1)
                    const pct = (total / maxCount) * 100
                    const cfg = getTokenConfig(tp)
                    return (
                      <div key={tp} style={S.barContainer}>
                        <div style={S.barRow}>
                          <div style={{ ...S.typeBadge(cfg), width: '32px', height: '32px', fontSize: '14px' }}>{cfg.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 500 }}>{cfg.label}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{total} total, <span style={{ color: flagged > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{flagged} flagged</span></span>
                            </div>
                            <div style={S.barTrack}>
                              <div style={S.barFill(pct, cfg.color)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {typeKeys.length === 0 && <div style={S.emptyMsg}>No token type data available</div>}
                </>
              )}

              {/* ── ZIA INTELLIGENCE TAB ── */}
              {activeTab === 'zia' && (
                <>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>✨ {t('fc.ziaIntelligence')}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Keywords extracted from flagged instrument reasons using Zia Text Analytics
                  </p>
                  {(data?.fraudCategories?.length || 0) > 0 ? data.fraudCategories.map((fc, i) => (
                    <div key={i} style={{ ...S.patternItem, marginBottom: '10px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '6px' }}>{fc.tokenUid}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {fc.keywords?.map((kw, j) => {
                          const kwLower = (typeof kw === 'string' ? kw : '').toLowerCase()
                          const kwColor = (kwLower.includes('sim') || kwLower.includes('otp') || kwLower.includes('fraud')) ? 'var(--red)'
                            : (kwLower.includes('bank') || kwLower.includes('account')) ? 'var(--blue)' : 'var(--text-muted)'
                          return <span key={j} style={S.ziaPill(kwColor)}>{typeof kw === 'string' ? kw : JSON.stringify(kw)}</span>
                        })}
                      </div>
                    </div>
                  )) : (
                    <div style={S.emptyMsg}>
                      Zia analysis runs on flagged instruments. Enable Zia Text Analytics in Catalyst Console → Zia Services.
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* ── TOKEN SELECTED: detail panel ── */
          <>
            <div style={S.detailHeader}>
              <button className="fc-close-btn" style={S.closeBtn} onClick={() => { setSelectedToken(null); setTokenDetail(null); setMoneyTrail(null) }}>
                <X size={18} />
              </button>
              <div style={{ ...S.typeBadge(getTokenConfig(selectedToken.token_type)), width: '48px', height: '48px', fontSize: '22px' }}>
                {getTokenConfig(selectedToken.token_type).icon}
              </div>
              <div style={S.detailMasked}>{selectedToken.token_value_masked || selectedToken.token_uid}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {[selectedToken.bank_name, selectedToken.telecom_operator, selectedToken.registered_state].filter(Boolean).join(' · ')}
              </div>
              {selectedToken.is_flagged && (
                <div style={S.flagStrip}>
                  <AlertTriangle size={14} color="var(--red)" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--red)' }}>{t('fc.flaggedInstrument').toUpperCase()}</span>
                  {selectedToken.flag_reason_text && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', width: '100%' }}>{selectedToken.flag_reason_text}</div>
                  )}
                </div>
              )}
            </div>

            <div style={S.rightScroll}>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[0, 1, 2, 3].map(i => <div key={i} style={{ ...S.skeleton, height: '60px' }} />)}
                </div>
              ) : (
                <>
                  {/* Financial stats grid */}
                  <div style={S.statsGrid}>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Amount</div>
                      <div style={{ ...S.statValue, color: 'var(--text-primary)' }}>{formatINR(selectedToken.amount)}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Transactions</div>
                      <div style={S.statValue}>{selectedToken.txCount}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>First seen</div>
                      <div style={{ ...S.statValue, fontSize: '14px' }}>{formatDate(selectedToken.first_seen_datetime)}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Last seen</div>
                      <div style={{ ...S.statValue, fontSize: '14px' }}>{formatDate(selectedToken.last_seen_datetime)}</div>
                    </div>
                  </div>

                  {/* Linked accused */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={S.sectionTitle}>
                      <Shield size={16} color="var(--text-primary)" />
                      {t('fc.linkedAccused')}
                    </div>
                    {(tokenDetail?.linkedOffenders?.length || 0) > 0 ? tokenDetail.linkedOffenders.map((o, i) => {
                      const riskScore = parseFloat(o.recidivism_risk_score || o.riskScore) || 0
                      const relType = o.relationship_type || o.relationshipType || ''
                      const relColor = relType === 'CONDUIT' ? 'var(--purple)' : relType === 'HANDLER' ? 'var(--red)' : 'var(--text-primary)'
                      return (
                        <div key={i} style={S.offenderCard}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{o.full_name || o.fullName || 'Unknown'}</span>
                            {relType && <span style={S.relBadge(relColor)}>{relType}</span>}
                          </div>
                          {(o.alias_names || o.aliasNames) && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Alias: {o.alias_names || o.aliasNames}</div>}
                          {riskScore > 0 && (
                            <div style={{ marginTop: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Risk score</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-primary)' }}>{(riskScore * 100).toFixed(0)}%</span>
                              </div>
                              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border-active)' }}>
                                <div style={{ height: '4px', borderRadius: '2px', background: 'var(--text-primary)', width: `${riskScore * 100}%`, transition: 'width .4s' }} />
                              </div>
                            </div>
                          )}
                          {(o.gang_affiliation_text || o.gang) && (
                            <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'var(--amber-dim)', color: 'var(--text-primary)', border: '1px solid rgba(245, 158, 11,0.25)' }}>
                              {o.gang_affiliation_text || o.gang}
                            </span>
                          )}
                          {(o.evidence || o.association_evidence_text) && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                              {o.evidence || o.association_evidence_text}
                            </div>
                          )}
                        </div>
                      )
                    }) : <div style={S.emptyMsg}>No accused linked to this instrument in the database</div>}
                  </div>

                  {/* Linked FIRs */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={S.sectionTitle}>
                      <FileText size={16} color="var(--blue)" />
                      {t('fc.linkedFIRs')}
                    </div>
                    {(tokenDetail?.linkedFirs?.length || 0) > 0 ? tokenDetail.linkedFirs.map((f, i) => (
                      <div key={i} style={S.firCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>{f.fir_uid || f.firUid}</span>
                          {(f.case_status || f.status) && (
                            <span style={S.riskBadge((f.case_status || f.status) === 'Open' ? 'HIGH' : 'LOW')}>
                              {f.case_status || f.status}
                            </span>
                          )}
                        </div>
                        {(f.bns_primary_section || f.section) && (
                          <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '10px', background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(56,189,248,0.25)' }}>
                            BNS {f.bns_primary_section || f.section}
                          </span>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {[f.district_name || f.district, formatDate(f.fir_registration_datetime || f.date)].filter(Boolean).join(' · ')}
                        </div>
                        {(f.complainant_name || f.complainant) && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Complainant: {f.complainant_name || f.complainant}</div>
                        )}
                      </div>
                    )) : <div style={S.emptyMsg}>No FIRs linked to this instrument</div>}
                  </div>

                  {/* Money trail */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={S.sectionTitle}>
                      <Link size={16} color="var(--purple)" />
                      {t('fc.moneyTrail')}
                    </div>
                    {moneyTrail ? (
                      <>
                        <div style={S.trailBox}>
                          {/* Offender node */}
                          <div style={S.trailNode('var(--text-primary)')}>
                            {tokenDetail?.linkedOffenders?.[0]?.full_name || tokenDetail?.linkedOffenders?.[0]?.fullName || 'Accused'}
                          </div>
                          <span style={S.trailArrow}>→</span>
                          {/* Token node */}
                          <div style={S.trailNode(getTokenConfig(selectedToken.token_type).color)}>
                            {selectedToken.token_value_masked || selectedToken.token_uid}
                          </div>
                          {tokenDetail?.linkedFirs?.[0] && (
                            <>
                              <span style={S.trailArrow}>→</span>
                              <div style={S.trailNode('#22d3ee')}>
                                {tokenDetail.linkedFirs[0].fir_uid || tokenDetail.linkedFirs[0].firUid || 'FIR'}
                              </div>
                            </>
                          )}
                        </div>
                        {moneyTrail.financialTokens?.length > 1 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            + {moneyTrail.financialTokens.length - 1} other financial instruments in trail
                          </div>
                        )}
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {t('fc.totalExposure')}: {formatINR(moneyTrail.totalExposure)}
                        </div>
                        {moneyTrail.coAccused?.length > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            Co-accused in trail: {moneyTrail.coAccused.map(c => c.full_name || c.fullName).filter(Boolean).join(', ')}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={S.emptyMsg}>
                        {detailLoading ? 'Loading trail...' : 'No money trail data available for this instrument'}
                      </div>
                    )}
                  </div>

                  {/* Add to investigation button */}
                  <button className="fc-amber-btn" style={S.amberBtn}>
                    {t('fc.addInvestigation')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
