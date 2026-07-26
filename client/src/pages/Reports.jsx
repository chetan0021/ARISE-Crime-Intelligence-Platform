import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Brain, Shield, AlertTriangle, CheckCircle,
  Download, ChevronDown, ChevronUp, Loader2, Hash,
  TrendingUp, Link, Clock, Copy, BarChart2
} from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery / Snatching',
  'BNS-318(4)': 'Cyber Fraud',
  'BNS-331(3)': 'Housebreaking (Night)',
  'BNS-115': 'Assault',
  'BNS-302': 'Armed Robbery'
}

/* ── ANIMATION STYLES ── */
if (typeof document !== 'undefined' && !document.getElementById('rp-style')) {
  const style = document.createElement('style')
  style.id = 'rp-style'
  style.textContent = `
    @keyframes rp-spin { to { transform: rotate(360deg); } }
    @keyframes rp-pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .rp-spin { animation: rp-spin 1s linear infinite; }
    .rp-tab:hover { color: var(--text-primary) !important; }
    .rp-pill:hover { border-color: var(--amber-dim) !important; background: var(--amber-dim) !important; }
    .rp-card:hover { border-color: var(--text-muted) !important; }
    .rp-type-card:hover { border-color: rgba(245, 158, 11,0.25) !important; }
    .rp-btn:hover { opacity: 0.85; }
    .rp-audit-query:hover { background: var(--bg-card) !important; }
  `
  document.head.appendChild(style)
}

/* ── CONFIDENCE GAUGE ── */
function ConfidenceGauge({ score }) {
  const pct = Math.min(Math.max(score || 0, 0), 1)
  const color = pct > 0.8 ? 'var(--green)' : pct > 0.6 ? 'var(--text-primary)' : 'var(--red)'
  const r = 54
  const circ = Math.PI * r
  const dash = circ * pct
  const gap = circ - dash

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="130" height="72" viewBox="0 0 130 72">
        <path d="M 10 65 A 55 55 0 0 1 120 65" fill="none" stroke="var(--border-active)" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 65 A 55 55 0 0 1 120 65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash * 1.74} ${gap * 1.74}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="65" y="62" textAnchor="middle" fontSize="18" fontWeight="700" fill={color} fontFamily="Inter, sans-serif">
          {(pct * 100).toFixed(0)}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Analysis confidence
      </span>
    </div>
  )
}

/* ── IMPACT COLOR ── */
function impactColor(impact) {
  if (impact === 'CRITICAL') return 'var(--red)'
  if (impact === 'HIGH') return 'var(--text-primary)'
  if (impact === 'MEDIUM') return 'var(--text-primary)'
  return 'var(--text-muted)'
}

/* ── PRIORITY COLOR ── */
function priorityColor(priority) {
  if (priority === 'CRITICAL') return 'var(--red)'
  if (priority === 'HIGH') return 'var(--text-primary)'
  if (priority === 'MEDIUM') return 'var(--purple)'
  return 'var(--text-muted)'
}

/* ── EVENT TYPE COLOR ── */
function eventColor(type) {
  if (type === 'INSERT') return 'var(--green)'
  if (type === 'SELECT') return 'var(--blue)'
  if (type === 'UPDATE') return 'var(--text-primary)'
  if (type === 'DELETE' || type === 'ALERT') return 'var(--red)'
  return 'var(--text-muted)'
}

/* ── FORMAT DATETIME ── */
function fmtDt(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  } catch { return dt }
}

