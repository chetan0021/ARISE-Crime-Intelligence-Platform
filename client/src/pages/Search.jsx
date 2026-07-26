import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search as SearchIcon, FileText, User, MapPin, Shield, AlertTriangle,
  Clock, ChevronRight, X, Loader2, CheckCircle, XCircle, Brain,
  Fingerprint, Link as LinkIcon, TrendingUp, Calendar, Hash
} from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'

const API_BASE = import.meta.env.VITE_API_BASE || ''

/* ── BNS LABELS MAP ──────────────────────────────── */
const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery · Snatching',
  'BNS-318(4)': 'Cyber Fraud · OTP',
  'BNS-331(3)': 'Housebreaking · Night',
  'BNS-115': 'Assault',
  'BNS-103': 'Murder',
  'BNS-302': 'Armed Robbery',
  'BNS-308': 'Extortion'
}

function getBNSLabel(section) {
  if (!section) return 'Unknown'
  return BNS_LABELS[section]
    ? `${section} · ${BNS_LABELS[section]}`
    : section
}

/* ── STYLES ──────────────────────────────────────── */
const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: "var(--font-sans)",
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    overflow: 'hidden'
  },
  topBar: {
    padding: '20px 24px 12px 24px',
    borderBottom: '1px solid var(--bg-card)',
    background: 'var(--bg-page)',
    position: 'relative'
  },
  searchBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 400,
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 'none',
    outline: 'none'
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px'
  },
  hint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    userSelect: 'none'
  },
  suggestionsDropdown: {
    position: 'absolute',
    left: '24px',
    right: '24px',
    top: '72px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    zIndex: 100,
    maxHeight: '320px',
    overflowY: 'auto'
  },
  suggestionRow: {
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    borderBottom: '1px solid var(--border-subtle)'
  },
  suggestionText: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '12px',
    flexWrap: 'wrap'
  },
  pill: (active) => ({
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid',
    background: active ? 'var(--amber-dim)' : 'transparent',
    borderColor: active ? 'var(--amber)' : 'var(--border-default)',
    color: active ? 'var(--amber)' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  }),
  countBadge: {
    fontSize: '9px',
    background: 'var(--border-default)',
    color: 'var(--text-secondary)',
    padding: '1px 5px',
    borderRadius: '8px'
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPanel: {
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--bg-card)',
    height: '100%'
  },
  resultsScroll: {
    flex: 1,
    overflowY: 'auto'
  },
  resultsHeader: {
    padding: '12px 16px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-page)'
  },
  resultCard: (selected) => ({
    padding: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    position: 'relative',
    background: selected ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
    borderLeft: selected ? '3px solid var(--amber)' : '3px solid transparent',
    transition: 'background 0.2s'
  }),
  circleIcon: (bg, clr) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
    color: clr,
    flexShrink: 0
  }),
  cardMiddle: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardSub: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px'
  },
  cardMuted: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px'
  },
  cardMatch: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: '4px'
  },
  chevronRight: {
    color: 'var(--text-muted)',
    flexShrink: 0
  },
  deadlineBreached: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--red)',
    fontSize: '10px',
    fontWeight: 500,
    marginTop: '4px'
  },
  badge: (bg, clr) => ({
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    background: bg,
    color: clr,
    border: `1px solid ${clr}30`
  }),
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-base)',
    overflowY: 'auto'
  },
  detailHeader: {
    padding: '24px',
    borderBottom: '1px solid var(--bg-card)',
    background: 'var(--bg-page)'
  },
  detailTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'monospace'
  },
  detailSub: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '4px'
  },
  detailIO: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px'
  },
  summaryBox: {
    background: 'var(--amber-dim)',
    border: '1px solid var(--amber-dim)',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px',
    marginTop: '20px'
  },
  summaryTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  summaryText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },
  summaryFooter: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '8px'
  },
  section: {
    padding: '0 24px',
    marginBottom: '28px'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '14px'
  },
  timelineContainer: {
    borderLeft: '1px solid var(--border-default)',
    marginLeft: '8px',
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  timelineEvent: {
    position: 'relative'
  },
  timelineDot: (clr) => ({
    position: 'absolute',
    left: '-23px',
    top: '4px',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: clr,
    border: '2px solid var(--bg-base)'
  }),
  timelineDate: {
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  timelineLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)'
  },
  timelineSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '1px'
  },
  timelineDelay: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'var(--text-primary)',
    marginTop: '3px'
  },
  compliancePanel: (breached) => ({
    background: breached ? 'var(--red-dim)' : 'var(--green-dim)',
    border: breached ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(74,222,128,0.2)',
    borderRadius: '8px',
    padding: '16px',
    margin: '0 24px 28px 24px'
  }),
  complianceTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '10px'
  },
  complianceStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '12px'
  },
  complianceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px'
  },
  complianceBox: {
    background: 'var(--bg-card)',
    borderRadius: '6px',
    padding: '10px',
    border: '1px solid var(--border-default)'
  },
  complianceLabel: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },
  complianceValue: {
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '2px'
  },
  accusedCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '10px'
  },
  accusedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  accusedName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  accusedRisk: {
    marginTop: '8px'
  },
  accusedRiskText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginBottom: '3px'
  },
  accusedRiskTrack: {
    height: '4px',
    background: 'var(--border-default)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  accusedRiskFill: (score) => ({
    height: '100%',
    width: `${score * 100}%`,
    background: 'var(--text-primary)'
  }),
  accusedMO: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
    lineHeight: 1.4
  },
  accusedFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)'
  },
  accusedLink: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    fontWeight: 500
  },
  evidenceCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '8px'
  },
  leadCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderLeft: '3px solid var(--text-primary)',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '8px'
  },
  leadAction: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: '4px'
  },
  similarCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  bsaFooter: {
    padding: '16px 24px',
    borderTop: '1px solid var(--bg-card)',
    background: 'var(--bg-page)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  initialState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center'
  },
  initialTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: '16px',
    marginBottom: '8px'
  },
  initialSub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    maxWidth: '480px',
    lineHeight: 1.5,
    marginBottom: '24px'
  },
  initialPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--border-default)',
    fontSize: '12px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  skeleton: {
    background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border-default) 50%, var(--bg-card) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px'
  }
}

if (typeof document !== 'undefined' && !document.getElementById('si-shimmer-style')) {
  const style = document.createElement('style')
  style.id = 'si-shimmer-style'
  style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .si-pill-hover:hover { border-color: var(--text-primary) !important; color: var(--text-primary) !important; }
  .si-row-hover:hover { background: rgba(255,255,255,0.03) !important; }`
  document.head.appendChild(style)
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

export default function Search() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selectedResult, setSelectedResult] = useState(null)
  const [caseDetail, setCaseDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Handle clicking outside suggestions to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-search / open case if navigating from other dashboard view
  useEffect(() => {
    const state = location.state
    if (state?.searchQuery) {
      setQuery(state.searchQuery)
      handleSearch(state.searchQuery)
    }
    if (state?.openFirUid) {
      fetchCaseDetail(state.openFirUid)
    }
  }, [location.state])

  async function handleSearch(searchTerm) {
    const term = (searchTerm !== undefined ? searchTerm : query).trim()
    if (term.length < 2) return

    setSearching(true)
    setSearchError(null)
    setSelectedResult(null)
    setCaseDetail(null)
    setShowSuggestions(false)

    try {
      const url = new URL(`${API_BASE}/api/search`, window.location.origin)
      url.searchParams.set('q', term)
      if (typeFilter !== 'ALL') {
        url.searchParams.set('type', typeFilter)
      }

      const res = await fetch(url.toString())
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResults(json.data)
    } catch (e) {
      setSearchError(e.message)
    } finally {
      setSearching(false)
    }
  }

  // Update type filter and trigger search again if search results exist
  useEffect(() => {
    if (results && results.searchTerm) {
      handleSearch(results.searchTerm)
    }
  }, [typeFilter])

  function handleQueryChange(value) {
    setQuery(value)
    clearTimeout(searchTimeoutRef.current)
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/search/suggestions?q=${encodeURIComponent(value)}`)
          const json = await res.json()
          if (json.success) {
            setSuggestions(json.data.suggestions)
            setShowSuggestions(true)
          }
        } catch (e) {
          setSuggestions([])
        }
      }, 250)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  async function fetchCaseDetail(firUid) {
    setDetailLoading(true)
    setCaseDetail(null)
    try {
      const res = await fetch(`${API_BASE}/api/cases/${firUid}`)
      const json = await res.json()
      if (json.success) {
        setCaseDetail(json.data)
      }
    } catch (e) {
      console.error('Case detail error:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleResultClick(result) {
    setSelectedResult(result)
    if (result.resultType === 'FIR') {
      fetchCaseDetail(result.fir_uid)
    } else if (result.resultType === 'OFFENDER') {
      navigate('/dashboard/offenders', {
        state: { selectedUid: result.offender_uid }
      })
    } else if (result.resultType === 'VICTIM' || result.resultType === 'LOCATION') {
      fetchCaseDetail(result.linkedFirUid)
    }
  }

  const handleSuggestionClick = (s) => {
    setQuery(s.value)
    setShowSuggestions(false)
    handleSearch(s.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearQuery = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="arise-page-enter" style={S.container}>
      {/* ── SECTION 1: SEARCH BAR ── */}
      <div style={S.topBar}>
        <div style={S.searchBox}>
          <SearchIcon size={20} color="var(--text-muted)" />
          <input
            ref={searchInputRef}
            style={S.searchInput}
            placeholder={t('si.placeholder')}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
          />
          {query && (
            <button style={S.clearBtn} onClick={clearQuery}>
              <X size={18} />
            </button>
          )}
          <span style={S.hint}>Enter ↵</span>
        </div>

        {/* Suggestions Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionsRef} style={S.suggestionsDropdown}>
            {suggestions.map((s, idx) => {
              let iconClr = '#22d3ee'
              let IconComponent = FileText
              if (s.type === 'VICTIM') {
                iconClr = '#f43f5e'
                IconComponent = User
              } else if (s.type === 'ACCUSED') {
                iconClr = 'var(--text-primary)'
                IconComponent = Shield
              } else if (s.type === 'ALIAS') {
                iconClr = 'var(--text-primary)'
                IconComponent = User
              }

              return (
                <div
                  key={idx}
                  style={S.suggestionRow}
                  className="si-row-hover arise-card-hover"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <IconComponent size={16} color={iconClr} style={{ flexShrink: 0 }} />
                  <span style={S.suggestionText}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Type Filter Pills */}
        <div style={S.filterRow}>
          <span style={S.pill(typeFilter === 'ALL')} onClick={() => setTypeFilter('ALL')}>
            ALL {results?.byType && <span style={S.countBadge}>{results.total}</span>}
          </span>
          <span style={S.pill(typeFilter === 'FIR')} onClick={() => setTypeFilter('FIR')}>
            FIR {results?.byType && <span style={S.countBadge}>{results.byType.FIR}</span>}
          </span>
          <span style={S.pill(typeFilter === 'ACCUSED')} onClick={() => setTypeFilter('ACCUSED')}>
            Accused {results?.byType && <span style={S.countBadge}>{results.byType.ACCUSED}</span>}
          </span>
          <span style={S.pill(typeFilter === 'VICTIM')} onClick={() => setTypeFilter('VICTIM')}>
            Victim {results?.byType && <span style={S.countBadge}>{results.byType.VICTIM}</span>}
          </span>
          <span style={S.pill(typeFilter === 'LOCATION')} onClick={() => setTypeFilter('LOCATION')}>
            Location {results?.byType && <span style={S.countBadge}>{results.byType.LOCATION}</span>}
          </span>
        </div>
      </div>

      {/* ── SECTION 2 & 3: MAIN WORKSPACE ── */}
      <div style={S.mainArea}>
        {searching ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-primary)' }} />
            <span style={{ fontSize: '13px' }}>Searching intelligence records...</span>
          </div>
        ) : searchError ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--red)', padding: '40px' }}>
            <AlertTriangle size={36} color="var(--red)" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Search Failed</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>{searchError}</span>
            <button
              onClick={() => handleSearch()}
              style={{
                marginTop: '12px',
                padding: '8px 20px',
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : !results ? (
          /* INITIAL EMPTY STATE */
          <div style={S.initialState}>
            <SearchIcon size={64} color="var(--border-default)" />
            <div style={S.initialTitle}>Search the ARISE intelligence database</div>
            <div style={S.initialSub}>
              Query FIRs, accused persons, victims, locations and BNS sections across Karnataka's crime records
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['BNS-318(4)', 'Housebreaking', 'Whitefield', 'Repeat offenders', 'Bail cases'].map((term) => (
                <span
                  key={term}
                  style={S.initialPill}
                  className="si-pill-hover"
                  onClick={() => {
                    setQuery(term)
                    handleSearch(term)
                  }}
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* LEFT RESULTS PANEL */}
            <div style={S.leftPanel}>
              <div style={S.resultsHeader}>
                {results.total} {t('si.results')} '{results.searchTerm}'
              </div>
              <div style={S.resultsScroll}>
                {searching ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-primary)' }} />
                  </div>
                ) : results.results.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <SearchIcon size={32} color="var(--border-default)" style={{ margin: '0 auto 12px auto' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('si.noResults')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Try searching by FIR number, accused name, BNS section, or location
                    </div>
                  </div>
                ) : (
                  results.results.map((r, i) => {
                    const isSelected = selectedResult === r

                    if (r.resultType === 'FIR') {
                      const breached = r.bnss_deadline_breached === true || r.bnss_deadline_breached === 'true'
                      return (
                        <div
                          key={i}
                          style={S.resultCard(isSelected)}
                          onClick={() => handleResultClick(r)}
                        >
                          <div style={S.circleIcon('rgba(34,211,238,0.1)', '#22d3ee')}>
                            <FileText size={18} />
                          </div>
                          <div style={S.cardMiddle}>
                            <div style={S.cardTitle}>{r.fir_uid}</div>
                            <div style={S.cardSub}>
                              <span style={{ ...S.badge('var(--amber-dim)', 'var(--text-primary)'), marginRight: '6px' }}>
                                {r.bns_primary_section}
                              </span>
                              {r.district_name}
                            </div>
                            <div style={S.cardMuted}>
                              {r.case_status} · {formatDate(r.fir_registration_datetime)}
                            </div>
                            <div style={S.cardMatch}>
                              {t('si.matchedOn')}: {r.matchedOn}
                            </div>
                            {breached && (
                              <div style={S.deadlineBreached}>
                                <AlertTriangle size={12} color="var(--red)" />
                                {t('si.deadlineBreached')}
                              </div>
                            )}
                          </div>
                          <ChevronRight size={16} style={S.chevronRight} />
                        </div>
                      )
                    }

                    if (r.resultType === 'OFFENDER') {
                      const repeat = r.is_repeat_offender === true || r.is_repeat_offender === 'true'
                      const isRowdy = r.is_rowdy_sheeter === true || r.is_rowdy_sheeter === 'true'
                      const riskScore = parseFloat(r.recidivism_risk_score) || 0

                      return (
                        <div
                          key={i}
                          style={S.resultCard(isSelected)}
                          onClick={() => handleResultClick(r)}
                        >
                          <div
                            style={{
                              ...S.circleIcon('rgba(245, 158, 11,0.1)', 'var(--text-primary)'),
                              border: isRowdy ? '2px dashed var(--red)' : 'none'
                            }}
                          >
                            <Shield size={18} />
                          </div>
                          <div style={S.cardMiddle}>
                            <div style={{ ...S.cardTitle, fontFamily: 'inherit', fontSize: '14px' }}>
                              {r.full_name}
                            </div>
                            {r.alias_names && <div style={S.cardSub}>Alias: "{r.alias_names}"</div>}
                            <div style={S.accusedRisk}>
                              <div style={S.accusedRiskText}>
                                <span>Recidivism risk</span>
                                <span style={{ color: 'var(--text-primary)' }}>{(riskScore * 100).toFixed(0)}%</span>
                              </div>
                              <div style={S.accusedRiskTrack}>
                                <div style={S.accusedRiskFill(riskScore)} />
                              </div>
                            </div>
                            <div style={{ ...S.cardMuted, marginTop: '6px' }}>
                              Arrests: {r.total_prior_arrests || 0} {repeat && '· Repeat Offender'}
                            </div>
                            <div style={S.cardMatch}>
                              {t('si.matchedOn')}: {r.matchedOn}
                            </div>
                          </div>
                          <ChevronRight size={16} style={S.chevronRight} />
                        </div>
                      )
                    }

                    if (r.resultType === 'VICTIM') {
                      return (
                        <div
                          key={i}
                          style={S.resultCard(isSelected)}
                          onClick={() => handleResultClick(r)}
                        >
                          <div style={S.circleIcon('rgba(244,63,94,0.1)', '#f43f5e')}>
                            <User size={18} />
                          </div>
                          <div style={S.cardMiddle}>
                            <div style={{ ...S.cardTitle, fontFamily: 'inherit', fontSize: '14px' }}>
                              {r.victimName}{' '}
                              <span style={{ ...S.badge('rgba(244,63,94,0.1)', '#f43f5e'), marginLeft: '4px' }}>
                                Victim
                              </span>
                            </div>
                            <div style={S.cardSub}>
                              {r.section} · {r.district}
                            </div>
                            <div style={{ ...S.cardMuted, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              Linked FIR: {r.linkedFirUid}
                            </div>
                          </div>
                          <ChevronRight size={16} style={S.chevronRight} />
                        </div>
                      )
                    }

                    if (r.resultType === 'LOCATION') {
                      return (
                        <div
                          key={i}
                          style={S.resultCard(isSelected)}
                          onClick={() => handleResultClick(r)}
                        >
                          <div style={S.circleIcon('rgba(74,222,128,0.1)', '#4ade80')}>
                            <MapPin size={18} />
                          </div>
                          <div style={S.cardMiddle}>
                            <div style={{ ...S.cardTitle, fontFamily: 'inherit', fontSize: '14px' }}>
                              {r.address && r.address.length > 50 ? `${r.address.slice(0, 50)}...` : r.address || 'Unknown'}
                            </div>
                            <div style={S.cardSub}>{r.district}</div>
                            <div style={{ ...S.cardMuted, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              Incident in FIR: {r.linkedFirUid}
                            </div>
                          </div>
                          <ChevronRight size={16} style={S.chevronRight} />
                        </div>
                      )
                    }

                    return null
                  })
                )}
              </div>
            </div>

            {/* RIGHT DETAILS VIEW PANEL */}
            <div style={S.rightPanel}>
              {detailLoading ? (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ ...S.skeleton, height: '40px', width: '200px' }} />
                  <div style={{ ...S.skeleton, height: '24px', width: '350px' }} />
                  <div style={{ ...S.skeleton, height: '120px' }} />
                  <div style={{ ...S.skeleton, height: '80px' }} />
                </div>
              ) : !caseDetail ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Select a result to track investigation timeline and deadline compliance
                </div>
              ) : (
                <>
                  {/* Case Header */}
                  <div style={S.detailHeader}>
                    <div style={S.detailTitle}>{caseDetail.fir?.fir_uid}</div>
                    <div style={S.detailSub}>
                      {[caseDetail.fir?.police_station_code, caseDetail.fir?.district_name, caseDetail.fir?.subdivision_name].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={S.badge('var(--amber-dim)', 'var(--text-primary)')}>
                        {getBNSLabel(caseDetail.fir?.bns_primary_section)}
                      </span>
                      {caseDetail.fir?.bns_additional_sections && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          + {caseDetail.fir.bns_additional_sections}
                        </span>
                      )}
                      <span style={{ ...S.badge('rgba(34,211,238,0.12)', '#22d3ee'), marginLeft: 'auto' }}>
                        {caseDetail.fir?.case_status}
                      </span>
                    </div>
                    {caseDetail.fir?.io_name && (
                      <div style={S.detailIO}>Investigating Officer: {caseDetail.fir.io_name}</div>
                    )}
                  </div>

                  {/* AI Auto Summary */}
                  {caseDetail.autoSummary && (
                    <div style={S.summaryBox}>
                      <div style={S.summaryTitle}>
                        <Brain size={16} />
                        {t('si.aiSummary')}
                      </div>
                      <div style={S.summaryText}>{caseDetail.autoSummary}</div>
                      <div style={S.summaryFooter}>Generated by ARISE AI from case records</div>
                    </div>
                  )}

                  {/* Timeline section */}
                  <div style={S.section}>
                    <div style={S.sectionHeader}>
                      <Clock size={16} color="#a78bfa" />
                      {t('si.timeline')}
                    </div>
                    <div style={S.timelineContainer}>
                      {/* Event 1: Registration */}
                      <div style={S.timelineEvent}>
                        <div style={S.timelineDot('#22c55e')} />
                        <div style={S.timelineDate}>{formatDate(caseDetail.fir?.fir_registration_datetime)}</div>
                        <div style={S.timelineLabel}>FIR registered at {caseDetail.fir?.police_station_code}</div>
                        {caseDetail.fir?.efir_log_id && (
                          <div style={S.timelineSub}>e-FIR: {caseDetail.fir.efir_log_id}</div>
                        )}
                        {parseInt(caseDetail.fir?.reporting_delay_hours) > 24 && (
                          <div style={S.timelineDelay}>
                            <AlertTriangle size={12} />
                            {caseDetail.fir.reporting_delay_hours} hours delay in reporting
                          </div>
                        )}
                      </div>

                      {/* Event 2: Forensic check */}
                      <div style={S.timelineEvent}>
                        {(() => {
                          const trigger = caseDetail.fir?.mandatory_forensic_triggered === true || caseDetail.fir?.mandatory_forensic_triggered === 'true'
                          return (
                            <>
                              <div style={S.timelineDot(trigger ? 'var(--text-primary)' : 'var(--text-muted)')} />
                              <div style={S.timelineLabel}>
                                Forensic examination {trigger ? 'mandated' : 'not required'}
                              </div>
                              {trigger && <div style={S.timelineSub}>BNSS Sec. 176</div>}
                            </>
                          )
                        })()}
                      </div>

                      {/* Event 3: Accused profiles from MO */}
                      {caseDetail.accused?.map((ac, idx) => {
                        const mo = caseDetail.moRecords?.find(m => m.offender_uid === ac.offender_uid)
                        return (
                          <div key={`accused-${idx}`} style={S.timelineEvent}>
                            <div style={S.timelineDot('var(--text-primary)')} />
                            <div style={S.timelineLabel}>Accused identified: {ac.full_name}</div>
                            {mo && (
                              <div style={S.timelineSub}>
                                {mo.crime_category} {mo.instrument_used && `via ${mo.instrument_used}`}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Event 4: Forensic evidence log */}
                      {caseDetail.forensicEvidence?.map((fe, idx) => (
                        <div key={`ev-${idx}`} style={S.timelineEvent}>
                          <div style={S.timelineDot('#22d3ee')} />
                          <div style={S.timelineDate}>{formatDate(fe.seizure_datetime)}</div>
                          <div style={S.timelineLabel}>Evidence seized: {fe.evidence_type}</div>
                          <div style={S.timelineSub}>
                            {fe.evidence_description_text && fe.evidence_description_text.length > 60
                              ? `${fe.evidence_description_text.slice(0, 60)}...`
                              : fe.evidence_description_text}
                          </div>
                          {fe.fsL_report_status && (
                            <span
                              style={{
                                ...S.badge(
                                  fe.fsL_report_status === 'RECEIVED' ? 'rgba(34,211,238,0.1)' : 'rgba(245, 158, 11,0.1)',
                                  fe.fsL_report_status === 'RECEIVED' ? '#22d3ee' : 'var(--text-primary)'
                                ),
                                display: 'inline-block',
                                marginTop: '4px'
                              }}
                            >
                              FSL: {fe.fsL_report_status}
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Event 5: Chargesheet deadline */}
                      <div style={S.timelineEvent}>
                        {(() => {
                          const timeline = caseDetail.bnssTimeline || {}
                          const daysRem = parseInt(timeline.daysRemaining)
                          const color = timeline.isBreached ? 'var(--red)' : daysRem < 30 ? 'var(--text-primary)' : '#22c55e'
                          return (
                            <>
                              <div style={S.timelineDot(color)} />
                              <div style={S.timelineDate}>{formatDate(timeline.deadlineDate)}</div>
                              <div style={S.timelineLabel}>Chargesheet deadline (BNSS Sec. 193)</div>
                              {timeline.isBreached ? (
                                <div style={{ ...S.timelineSub, color: 'var(--red)', fontWeight: 600 }}>
                                  ⚠ {t('si.deadlineBreached').toUpperCase()}
                                </div>
                              ) : (
                                <div style={S.timelineSub}>
                                  {timeline.daysRemaining} {t('si.daysRemaining')}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {/* Event 6: Chargesheet filed */}
                      {caseDetail.bnssTimeline?.chargesheetFiled && (
                        <div style={S.timelineEvent}>
                          <div style={S.timelineDot('#22c55e')} />
                          <div style={S.timelineDate}>{formatDate(caseDetail.bnssTimeline.chargesheetFiled)}</div>
                          <div style={S.timelineLabel}>Chargesheet filed</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BNSS Compliance Panel */}
                  <div style={S.compliancePanel(caseDetail.bnssTimeline?.isBreached)}>
                    <div style={S.complianceTitle}>{t('si.bnssCompliance')} (Section 193)</div>
                    <div
                      style={{
                        ...S.complianceStatus,
                        color: caseDetail.bnssTimeline?.isBreached ? 'var(--red)' : '#22c55e'
                      }}
                    >
                      {caseDetail.bnssTimeline?.isBreached ? (
                        <>
                          <XCircle size={16} />
                          {t('si.deadlineBreached').toUpperCase()}
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          COMPLIANT
                        </>
                      )}
                    </div>
                    <div style={S.complianceGrid}>
                      <div style={S.complianceBox}>
                        <div style={S.complianceLabel}>Registered</div>
                        <div style={S.complianceValue}>
                          {formatDate(caseDetail.bnssTimeline?.registrationDate)}
                        </div>
                      </div>
                      <div style={S.complianceBox}>
                        <div style={S.complianceLabel}>Deadline (60d)</div>
                        <div style={S.complianceValue}>
                          {formatDate(caseDetail.bnssTimeline?.deadlineDate)}
                        </div>
                      </div>
                      <div style={S.complianceBox}>
                        <div style={S.complianceLabel}>Remaining</div>
                        <div
                          style={{
                            ...S.complianceValue,
                            color: caseDetail.bnssTimeline?.isBreached ? 'var(--red)' : 'var(--text-primary)'
                          }}
                        >
                          {caseDetail.bnssTimeline?.isBreached ? 'Exceeded' : `${caseDetail.bnssTimeline?.daysRemaining} days`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accused Section */}
                  <div style={S.section}>
                    <div style={S.sectionHeader}>
                      <Shield size={16} color="var(--text-primary)" />
                      {t('si.accused')}
                    </div>
                    {caseDetail.accused?.map((ac, idx) => {
                      const riskScore = parseFloat(ac.recidivism_risk_score) || 0
                      const mo = caseDetail.moRecords?.find(m => m.offender_uid === ac.offender_uid)
                      const bail = caseDetail.bailStatuses?.find(b => b.offender_uid === ac.offender_uid)

                      return (
                        <div key={idx} style={S.accusedCard}>
                          <div style={S.accusedHeader}>
                            <div>
                              <span style={S.accusedName}>{ac.full_name}</span>
                              {ac.alias_names && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                  ({ac.alias_names})
                                </span>
                              )}
                            </div>
                            {ac.gang_affiliation_text && (
                              <span style={S.badge('rgba(239,68,68,0.1)', 'var(--red)')}>
                                {ac.gang_affiliation_text}
                              </span>
                            )}
                          </div>

                          <div style={S.accusedRisk}>
                            <div style={S.accusedRiskText}>
                              <span>Recidivism risk score</span>
                              <span style={{ color: 'var(--text-primary)' }}>{(riskScore * 100).toFixed(0)}%</span>
                            </div>
                            <div style={S.accusedRiskTrack}>
                              <div style={S.accusedRiskFill(riskScore)} />
                            </div>
                          </div>

                          {mo && (
                            <div style={S.accusedMO}>
                              <strong>Modus Operandi:</strong> {mo.crime_category || 'Unknown'} (Sub: {mo.crime_subcategory}). entry: {mo.entry_method || 'unknown'}, exit: {mo.escape_method || 'unknown'}. instrument: {mo.instrument_used || 'none'}.
                              {mo.property_stolen_value_inr > 0 && ` Stolen value: ₹${parseFloat(mo.property_stolen_value_inr).toLocaleString('en-IN')}`}
                            </div>
                          )}

                          <div style={S.accusedFooter}>
                            <div>
                              {bail ? (
                                <span
                                  style={S.badge(
                                    bail.current_status === 'In Custody' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                    bail.current_status === 'In Custody' ? 'var(--red)' : '#22c55e'
                                  )}
                                >
                                  {bail.current_status} {bail.court_name && `(${bail.court_name})`}
                                </span>
                              ) : (
                                <span style={S.badge('var(--border-default)', 'var(--text-muted)')}>Status Unknown</span>
                              )}
                            </div>
                            <button
                              style={S.accusedLink}
                              onClick={() => {
                                navigate('/dashboard/offenders', {
                                  state: { selectedUid: ac.offender_uid }
                                })
                              }}
                            >
                              View full profile →
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {(!caseDetail.accused || caseDetail.accused.length === 0) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No accused profiles linked to this case record
                      </div>
                    )}
                  </div>

                  {/* Forensic Evidence section */}
                  {caseDetail.forensicEvidence?.length > 0 && (
                    <div style={S.section}>
                      <div style={S.sectionHeader}>
                        <Fingerprint size={16} color="#22d3ee" />
                        {t('si.forensic')}
                      </div>
                      {caseDetail.forensicEvidence.map((fe, idx) => {
                        let statusColor = 'var(--text-primary)'
                        let statusBg = 'rgba(245, 158, 11,0.1)'
                        if (fe.fsL_report_status === 'RECEIVED') {
                          statusColor = '#38bdf8'
                          statusBg = 'rgba(56,189,248,0.1)'
                        } else if (fe.fsL_report_status === 'POSITIVE') {
                          statusColor = '#22d3ee'
                          statusBg = 'rgba(34,211,238,0.1)'
                        } else if (fe.fsL_report_status === 'INCONCLUSIVE') {
                          statusColor = 'var(--text-muted)'
                          statusBg = 'rgba(113,113,122,0.1)'
                        }

                        return (
                          <div key={idx} style={S.evidenceCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {fe.evidence_type}
                              </span>
                              <span style={S.badge(statusBg, statusColor)}>{fe.fsL_report_status}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {fe.evidence_description_text}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                              Seized: {formatDate(fe.seizure_datetime)} from {fe.seized_from_person || 'unknown'} · Location: {fe.storage_location}
                            </div>
                            {fe.chain_of_custody_log && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                                <strong>Custody trace:</strong> {fe.chain_of_custody_log}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Investigation Leads */}
                  <div style={S.section}>
                    <div style={S.sectionHeader}>
                      <TrendingUp size={16} color="#fb923c" />
                      {t('si.leads')}
                    </div>
                    {caseDetail.investigativeLeads?.map((l, idx) => {
                      let pColor = '#a78bfa'
                      let pBg = 'rgba(167,139,250,0.1)'
                      if (l.priority === 'CRITICAL') {
                        pColor = 'var(--red)'
                        pBg = 'rgba(239,68,68,0.1)'
                      } else if (l.priority === 'HIGH') {
                        pColor = 'var(--text-primary)'
                        pBg = 'rgba(245, 158, 11,0.1)'
                      }

                      return (
                        <div key={idx} style={{ ...S.leadCard, borderLeftColor: pColor }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={S.badge(pBg, pColor)}>{l.priority}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.type}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.lead}</div>
                          <div style={S.leadAction}>Recommended: {l.action}</div>
                        </div>
                      )
                    })}
                    {(!caseDetail.investigativeLeads || caseDetail.investigativeLeads.length === 0) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No specific leads generated for this case
                      </div>
                    )}
                  </div>

                  {/* Similar Cases */}
                  <div style={S.section}>
                    <div style={S.sectionHeader}>
                      <LinkIcon size={16} color="#fb7185" />
                      {t('si.similar')}
                    </div>
                    {caseDetail.similarCases?.map((c, idx) => (
                      <div key={idx} style={S.similarCard} onClick={() => fetchCaseDetail(c.fir_uid)}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {c.fir_uid}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {c.district_name} · {formatDate(c.fir_registration_datetime)}
                          </div>
                        </div>
                        <span style={S.badge('rgba(251,113,133,0.1)', '#fb7185')}>{c.bns_primary_section}</span>
                      </div>
                    ))}
                    {(!caseDetail.similarCases || caseDetail.similarCases.length === 0) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No similar cases found for section {caseDetail.fir?.bns_primary_section}
                      </div>
                    )}
                  </div>

                  {/* BSA Section 63 Integrity verification footer */}
                  {caseDetail.integrityHash && (
                    <div style={S.bsaFooter}>
                      <CheckCircle size={16} color="#22c55e" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t('si.integrity')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          BSA Sec 63 blockchain audit validation · SHA-256 chain intact
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {caseDetail.integrityHash.slice(0, 20)}...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