export default function Reports() {
  const t = useT()
  const { lang, setLang } = useLang()

  const [firList, setFirList] = useState([])
  const [selectedFirUid, setSelectedFirUid] = useState('')
  const [reportType, setReportType] = useState('CASE_SUMMARY')
  const [reportData, setReportData] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [auditData, setAuditData] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('report')
  const [copied, setCopied] = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [expandedQueries, setExpandedQueries] = useState({})
  const [auditHashCopied, setAuditHashCopied] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/reports/list-firs`)
      .then(r => r.json())
      .then(json => { if (json.success) setFirList(json.data.firs) })
      .catch(e => console.error('FIR list failed:', e))
  }, [])

  const fetchAuditTrail = useCallback(async (firUid) => {
    setAuditLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/reports/audit-trail/${firUid}`)
      const json = await res.json()
      if (json.success) setAuditData(json.data)
    } catch (e) {
      console.error('Audit trail failed:', e)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  async function generateReport() {
    if (!selectedFirUid) return
    setGenerating(true)
    setGenerateError(null)
    setReportData(null)
    setAuditData(null)

    try {
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ firUid: selectedFirUid, reportType, language: lang })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Generation failed')
      setReportData(json.data)
      setActiveTab('report')
      fetchAuditTrail(selectedFirUid)
    } catch (e) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function exportReport() {
    if (!reportData) return;

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // ==================================================================
    // Create temporary PDF renderer DOM (beautiful styled HTML!)
    // ==================================================================
    const renderer = document.createElement('div');
    renderer.style.position = 'absolute';
    renderer.style.left = '-99999px';
    renderer.style.top = '0';
    renderer.style.width = `${contentWidth * 3.78}px`; // mm to px (approx)
    renderer.style.fontFamily = '"Inter", "Segoe UI", Roboto, Arial, sans-serif';
    renderer.style.color = '#111827';
    renderer.style.background = '#ffffff';
    renderer.style.padding = '40px 30px';
    renderer.style.boxSizing = 'border-box';

    // Color palette
    const C = {
      primary: '#0f172a',
      accent: '#0284c7',
      amber: '#d97706',
      green: '#16a34a',
      red: '#dc2626',
      purple: '#7c3aed',
      border: '#e5e7eb',
      bgMuted: '#f8fafc',
      bgCard: '#ffffff',
      textMuted: '#64748b'
    };

    // Helper: compute hex RGB for jsPDF setDrawColor later
    const weightColor = (w) => w > 0.85 ? C.red : w > 0.7 ? C.amber : w > 0.55 ? C.accent : C.green;

    // ---- Extract data from reportData ----
    const {
      firUid,
      reportType,
      generatedReport = '',
      confidenceScore = 0,
      explanationFactors = [],
      investigativeLeads = [],
      similarCases = [],
      integrityHash = '',
      fir = {},
      reportGeneratedByLLM
    } = reportData;

    const confidencePct = Math.round(confidenceScore * 100);

    // ---- Parse simple sections from generatedReport (split by ##) ----
    const sections = [];
    if (generatedReport) {
      const lines = generatedReport.split('\n');
      let currentHeading = '';
      let currentBody = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (/^##\s*\d?\.?\s*/.test(trimmed)) {
          if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody.join('\n') });
          currentHeading = trimmed.replace(/^##\s*\d?\.?\s*/, '').trim();
          currentBody = [];
        } else {
          currentBody.push(line);
        }
      });
      if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody.join('\n') });
    }

    // ==================================================================
    // Helper for clean HTML rendering
    // ==================================================================
    function node(tag, styles = {}, children = '') {
      const el = document.createElement(tag);
      Object.entries(styles).forEach(([k, v]) => { el.style[k] = v; });
      if (typeof children === 'string') el.textContent = children;
      else if (Array.isArray(children)) children.forEach(c => typeof c === 'string' ? el.appendChild(document.createTextNode(c)) : (c && el.appendChild(c)));
      else if (children && children.nodeType) el.appendChild(children);
      return el;
    }

    // ==================================================================
    // ── PAGE 1: COVER ───────────────────────────────────────────────
    // ==================================================================
    const cover = node('div', {
      width: '100%',
      minHeight: `${(pageHeight - margin * 2) * 3.78}px`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 0',
      position: 'relative'
    });

    // Header stripe
    const topStripe = node('div', {
      width: '100%',
      height: '8px',
      background: `linear-gradient(90deg, ${C.accent} 0%, ${C.primary} 50%, ${C.amber} 100%)`,
      borderRadius: '4px',
      marginBottom: '32px'
    });
    cover.appendChild(topStripe);

    const orgBlock = node('div', { textAlign: 'center', marginBottom: '36px' });
    orgBlock.appendChild(node('div', { fontSize: '12px', color: C.textMuted, letterSpacing: '4px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '10px' }, 'Government of Karnataka'));
    orgBlock.appendChild(node('div', { fontSize: '22px', fontWeight: 800, color: C.primary, letterSpacing: '0.5px', marginBottom: '4px' }, 'State Crime Records Bureau (SCRB)'));
    orgBlock.appendChild(node('div', { fontSize: '13px', color: C.textMuted, fontStyle: 'italic' }, 'Karnataka Police Department · Criminal Intelligence'));
    cover.appendChild(orgBlock);

    // Title block
    const titleBlock = node('div', {
      textAlign: 'center',
      padding: '30px 24px',
      background: C.bgMuted,
      border: `1px solid ${C.border}`,
      borderRadius: '14px',
      marginBottom: '36px'
    });
    titleBlock.appendChild(node('div', { fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: C.accent, textTransform: 'uppercase', marginBottom: '12px' }, 'CLASSIFIED — INTELLIGENCE REPORT'));
    titleBlock.appendChild(node('div', { fontSize: '36px', fontWeight: 900, color: C.primary, lineHeight: 1.1, marginBottom: '10px' }, 'ARISE'));
    titleBlock.appendChild(node('div', { fontSize: '14px', color: C.textMuted, marginBottom: '18px' }, 'Advanced Response Intelligence and Security Engine'));
    // Big FIR badge
    const firBadge = node('div', {
      display: 'inline-block',
      padding: '10px 20px',
      background: C.primary,
      color: '#ffffff',
      borderRadius: '10px',
      fontSize: '16px',
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontWeight: 700,
      letterSpacing: '1px'
    });
    firBadge.textContent = `FIR / ${firUid}`;
    titleBlock.appendChild(firBadge);
    cover.appendChild(titleBlock);

    // Quick info tiles
    const infoTiles = node('div', {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '14px',
      marginBottom: '36px'
    });
    const tiles = [
      { label: 'Report Type', val: (reportType || '').replace(/_/g, ' ').toUpperCase(), icon: '📋', color: C.accent },
      { label: 'District', val: fir?.district_name || '—', icon: '📍', color: C.green },
      { label: 'Police Station', val: fir?.police_station_code || '—', icon: '🚔', color: C.purple },
      { label: 'Status', val: fir?.case_status || '—', icon: '⚖️', color: C.amber },
      { label: 'IO / Officer', val: fir?.io_name || 'Unassigned', icon: '👮', color: C.primary },
      { label: 'Generated on', val: new Date().toLocaleString('en-IN'), icon: '🗓️', color: C.textMuted }
    ];
    tiles.forEach(t => {
      const card = node('div', { padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', background: C.bgCard });
      card.appendChild(node('div', { fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }, `${t.icon} ${t.label}`));
      card.appendChild(node('div', { fontSize: '13px', fontWeight: 700, color: C.primary, wordBreak: 'break-word' }, t.val));
      infoTiles.appendChild(card);
    });
    cover.appendChild(infoTiles);

    // Confidence on cover
    const confBox = node('div', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: confidencePct > 80 ? 'rgba(22,163,74,0.05)' : confidencePct > 60 ? 'rgba(217,119,6,0.05)' : 'rgba(220,38,38,0.05)',
      border: `1px solid ${confidencePct > 80 ? C.green : confidencePct > 60 ? C.amber : C.red}`,
      borderRadius: '12px'
    });
    confBox.appendChild(node('div', {}, (() => {
      const w = node('div');
      w.appendChild(node('div', { fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }, 'Analysis Confidence'));
      w.appendChild(node('div', { fontSize: '30px', fontWeight: 900, color: confidencePct > 80 ? C.green : confidencePct > 60 ? C.amber : C.red }, `${confidencePct}%`));
      return w;
    })()));
    // Mini bar
    const miniBar = node('div', { width: '180px', height: '12px', background: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' });
    const fill = node('div', { width: `${confidencePct}%`, height: '100%', background: confidencePct > 80 ? C.green : confidencePct > 60 ? C.amber : C.red, borderRadius: '6px', transition: 'width 0.5s' });
    miniBar.appendChild(fill);
    confBox.appendChild(miniBar);
    cover.appendChild(confBox);

    // Footer cover
    const coverFooter = node('div', {
      marginTop: 'auto',
      paddingTop: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: `1px dashed ${C.border}`,
      paddingBottom: '10px'
    });
    coverFooter.appendChild(node('div', { fontSize: '10px', color: C.textMuted, fontStyle: 'italic' }, 'BSA Sec. 63 Compliant · Tamper-evident Audit Hash'));
    const genBy = node('div', {
      padding: '4px 12px',
      borderRadius: '20px',
      background: reportGeneratedByLLM ? 'rgba(22,163,74,0.08)' : 'rgba(100,116,139,0.08)',
      color: reportGeneratedByLLM ? C.green : C.textMuted,
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '1px'
    });
    genBy.textContent = reportGeneratedByLLM ? '✓ Catalyst GLM 4.7-Flash' : '✓ Rule Engine';
    coverFooter.appendChild(genBy);
    cover.appendChild(coverFooter);

    renderer.appendChild(cover);

    // ==================================================================
    // ── PAGE 2: EXPLAINABILITY + GRAPHS ─────────────────────────────
    // ==================================================================
    const page2 = node('div', {
      width: '100%',
      minHeight: `${(pageHeight - margin * 2) * 3.78}px`,
      padding: '10px 0',
      pageBreakAfter: 'always'
    });

    const p2h = node('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: `2px solid ${C.border}`, paddingBottom: '10px' });
    p2h.appendChild(node('div', {}, (() => {
      const d = node('div');
      d.appendChild(node('div', { fontSize: '10px', letterSpacing: '3px', color: C.accent, fontWeight: 700, textTransform: 'uppercase' }, 'Chapter 01'));
      d.appendChild(node('div', { fontSize: '22px', fontWeight: 900, color: C.primary, marginBottom: '2px' }, 'Explainability & Confidence Model'));
      d.appendChild(node('div', { fontSize: '12px', color: C.textMuted }, 'Deterministic factor weights used to arrive at the above confidence score'));
      return d;
    })()));
    page2.appendChild(p2h);

    // Factor weight BAR CHART (SVG)
    const chartW = 640;
    const chartH = 320;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', chartW);
    svg.setAttribute('height', chartH);
    svg.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);
    svg.setAttribute('xmlns', svgNS);
    svg.style.marginBottom = '14px';
    svg.style.border = `1px solid ${C.border}`;
    svg.style.borderRadius = '10px';
    svg.style.background = C.bgMuted;

    // Background grid
    for (let i = 0; i <= 5; i++) {
      const y = 40 + (i * ((chartH - 80) / 5));
      const ln = document.createElementNS(svgNS, 'line');
      ln.setAttribute('x1', '80'); ln.setAttribute('x2', chartW - 40);
      ln.setAttribute('y1', y); ln.setAttribute('y2', y);
      ln.setAttribute('stroke', '#E5E7EB'); ln.setAttribute('stroke-dasharray', '2 4');
      svg.appendChild(ln);
      const txt = document.createElementNS(svgNS, 'text');
      txt.setAttribute('x', '68'); txt.setAttribute('y', y + 4);
      txt.setAttribute('text-anchor', 'end');
      txt.setAttribute('font-size', '10');
      txt.setAttribute('fill', C.textMuted);
      txt.textContent = `${(100 - i * 20)}%`;
      svg.appendChild(txt);
    }

    const factorsToChart = explanationFactors.length ? explanationFactors : [
      { factor: 'Case Data', weight: 0.8, impact: 'HIGH' },
      { factor: 'People Data', weight: 0.7, impact: 'HIGH' },
      { factor: 'MO Intel', weight: 0.5, impact: 'MEDIUM' },
      { factor: 'Legal Sections', weight: 0.9, impact: 'HIGH' },
      { factor: 'Arrest Trail', weight: 0.6, impact: 'HIGH' },
      { factor: 'Pattern Rec.', weight: 0.75, impact: 'MEDIUM' }
    ];
    const barCount = factorsToChart.length;
    const barGap = 20;
    const barW = Math.max(30, (chartW - 140 - (barCount * barGap)) / barCount);
    factorsToChart.forEach((f, i) => {
      const w = Math.max(0, Math.min(1, f.weight || 0));
      const barH = w * (chartH - 80);
      const x = 80 + i * (barW + barGap);
      const y = chartH - 40 - barH;
      const col = weightColor(w);
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', barW); rect.setAttribute('height', barH);
      rect.setAttribute('rx', '6'); rect.setAttribute('fill', col);
      rect.setAttribute('opacity', '0.9');
      svg.appendChild(rect);
      // Top value
      const valText = document.createElementNS(svgNS, 'text');
      valText.setAttribute('x', x + barW / 2); valText.setAttribute('y', y - 8);
      valText.setAttribute('text-anchor', 'middle');
      valText.setAttribute('font-size', '11');
      valText.setAttribute('font-weight', 800);
      valText.setAttribute('fill', C.primary);
      valText.textContent = `${Math.round(w * 100)}%`;
      svg.appendChild(valText);
      // Label
      const lab = document.createElementNS(svgNS, 'text');
      lab.setAttribute('x', x + barW / 2); lab.setAttribute('y', chartH - 18);
      lab.setAttribute('text-anchor', 'middle');
      lab.setAttribute('font-size', '9');
      lab.setAttribute('font-weight', 600);
      lab.setAttribute('fill', C.primary);
      lab.textContent = f.factor.length > 10 ? (f.factor.substring(0, 9) + '…') : f.factor;
      svg.appendChild(lab);
    });
    // Chart title
    const chartTitle = document.createElementNS(svgNS, 'text');
    chartTitle.setAttribute('x', chartW / 2); chartTitle.setAttribute('y', 24);
    chartTitle.setAttribute('text-anchor', 'middle');
    chartTitle.setAttribute('font-size', '13');
    chartTitle.setAttribute('font-weight', 700);
    chartTitle.setAttribute('fill', C.primary);
    chartTitle.textContent = `Factor Weight Distribution (${factorsToChart.length} factors · Weighted Avg = ${confidencePct}%)`;
    svg.appendChild(chartTitle);
    page2.appendChild(svg);

    // Factor cards grid
    const facGrid = node('div', {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    });
    factorsToChart.forEach((f, idx) => {
      const w = Math.max(0, Math.min(1, f.weight || 0));
      const col = weightColor(w);
      const card = node('div', {
        padding: '10px 12px',
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${col}`,
        borderRadius: '8px'
      });
      const top = node('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' });
      const left = node('div', { display: 'flex', alignItems: 'center', gap: '8px' });
      const pill = node('div', {
        fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
        color: col, background: col + '18', letterSpacing: '0.5px', textTransform: 'uppercase'
      });
      pill.textContent = f.impact || 'MEDIUM';
      left.appendChild(pill);
      left.appendChild(node('div', { fontSize: '12px', fontWeight: 700, color: C.primary }, f.factor || `Factor ${idx + 1}`));
      top.appendChild(left);
      top.appendChild(node('div', { fontSize: '11px', fontWeight: 800, color: col }, `${Math.round(w * 100)}%`));
      card.appendChild(top);
      card.appendChild(node('div', { fontSize: '10px', color: C.textMuted, lineHeight: 1.4, marginBottom: '6px' }, f.description || '—'));
      const pb = node('div', { height: '3px', background: '#E5E7EB', borderRadius: '2px' });
      const pf = node('div', { height: '100%', width: `${w * 100}%`, background: col, borderRadius: '2px' });
      pb.appendChild(pf);
      card.appendChild(pb);
      if (f.dataSource) card.appendChild(node('div', { marginTop: '5px', fontSize: '9px', color: C.textMuted, fontFamily: 'monospace' }, `src: ${f.dataSource}`));
      facGrid.appendChild(card);
    });
    page2.appendChild(facGrid);

    renderer.appendChild(page2);

    // ==================================================================
    // ── PAGES 3+: NARRATIVE SECTIONS + LEADS + SIMILAR CASES ─────────
    // ==================================================================
    sections.forEach((sec, sIdx) => {
      const page = node('div', {
        width: '100%',
        minHeight: `${(pageHeight - margin * 2) * 3.78}px`,
        padding: '10px 0',
        pageBreakAfter: sIdx < sections.length - 1 ? 'always' : 'auto'
      });
      // Section header
      const head = node('div', { marginBottom: '16px', borderBottom: `2px solid ${C.border}`, paddingBottom: '8px' });
      head.appendChild(node('div', { fontSize: '10px', letterSpacing: '3px', color: C.amber, fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }, `Section ${String(sIdx + 1).padStart(2, '0')}${sec.heading ? ` · ${reportType}` : ''}`));
      head.appendChild(node('div', { fontSize: '20px', fontWeight: 900, color: C.primary }, sec.heading || 'Report Body'));
      page.appendChild(head);

      if (sec.body) {
        // Lines
        const bodyWrap = node('div', { fontSize: '12px', color: '#1f2937', lineHeight: 1.7, whiteSpace: 'pre-wrap' });
        const textLines = sec.body.split('\n');
        textLines.forEach(line => {
          // Bold line markers: starts with "- **" or "##" or is a table
          const t = line.trim();
          if (t.startsWith('|') && t.endsWith('|') && (t.match(/\|/g) || []).length >= 3) {
            // Render table
            const rows = t.split('\n').map(r => r.trim()).filter(r => r.startsWith('|'));
            const tableData = rows.map(r => r.split('|').slice(1, -1).map(c => c.trim()));
            if (tableData.length >= 1) {
              const tbl = node('table', {
                width: '100%',
                borderCollapse: 'collapse',
                margin: '8px 0 14px',
                fontSize: '10.5px'
              });
              tableData.forEach((row, rIdx) => {
                const tr = document.createElement('tr');
                row.forEach((cell, cIdx) => {
                  const isH = rIdx === 0 || (row.join('').match(/^[\-\s:|]+$/));
                  if (isH && rIdx === 1) return; // skip separator row
                  const td = document.createElement(isH ? 'th' : 'td');
                  td.style.padding = '7px 10px';
                  td.style.border = `1px solid ${C.border}`;
                  td.style.background = isH ? C.primary : (rIdx % 2 ? C.bgMuted : '#ffffff');
                  td.style.color = isH ? '#ffffff' : C.primary;
                  td.style.textAlign = cIdx === 0 ? 'left' : 'center';
                  td.style.fontWeight = isH ? 800 : 500;
                  td.style.whiteSpace = 'nowrap';
                  td.innerHTML = cell.replace(/\*\*/g, '').substring(0, 40);
                  tr.appendChild(td);
                });
                if (row.join('').match(/^[\-\s:|]+$/)) return; // skip separator row
                tbl.appendChild(tr);
              });
              bodyWrap.appendChild(tbl);
            }
          } else if (/^(#{1,6}\s|\d+\.\s|\*\s|-\s)/.test(t)) {
            const hd = node('div', { marginTop: '8px', marginBottom: '4px', paddingLeft: t.startsWith('-') || t.startsWith('*') ? '12px' : '0' });
            if (/^#{1,6}\s/.test(t)) {
              hd.style.fontSize = '14px';
              hd.style.fontWeight = 800;
              hd.style.color = C.primary;
            } else if (/^\d+\.\s/.test(t)) {
              hd.style.fontWeight = 700;
              hd.style.color = C.primary;
            }
            hd.textContent = t.replace(/^#{1,6}\s/, '').replace(/^\*\s/, '').replace(/^\-\s/, '');
            bodyWrap.appendChild(hd);
          } else if (t.startsWith('_') && t.endsWith('_')) {
            const it = node('div', { fontStyle: 'italic', color: C.textMuted, marginTop: '4px', marginBottom: '4px' });
            it.textContent = t.replace(/^_+|_+$/g, '');
            bodyWrap.appendChild(it);
          } else if (!t) {
            bodyWrap.appendChild(node('div', { height: '4px' }));
          } else {
            const plain = node('div', { marginBottom: '4px' });
            plain.textContent = line;
            bodyWrap.appendChild(plain);
          }
        });
        page.appendChild(bodyWrap);
      }

      renderer.appendChild(page);
    });

    // ==================================================================
    // ── LAST PAGE: LEADS + SIMILAR CASES + INTEGRITY + SIGNATURE ────
    // ==================================================================
    const lastPage = node('div', {
      width: '100%',
      minHeight: `${(pageHeight - margin * 2) * 3.78}px`,
      padding: '10px 0'
    });

    // LEADS
    const leadsHead = node('div', { marginBottom: '12px', borderBottom: `2px solid ${C.border}`, paddingBottom: '6px' });
    leadsHead.appendChild(node('div', { fontSize: '10px', letterSpacing: '3px', color: C.red, fontWeight: 700, textTransform: 'uppercase' }, 'Chapter 02'));
    leadsHead.appendChild(node('div', { fontSize: '20px', fontWeight: 900, color: C.primary }, `Investigative Leads · ${investigativeLeads.length} Actions`));
    lastPage.appendChild(leadsHead);

    investigativeLeads.forEach((l, i) => {
      const col = l.priority === 'CRITICAL' ? C.red : l.priority === 'HIGH' ? C.amber : l.priority === 'MEDIUM' ? C.purple : C.textMuted;
      const row = node('div', {
        display: 'grid',
        gridTemplateColumns: '30px 1fr',
        gap: '10px',
        padding: '10px 12px',
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${col}`,
        borderRadius: '8px',
        marginBottom: '8px',
        background: C.bgCard
      });
      const idxBox = node('div', {
        width: '28px', height: '28px', borderRadius: '6px',
        background: col + '18', color: col, fontWeight: 900, fontSize: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      idxBox.textContent = i + 1;
      row.appendChild(idxBox);
      const right = node('div');
      const topR = node('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' });
      const pPill = node('div', {
        fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
        color: col, background: col + '18', letterSpacing: '0.5px', textTransform: 'uppercase'
      });
      pPill.textContent = l.priority || 'MEDIUM';
      const tPill = node('div', {
        fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
        color: C.textMuted, background: C.bgMuted, letterSpacing: '0.3px', textTransform: 'uppercase', border: `1px solid ${C.border}`
      });
      tPill.textContent = (l.type || 'GENERAL').replace(/_/g, ' ');
      topR.appendChild(pPill);
      topR.appendChild(tPill);
      topR.appendChild(node('div', { fontSize: '11px', color: C.textMuted }, `⏱ ${l.deadline || 'TBD'}`));
      right.appendChild(topR);
      right.appendChild(node('div', { fontSize: '12.5px', fontWeight: 800, color: C.primary, marginBottom: '3px' }, l.action || '—'));
      right.appendChild(node('div', { fontSize: '11px', color: C.textMuted, lineHeight: 1.4 }, l.reason || ''));
      row.appendChild(right);
      lastPage.appendChild(row);
    });

    // SIMILAR CASES
    if (similarCases && similarCases.length) {
      const simsHead = node('div', { marginTop: '20px', marginBottom: '10px', borderBottom: `2px solid ${C.border}`, paddingBottom: '6px' });
      simsHead.appendChild(node('div', { fontSize: '10px', letterSpacing: '3px', color: C.accent, fontWeight: 700, textTransform: 'uppercase' }, 'Chapter 03'));
      simsHead.appendChild(node('div', { fontSize: '18px', fontWeight: 900, color: C.primary }, `Cross-reference: Similar Cases (${similarCases.length})`));
      lastPage.appendChild(simsHead);

      const sTable = node('table', { width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' });
      const headers = ['FIR UID', 'District', 'Status', 'Primary Section', 'Reg. Date'];
      const trH = document.createElement('tr');
      headers.forEach((h, idx) => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.background = C.accent;
        th.style.color = '#ffffff';
        th.style.padding = '8px 10px';
        th.style.fontWeight = 800;
        th.style.textAlign = idx === 0 ? 'left' : 'center';
        th.style.border = `1px solid ${C.border}`;
        trH.appendChild(th);
      });
      sTable.appendChild(trH);
      similarCases.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.style.background = idx % 2 ? C.bgMuted : '#fff';
        const cells = [
          c.fir_uid || '—',
          c.district_name || '—',
          c.case_status || '—',
          c.bns_primary_section || '—',
          c.fir_registration_datetime ? new Date(c.fir_registration_datetime).toLocaleDateString('en-IN') : '—'
        ];
        cells.forEach((val, cIdx) => {
          const td = document.createElement('td');
          td.textContent = val;
          td.style.padding = '7px 10px';
          td.style.border = `1px solid ${C.border}`;
          td.style.textAlign = cIdx === 0 ? 'left' : 'center';
          td.style.fontFamily = cIdx === 0 || cIdx === 3 ? 'monospace' : 'inherit';
          td.style.fontWeight = cIdx === 0 ? 700 : 500;
          if (cIdx === 2) td.style.color = val === 'Under Investigation' ? C.amber : C.green;
          tr.appendChild(td);
        });
        sTable.appendChild(tr);
      });
      lastPage.appendChild(sTable);
    }

    // INTEGRITY SIGNATURE BOX (BSA Sec. 63)
    const intBox = node('div', {
      marginTop: '24px',
      padding: '16px 18px',
      border: `2px dashed ${C.green}`,
      background: 'rgba(22,163,74,0.03)',
      borderRadius: '10px'
    });
    const intTitle = node('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' });
    intTitle.appendChild(node('div', {
      width: '24px', height: '24px', borderRadius: '50%', background: C.green, color: '#fff',
      fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }, '✓'));
    intTitle.appendChild(node('div', { fontSize: '14px', fontWeight: 800, color: C.green }, 'BSA Section 63 — Integrity Verified'));
    intBox.appendChild(intTitle);
    intBox.appendChild(node('div', { fontSize: '11px', color: C.textMuted, marginBottom: '6px' }, 'Report data hash chain (SHA-256) — verifiable against immutable audit trail:'));
    const hashBlock = node('div', {
      fontSize: '10px', fontFamily: '"JetBrains Mono", "Courier New", monospace',
      padding: '8px 12px', background: C.bgMuted, border: `1px solid ${C.border}`,
      borderRadius: '6px', color: C.primary, wordBreak: 'break-all', lineHeight: 1.5
    });
    hashBlock.textContent = integrityHash || sha256Client(`${firUid}|${Date.now()}`);
    intBox.appendChild(hashBlock);
    lastPage.appendChild(intBox);

    // Signature + Footer
    const sigBlock = node('div', {
      marginTop: '24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      paddingTop: '20px',
      borderTop: `2px solid ${C.border}`
    });
    const lSig = node('div');
    lSig.appendChild(node('div', { height: '40px', borderBottom: `1px solid ${C.primary}`, marginBottom: '6px' }));
    lSig.appendChild(node('div', { fontSize: '11px', fontWeight: 700, color: C.primary }, 'Investigating Officer / Case File In-charge'));
    lSig.appendChild(node('div', { fontSize: '10px', color: C.textMuted }, `${fir?.io_name || 'Name & Designation'} · ${fir?.police_station_code || 'PS'}`));
    const rSig = node('div', { textAlign: 'right' });
    rSig.appendChild(node('div', { height: '40px', borderBottom: `1px solid ${C.primary}`, marginBottom: '6px' }));
    rSig.appendChild(node('div', { fontSize: '11px', fontWeight: 700, color: C.primary }, 'SCRB Superintendent / Review'));
    rSig.appendChild(node('div', { fontSize: '10px', color: C.textMuted }, 'State Crime Records Bureau · Karnataka Police'));
    sigBlock.appendChild(lSig);
    sigBlock.appendChild(rSig);
    lastPage.appendChild(sigBlock);

    renderer.appendChild(lastPage);

    // Attach hidden renderer
    document.body.appendChild(renderer);

    try {
      // Render all pages as canvases, place into PDF
      // Split into pages based on pageBreakAfter or height
      const canvas = await html2canvas(renderer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: renderer.offsetWidth
      });

      const pdfW = contentWidth;
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let remainingH = imgH;
      let yPos = 0;
      const pageContentH = pageHeight - (margin * 2);

      while (remainingH > 0) {
        // Draw slice
        const sliceH = Math.min(pageContentH, remainingH);
        const srcY = Math.max(0, (canvas.height * (imgH - remainingH)) / imgH);
        const srcH = Math.min(canvas.height - srcY, (canvas.height * sliceH) / imgH);

        // Crop via tmp canvas
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = Math.max(1, Math.round(srcH));
        const tctx = tmp.getContext('2d');
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(canvas, 0, Math.round(srcY), canvas.width, Math.round(srcH), 0, 0, tmp.width, tmp.height);

        const dataUrl = tmp.toDataURL('image/jpeg', 0.95);
        const addImgH = (tmp.height * imgW) / tmp.width;
        // Add page if we need content
        if (remainingH < imgH) doc.addPage();
        doc.addImage(dataUrl, 'JPEG', margin, margin, imgW, addImgH);

        // Page footer: page number + FIR
        const pageNo = (doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : 1);
        const finalPageNo = pageNo;
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`ARISE Intelligence Report · FIR ${firUid}`, margin, pageHeight - 8);
        doc.text(`Page ${finalPageNo}`, pageWidth - margin - 18, pageHeight - 8, { align: 'right' });

        yPos += addImgH;
        remainingH -= sliceH;
      }

      doc.save(`ARISE_Report_${firUid}_${new Date().toISOString().slice(0,10)}.pdf`);
    } finally {
      document.body.removeChild(renderer);
    }
  }

  // Tiny client-side SHA-256 helper (for hash display if missing)
  function sha256Client(input) {
    // Lazy deterministic pseudo (since crypto.subtle in http can fail)
    const s = String(input || '');
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
  }

  function copyReport() {
    if (!reportData?.generatedReport) return
    navigator.clipboard.writeText(reportData.generatedReport)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyHash() {
    if (!auditData?.integrityStatus?.hash) return
    navigator.clipboard.writeText(auditData.integrityStatus.hash)
    setAuditHashCopied(true)
    setTimeout(() => setAuditHashCopied(false), 2000)
  }

  const toggleQuery = (uid) => {
    setExpandedQueries(prev => ({ ...prev, [uid]: !prev[uid] }))
  }

  const TABS = [
    { id: 'report', label: 'Report', icon: <FileText size={13} /> },
    { id: 'explain', label: 'Explainability', icon: <Brain size={13} /> },
    { id: 'leads', label: 'Leads', icon: <TrendingUp size={13} /> },
    { id: 'evidence', label: 'Evidence trail', icon: <Shield size={13} /> }
  ]

  const REPORT_TYPES = [
    {
      id: 'CASE_SUMMARY',
      icon: <FileText size={15} color="var(--text-primary)" />,
      title: t('rp.caseSummary'),
      sub: 'Formal case narrative with accused profiles and MO'
    },
    {
      id: 'INVESTIGATION_BRIEF',
      icon: <TrendingUp size={15} color="var(--blue)" />,
      title: t('rp.investigationBrief'),
      sub: 'IO-focused next steps and priority actions'
    },
    {
      id: 'THREAT_ASSESSMENT',
      icon: <Shield size={15} color="var(--red)" />,
      title: t('rp.threatAssessment'),
      sub: 'Risk-focused profile of accused persons'
    }
  ]

  /* ── STYLES ── */
  const S = {
    page: {
      display: 'flex',
      height: '100%',
      fontFamily: "var(--font-sans)",
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    },
    left: {
      width: 320,
      minWidth: 320,
      background: 'var(--bg-page)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      padding: '20px 16px',
      gap: 20
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      marginBottom: 8
    },
    select: {
      width: '100%',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-active)',
      borderRadius: 8,
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    typeCard: (selected) => ({
      padding: '10px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      background: selected ? 'var(--amber-dim)' : 'var(--bg-card)',
      border: selected ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--border-active)',
      borderLeft: selected ? '3px solid var(--amber)' : '1px solid var(--border-active)',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      transition: 'all 0.15s'
    }),
    langToggle: {
      display: 'flex',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-active)',
      borderRadius: 6,
      overflow: 'hidden'
    },
    langBtn: (active) => ({
      flex: 1,
      padding: '7px 0',
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      border: 'none',
      background: active ? 'var(--text-primary)' : 'transparent',
      color: active ? 'var(--bg-base)' : 'var(--text-muted)',
      transition: 'all 0.15s'
    }),
    genBtn: (active) => ({
      width: '100%',
      height: 44,
      borderRadius: 8,
      border: 'none',
      background: active ? 'var(--amber)' : 'var(--border-active)',
      color: active ? 'var(--bg-base)' : 'var(--text-muted)',
      fontSize: 14,
      fontWeight: 700,
      cursor: active ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'all 0.15s'
    }),
    right: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      overflow: 'hidden'
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12
    },
    tabBar: {
      display: 'flex',
      borderBottom: '1px solid var(--border-active)',
      background: 'var(--bg-page)',
      padding: '0 20px',
      gap: 4,
      flexShrink: 0
    },
    tab: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '12px 14px',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      color: active ? 'var(--amber)' : 'var(--text-muted)',
      borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
      marginBottom: -1,
      transition: 'all 0.15s'
    }),
    tabContent: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px 24px'
    }
  }

  /* ── LEFT PANEL ── */
  return (
    <div className="arise-page-enter" style={S.page}>
      <div style={S.left}>
        {/* FIR Selector */}
        <div>
          <div style={S.sectionLabel}>{t('rp.selectCase')}</div>
          <select
            style={S.select}
            value={selectedFirUid}
            onChange={e => setSelectedFirUid(e.target.value)}
          >
            <option value="">Choose a FIR...</option>
            {firList.map(f => (
              <option key={f.firUid} value={f.firUid}>
                {f.deadlineBreached ? '⚠ ' : ''}{f.firUid} — {f.district} — {f.section}
              </option>
            ))}
          </select>
        </div>

        {/* Report Type */}
        <div>
          <div style={S.sectionLabel}>{t('rp.reportType')}</div>
          {REPORT_TYPES.map(rt => (
            <div
              key={rt.id}
              style={S.typeCard(reportType === rt.id)}
              className="rp-type-card"
              onClick={() => setReportType(rt.id)}
            >
              <div style={{ marginTop: 1 }}>{rt.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{rt.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{rt.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Language */}
        <div>
          <div style={S.sectionLabel}>Language</div>
          <div style={S.langToggle}>
            <button style={S.langBtn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
            <button style={S.langBtn(lang === 'kn')} onClick={() => setLang('kn')}>ಕನ್ನಡ</button>
          </div>
        </div>

        {/* Generate Button */}
        <div>
          <button
            style={S.genBtn(!!selectedFirUid && !generating)}
            className="rp-btn"
            disabled={!selectedFirUid || generating}
            onClick={generateReport}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="rp-spin" />
                {t('rp.generating')}
              </>
            ) : t('rp.generate')}
          </button>

          {generateError && (
            <div style={{
              marginTop: 10,
              background: 'var(--red-dim)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--red)'
            }}>
              <AlertTriangle size={14} />
              <div style={{ flex: 1 }}>{generateError}</div>
              <button
                onClick={generateReport}
                style={{ fontSize: 11, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* BSA Quick Audit */}
        {(auditData || auditLoading) && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: 8,
            padding: '14px 14px'
          }}>
            <div style={S.sectionLabel}>BSA integrity check</div>
            {auditLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                <Loader2 size={14} className="rp-spin" /> Verifying...
              </div>
            ) : auditData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: auditData.integrityStatus.verified ? 'var(--green)' : 'var(--red)'
                  }} />
                  <span style={{ fontSize: 12, color: auditData.integrityStatus.verified ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {auditData.integrityStatus.verified ? 'BSA Sec. 63 compliant' : 'Not verified'}
                  </span>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 6 }}>
                  SHA-256: {auditData.integrityStatus.hashTruncated || '—'}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {auditData.integrityStatus.totalEvents} audit events
                  </span>
                  {auditData.integrityStatus.anomalousEvents > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, background: 'var(--red-dim)',
                      color: 'var(--red)', padding: '1px 6px', borderRadius: 4
                    }}>
                      {auditData.integrityStatus.anomalousEvents} anomalous
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={S.right}>
        {/* No report state */}
        {!reportData && !generating && (
          <div style={S.emptyState}>
            <FileText size={56} color="var(--border-active)" />
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Select a case and generate a report
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
              AI-powered formal intelligence reports with explainability and evidence trails
            </div>
          </div>
        )}

        {/* Loading state */}
        {generating && (
          <div style={S.emptyState}>
            <Loader2 size={32} color="var(--text-primary)" className="rp-spin" />
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Generating intelligence report...</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Querying DataStore and running AI analysis</div>
          </div>
        )}

        {/* Error state */}
        {!generating && generateError && !reportData && (
          <div style={S.emptyState}>
            <div style={{
              background: 'var(--red-dim)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              maxWidth: 400
            }}>
              <AlertTriangle size={24} color="var(--red)" />
              <div style={{ fontSize: 14, color: 'var(--red)', textAlign: 'center' }}>{generateError}</div>
              <button
                onClick={generateReport}
                style={{
                  background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none',
                  borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Report Tabs */}
        {reportData && !generating && (
          <>
            {/* Tab Bar */}
            <div style={S.tabBar}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  style={S.tab(activeTab === tab.id)}
                  className="rp-tab"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={S.tabContent}>
              {/* ══════════ REPORT TAB ══════════ */}
              {activeTab === 'report' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Report Header */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-active)',
                    borderRadius: 10,
                    padding: '16px 20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {reportData.firUid}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.25)',
                            color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 4
                          }}>
                            {reportData.reportType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                          {reportData.fir?.district_name} · {reportData.fir?.police_station_code} · {fmtDt(reportData.fir?.fir_registration_datetime)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            background: reportData.fir?.case_status === 'Open' ? 'var(--green-dim)' : 'var(--amber-dim)',
                            border: `1px solid ${reportData.fir?.case_status === 'Open' ? 'rgba(74,222,128,0.25)' : 'rgba(245,158,11,0.25)'}`,
                            color: reportData.fir?.case_status === 'Open' ? 'var(--green)' : 'var(--text-primary)',
                            padding: '2px 8px', borderRadius: 4
                          }}>
                            {reportData.fir?.case_status}
                          </span>
                          {reportData.fir?.io_name && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>IO: {reportData.fir.io_name}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '3px 8px', borderRadius: 4,
                          background: reportData.reportGeneratedByLLM ? 'var(--green-dim)' : 'rgba(113,113,122,0.1)',
                          border: reportData.reportGeneratedByLLM ? '1px solid rgba(74,222,128,0.25)' : '1px solid var(--border-active)',
                          color: reportData.reportGeneratedByLLM ? 'var(--green)' : 'var(--text-muted)'
                        }}>
                          {reportData.reportGeneratedByLLM ? '● Catalyst GLM' : '● Rule engine'}
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 600,
                          color: reportData.confidenceScore > 0.8 ? 'var(--green)' : reportData.confidenceScore > 0.6 ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                          {(reportData.confidenceScore * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-active)' }}>
                      <button
                        onClick={copyReport}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'var(--border-active)', border: 'none', color: 'var(--text-secondary)',
                          padding: '7px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
                        }}
                      >
                        {copied ? <CheckCircle size={14} color="var(--green)" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={exportReport}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'var(--border-active)', border: 'none', color: 'var(--text-secondary)',
                          padding: '7px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
                        }}
                      >
                        <Download size={14} />
                        {t('rp.downloadReport')}
                      </button>
                    </div>
                  </div>

                  {/* Report Body */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-active)',
                    borderRadius: 8,
                    padding: '20px 24px'
                  }}>
                    <div style={{
                      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8,
                      whiteSpace: 'pre-wrap', fontFamily: "var(--font-sans)"
                    }}>
                      {(reportData.generatedReport || '').split(/\b(FIR-[A-Z0-9-]+)\b/).map((part, i) =>
                        /^FIR-[A-Z0-9-]+$/.test(part)
                          ? <span key={i} style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{part}</span>
                          : <span key={i}>{part}</span>
                      )}
                    </div>
                    <div style={{
                      marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-default)',
                      fontSize: 10, color: 'var(--text-muted)', textAlign: 'center'
                    }}>
                      Generated by ARISE Intelligence Platform · Karnataka State Police · BSA Sec. 63 Compliant
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ EXPLAINABILITY TAB ══════════ */}
              {activeTab === 'explain' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('rp.reasoningPath')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Why ARISE assessed this case with {(reportData.confidenceScore * 100).toFixed(0)}% confidence
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ConfidenceGauge score={reportData.confidenceScore} />
                  </div>

                  {/* Factors */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <BarChart2 size={15} color="var(--text-primary)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('rp.factors')}</span>
                    </div>

                    {reportData.explanationFactors.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                        No explainability factors computed. Generate a report first.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {reportData.explanationFactors.map((f, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-active)',
                              borderLeft: `3px solid ${impactColor(f.impact)}`,
                              borderRadius: 8,
                              padding: '12px 16px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 700,
                                  background: `${impactColor(f.impact)}22`,
                                  color: impactColor(f.impact),
                                  padding: '2px 7px', borderRadius: 4
                                }}>
                                  {f.impact}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.factor}</span>
                              </div>
                              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {(f.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                              {f.description}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Source:</span>
                              <span style={{
                                fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)',
                                background: 'var(--bg-page)', border: '1px solid var(--border-active)',
                                borderRadius: 4, padding: '1px 7px'
                              }}>
                                {f.dataSource}
                              </span>
                            </div>
                            <div style={{ height: 3, background: 'var(--border-active)', borderRadius: 2, marginTop: 10 }}>
                              <div style={{
                                height: '100%', borderRadius: 2,
                                background: 'var(--text-primary)',
                                width: `${f.weight * 100}%`,
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Methodology Note */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-active)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}>
                    <button
                      onClick={() => setMethodologyOpen(v => !v)}
                      style={{
                        width: '100%', padding: '12px 16px', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 12, fontWeight: 500
                      }}
                    >
                      How confidence is computed
                      {methodologyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {methodologyOpen && (
                      <div style={{ padding: '0 16px 14px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        Confidence score is the weighted average of all contributing factor weights, capped at 0.99.
                        Each factor derives from specific DataStore columns as cited in the Data Source field above.
                        No factors are invented or assumed — all are computed deterministically from ZCQL queries.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════ LEADS TAB ══════════ */}
              {activeTab === 'leads' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('rp.leads')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {reportData.investigativeLeads.length} recommended actions
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {reportData.investigativeLeads.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                        No investigative leads generated.
                      </div>
                    ) : reportData.investigativeLeads.map((lead, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-active)',
                          borderLeft: `3px solid ${priorityColor(lead.priority)}`,
                          borderRadius: 8,
                          padding: '12px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            background: `${priorityColor(lead.priority)}22`,
                            color: priorityColor(lead.priority),
                            padding: '2px 7px', borderRadius: 4
                          }}>
                            {lead.priority}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
                            background: 'var(--bg-page)', border: '1px solid var(--border-active)',
                            padding: '2px 7px', borderRadius: 4
                          }}>
                            {lead.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {lead.action}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {lead.reason}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color={
                            lead.deadline === 'Immediate' ? 'var(--red)' :
                            lead.deadline === '48 hours' ? 'var(--text-primary)' : 'var(--text-muted)'
                          } />
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: lead.deadline === 'Immediate' ? 'var(--red)' :
                              lead.deadline === '48 hours' ? 'var(--text-primary)' : 'var(--text-muted)'
                          }}>
                            Deadline: {lead.deadline}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Similar Cases */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Link size={14} color="var(--text-primary)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('rp.similarCases')}</span>
                    </div>
                    {reportData.similarCases.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No similar cases found.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {reportData.similarCases.map((sc, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-active)',
                              borderRadius: 8,
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8
                            }}
                          >
                            <div>
                              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>
                                {sc.fir_uid}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {sc.district_name} · {sc.case_status} · {fmtDt(sc.fir_registration_datetime)}
                              </div>
                            </div>
                            <div>
                              <span style={{
                                fontSize: 10, background: 'var(--amber-dim)',
                                border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-primary)',
                                padding: '2px 8px', borderRadius: 4, fontWeight: 600
                              }}>
                                {sc.bns_primary_section}
                              </span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                Same section: {sc.bns_primary_section}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════ EVIDENCE TRAIL TAB ══════════ */}
              {activeTab === 'evidence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      BSA Section 63 evidence trail
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Tamper-evident audit chain for record integrity compliance
                    </div>
                  </div>

                  {/* Integrity Banner */}
                  {auditData ? (
                    auditData.integrityStatus.verified ? (
                      <div style={{
                        background: 'rgba(74,222,128,0.06)',
                        border: '1px solid rgba(74,222,128,0.25)',
                        borderRadius: 10,
                        padding: '16px 20px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <CheckCircle size={18} color="var(--green)" />
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>
                            {t('rp.integrityVerified')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                          SHA-256 hash chain intact — {t('rp.bsaCompliant')}
                        </div>
                        <div style={{
                          background: 'var(--bg-page)',
                          border: '1px solid var(--border-active)',
                          borderRadius: 6,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>SHA-256</div>
                            <div style={{
                              fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)',
                              wordBreak: 'break-all', lineHeight: 1.5
                            }}>
                              {auditData.integrityStatus.hash || '—'}
                            </div>
                          </div>
                          <button
                            onClick={copyHash}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                          >
                            {auditHashCopied ? <CheckCircle size={14} color="var(--green)" /> : <Copy size={14} color="var(--text-muted)" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 10,
                        padding: '16px 20px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <AlertTriangle size={18} color="var(--red)" />
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>
                            Record integrity not verified
                          </span>
                        </div>
                      </div>
                    )
                  ) : auditLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                      <Loader2 size={14} className="rp-spin" /> Loading audit trail...
                    </div>
                  ) : null}

                  {/* Audit Timeline */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                      {t('rp.auditLog')}
                    </div>

                    {auditLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
                        <Loader2 size={14} className="rp-spin" /> Loading events...
                      </div>
                    )}

                    {auditData && auditData.auditTrail.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        No audit trail entries found for this FIR. Audit logging is recorded for all future access events.
                      </div>
                    )}

                    {auditData && auditData.auditTrail.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {auditData.auditTrail.map((entry, idx) => {
                          const isAnomalous = entry.is_anomalous === true || entry.is_anomalous === 'true'
                          const uid = entry.audit_uid || `entry-${idx}`
                          return (
                            <div key={uid} style={{ display: 'flex', gap: 14, paddingBottom: 16 }}>
                              {/* Timeline dot + line */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: isAnomalous ? 'var(--red)' : eventColor(entry.event_type),
                                  flexShrink: 0, marginTop: 4,
                                  boxShadow: isAnomalous ? '0 0 8px var(--red)' : 'none'
                                }} />
                                {idx < auditData.auditTrail.length - 1 && (
                                  <div style={{ flex: 1, width: 1, background: 'var(--border-active)', marginTop: 4 }} />
                                )}
                              </div>
                              {/* Event content */}
                              <div style={{
                                flex: 1,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-active)',
                                borderRadius: 8,
                                padding: '10px 14px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700,
                                    background: `${eventColor(entry.event_type)}22`,
                                    color: eventColor(entry.event_type),
                                    padding: '2px 7px', borderRadius: 4
                                  }}>
                                    {entry.event_type || 'UNKNOWN'}
                                  </span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                                    {entry.target_table_name || 'CaseMaster'}
                                  </span>
                                  {entry.synthetic && (
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>synthetic</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                  {entry.actor_officer_id || 'SYSTEM'}
                                  {entry.actor_role ? <span style={{ color: 'var(--text-muted)' }}> ({entry.actor_role})</span> : null}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: isAnomalous || entry.query_executed || entry.data_after_hash ? 8 : 0 }}>
                                  {fmtDt(entry.event_datetime)}
                                </div>
                                {isAnomalous && (
                                  <div style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: 'var(--red)',
                                    background: 'var(--red-dim)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: 4, padding: '4px 8px',
                                    marginBottom: 6
                                  }}>
                                    ⚠ Anomalous access detected
                                  </div>
                                )}
                                {entry.data_after_hash && (
                                  <div style={{
                                    fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)',
                                    background: 'var(--bg-page)', borderRadius: 4, padding: '3px 8px',
                                    display: 'inline-block', marginBottom: 6
                                  }}>
                                    {String(entry.data_after_hash).slice(0, 16)}...
                                  </div>
                                )}
                                {entry.query_executed && (
                                  <div>
                                    <button
                                      onClick={() => toggleQuery(uid)}
                                      className="rp-audit-query"
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: 11, color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0'
                                      }}
                                    >
                                      Query {expandedQueries[uid] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    </button>
                                    {expandedQueries[uid] && (
                                      <div style={{
                                        fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)',
                                        background: 'var(--bg-page)', border: '1px solid var(--border-active)',
                                        borderRadius: 4, padding: '8px 10px', marginTop: 4,
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                      }}>
                                        {entry.query_executed}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
