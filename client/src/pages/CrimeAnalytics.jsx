import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertCircle, AlertTriangle, Clock, Moon } from 'lucide-react';
import { useT } from '../i18n/useT';
import { useLang } from '../context/LanguageContext';

const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery · Snatching',
  'BNS-318(4)': 'Cyber Fraud · OTP',
  'BNS-331(3)': 'Housebreaking · Night',
  'BNS-115': 'Assault',
  'BNS-103': 'Murder',
  'BNS-64': 'Sexual Assault',
  'BNS-308': 'Extortion',
};

export default function CrimeAnalytics() {
  const [period, setPeriod] = useState('30 days');
  const [district, setDistrict] = useState('All districts');
  const [nightOnly, setNightOnly] = useState(false);
  
  const EMPTY_TRENDS = { byMonth: [], bySection: [], byDistrict: [], totalRecords: 0 };
  const EMPTY_PATTERNS = { instruments: [], entryMethods: [], escapeMethods: [], crimeCategories: [] };
  const EMPTY_SEASONAL = { seasonal: [], timeOfDay: [], weekday: [] };

  const [trendsData, setTrendsData] = useState(EMPTY_TRENDS);
  const [patternsData, setPatternsData] = useState(EMPTY_PATTERNS);
  const [seasonalData, setSeasonalData] = useState(EMPTY_SEASONAL);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Tooltip state for heatmap
  const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, count: 0, time: '', day: '' });

  
  const handleExport = () => {
    if (!trendsData || !trendsData.byMonth) return;
    const csvContent = "data:text/csv;charset=utf-8,Month,Count\n" + trendsData.byMonth.map(m => `${m.month},${m.count}`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Crime_Analytics_${district}.csv`;
    link.click();
  };

  const t = useT();
  const { lang } = useLang();

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';
      
      let trendsUrl = `${baseUrl}/api/trends`;
      // Convert translation back to English for API query if needed, or simply pass the selected string.
      // Since the mock data doesn't care about translation on the backend, we use English internally if "All districts"
      const districtQuery = district === t('ca.filter.allDistricts') || district === 'All districts' ? 'All districts' : district;
      
      if (nightOnly) trendsUrl += (trendsUrl.includes('?') ? '&' : '?') + 'nightOnly=true';
      if (districtQuery !== 'All districts') {
        trendsUrl += `?district=${encodeURIComponent(districtQuery)}`;
      }
      
      const [trendsRes, patternsRes, seasonalRes] = await Promise.all([
        fetch(trendsUrl),
        fetch(`${baseUrl}/api/patterns`),
        fetch(`${baseUrl}/api/trends/seasonal`)
      ]);

      if (!trendsRes.ok || !patternsRes.ok || !seasonalRes.ok) {
        throw new Error("Failed to fetch");
      }

      const trendsJson = await trendsRes.json();
      const patternsJson = await patternsRes.json();
      const seasonalJson = await seasonalRes.json();

      if (trendsJson.data && trendsJson.data.byMonth) {
        trendsJson.data.byMonth = [...trendsJson.data.byMonth].reverse();
      }

      setTrendsData(trendsJson.data);
      setPatternsData(patternsJson.data);
      setSeasonalData(seasonalJson.data);
    } catch (err) {
      console.error('CrimeAnalytics fetch error:', err);
      setError(true);
      // Keep showing the page with whatever data we have (or empty defaults)
      // Don't block the entire UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, district, nightOnly]);

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ height: '24px', width: '200px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '16px', width: '300px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ height: '36px', width: '250px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
        <div style={{ height: '300px', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '300px', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '400px', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    );
  }

  // Error banner — shown inline, does NOT block page render
  const ErrorBanner = error ? (
    <div style={{
      backgroundColor: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: '8px',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '16px',
      fontFamily: lang === 'kn' ? "'Noto Sans Kannada', sans-serif" : "Inter, sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle color="var(--red)" size={16} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Live data unavailable — showing cached view</span>
      </div>
      <button
        onClick={fetchData}
        style={{ padding: '4px 12px', backgroundColor: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--red)', borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >
        {t('common.retry')}
      </button>
    </div>
  ) : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-active)', borderRadius: '6px', padding: '8px 12px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '0 0 4px 0' }}>{label}</p>
          <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, margin: 0 }}>
            {payload[0].value} {t('common.cases')}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (section) => {
    const label = BNS_LABELS[section] ? `${section} · ${BNS_LABELS[section]}` : section;
    if (label.length > 28) return label.substring(0, 25) + '…';
    return label;
  };

  const periodOptions = [
    { label: t('ca.filter.30d'), val: '30 days' },
    { label: t('ca.filter.90d'), val: '90 days' },
    { label: t('ca.filter.1yr'), val: '1 year' }
  ];
  
  const districtOptions = [t('ca.filter.allDistricts'), ...(trendsData?.byDistrict?.map(d => d.district) || [])];
  const uniqueDistricts = [...new Set(districtOptions)];
  
  const totalFIRs = trendsData?.totalRecords || 0;

  const timeSlots = [
    { label: t('time.DAWN'), key: 'DAWN' },
    { label: t('time.MORNING'), key: 'MORNING' },
    { label: t('time.AFTERNOON'), key: 'AFTERNOON' },
    { label: t('time.EVENING'), key: 'EVENING' },
    { label: t('time.NIGHT'), key: 'NIGHT' },
    { label: t('time.MIDNIGHT'), key: 'MIDNIGHT' }
  ];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // Insight Calculations
  let peakTimeSlot = 'N/A';
  let highestRiskDay = 'N/A';
  let nightRatio = 0;

  if (seasonalData?.matrix) {
    const timeTotals = {};
    const dayTotals = {};
    let totalAll = 0;
    
    seasonalData.matrix.forEach(m => {
      const c = m.count || 0;
      timeTotals[m.timeSlot] = (timeTotals[m.timeSlot] || 0) + c;
      dayTotals[m.day] = (dayTotals[m.day] || 0) + c;
      totalAll += c;
    });

    if (totalAll > 0) {
      const peakKey = Object.keys(timeTotals).reduce((a, b) => timeTotals[a] > timeTotals[b] ? a : b);
      peakTimeSlot = timeSlots.find(tObj => tObj.key === peakKey)?.label || peakKey;
      highestRiskDay = Object.keys(dayTotals).reduce((a, b) => dayTotals[a] > dayTotals[b] ? a : b);
      const nightCount = (timeTotals['NIGHT'] || 0) + (timeTotals['MIDNIGHT'] || 0);
      nightRatio = Math.round((nightCount / totalAll) * 100);
    }
  }

  // Format helpers for MO profile
  const maxEntryCount = patternsData?.entryMethods?.length ? Math.max(...patternsData.entryMethods.map(e => e.count)) : 1;
  const maxEscapeCount = patternsData?.escapeMethods?.length ? Math.max(...patternsData.escapeMethods.map(e => e.count)) : 1;
  const maxInstCount = patternsData?.instruments?.length ? Math.max(...patternsData.instruments.map(e => e.count)) : 1;

  const formatLabelText = (txt) => {
    if (!txt) return 'Unknown';
    const noUnderscore = txt.replace(/_/g, ' ');
    return noUnderscore.charAt(0).toUpperCase() + noUnderscore.slice(1).toLowerCase();
  };

  const formatEscapeLabel = (label) => {
    const map = {
      TWO_WHEELER: "Bike / two-wheeler",
      CAR: "Car / four-wheeler",
      FOOT: "On foot",
      AUTO: "Autorickshaw",
      PUBLIC_TRANSPORT: "Public transport",
      UNKNOWN: "Unknown / unconfirmed"
    };
    return map[label] || formatLabelText(label);
  };

  const formatInstrumentLabel = (label) => {
    const map = {
      crowbar: "Crowbar (forced entry)",
      knife_suspected: "Knife / sharp object",
      OTP_phishing_kit: "OTP phishing kit",
      glasscutter: "Glass cutter"
    };
    return map[label] || formatLabelText(label);
  };

  const getInstrumentSeverity = (label) => {
    const lower = (label || '').toLowerCase();
    if (lower.includes('crowbar') || lower.includes('knife') || lower.includes('weapon')) {
      return { color: 'var(--red)', text: t('common.physicalThreat') };
    }
    if (lower.includes('otp') || lower.includes('cyber') || lower.includes('phishing')) {
      return { color: 'var(--text-primary)', text: t('common.cyberThreat') };
    }
    return { color: 'var(--text-muted)', text: 'Unknown' };
  };

  const appFont = lang === 'kn' ? "'Noto Sans Kannada', sans-serif" : "Inter, sans-serif";

  return (
    <div className="arise-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: appFont }} onMouseLeave={() => setTooltipState(prev => ({...prev, visible: false}))}>
      <style>
        {`
          @keyframes subtlePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11,0); }
            50% { box-shadow: 0 0 8px 2px rgba(245, 158, 11,0.3); }
          }
        `}
      </style>
      {ErrorBanner}
      {/* SECTION 0: PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{t('ca.title')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('ca.subtitle')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={nightOnly} onChange={(e) => setNightOnly(e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
            Night Crimes Only
          </label>
          <button onClick={handleExport} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border-active)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            Export CSV
          </button>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-base)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-active)' }}>
            {periodOptions.map(p => (
              <button
                key={p.val}
                onClick={() => setPeriod(p.val)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: period === p.val ? '1px solid var(--amber-dim)' : '1px solid transparent',
                  backgroundColor: period === p.val ? 'var(--amber-dim)' : 'transparent',
                  color: period === p.val ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  fontFamily: appFont
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          
          <select 
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '180px',
              fontFamily: appFont
            }}
          >
            {uniqueDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: TREND LINE CHART */}
      <div className="arise-card glowing-area-cyan" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="arise-section-label" style={{ margin: 0 }}>{t('ca.trendChart')}</h2>
        </div>
        {trendsData && trendsData.byMonth && trendsData.byMonth.length > 0 ? (
          <div style={{ height: '300px', width: '100%', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData.byMonth}>
                <defs>
                  <linearGradient id="caCyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Area type="monotone" dataKey="count" stroke="var(--cyan)" strokeWidth={3} fillOpacity={1} fill="url(#caCyanGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle color="var(--text-muted)" size={32} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('common.noData')}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* SECTION 2: BREAKDOWN */}
        <div className="arise-card" style={{ padding: '24px' }}>
          <h2 className="arise-section-label" style={{ margin: '0 0 16px 0' }}>{t('ca.breakdown')}</h2>
          {trendsData && trendsData.bySection && trendsData.bySection.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData.bySection} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="section" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} width={120} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-default)', opacity: 0.4 }} />
                  <Bar dataKey="count" fill="var(--amber)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
               <AlertCircle color="var(--text-muted)" size={32} />
               <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('common.noData')}</p>
             </div>
          )}
        </div>

        {/* SECTION 3 & 4: MO AND INSTRUMENTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="arise-card" style={{ padding: '24px', flex: 1 }}>
            <h2 className="arise-section-label" style={{ margin: '0 0 16px 0' }}>{t('ca.mo')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {patternsData?.entryMethods?.map((e, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100px', fontSize: '12px', color: 'var(--text-secondary)' }}>{formatLabelText(e.method)}</div>
                  <div style={{ flex: 1, height: '6px', background: 'var(--border-default)', borderRadius: '3px' }}>
                    <div style={{ width: `${(e.count / maxEntryCount) * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: '3px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '12px', color: 'var(--text-primary)', textAlign: 'right' }}>{e.count}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="arise-card" style={{ padding: '24px', flex: 1 }}>
            <h2 className="arise-section-label" style={{ margin: '0 0 16px 0' }}>{t('ca.instruments')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {patternsData?.instruments?.map((e, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100px', fontSize: '12px', color: 'var(--text-secondary)' }}>{formatInstrumentLabel(e.instrument)}</div>
                  <div style={{ flex: 1, height: '6px', background: 'var(--border-default)', borderRadius: '3px' }}>
                    <div style={{ width: `${(e.count / maxInstCount) * 100}%`, height: '100%', background: getInstrumentSeverity(e.instrument).color, borderRadius: '3px' }} />
                  </div>
                  <div style={{ width: '20px', fontSize: '12px', color: 'var(--text-primary)', textAlign: 'right' }}>{e.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: HEATMAP */}
      <div className="arise-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 className="arise-section-label" style={{ margin: 0 }}>{t('ca.heatmap')}</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>{t('ca.heatmapSubtitle')}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '4px 4px', width: '100%' }}>
          {/* Header Row */}
          <div /> {/* Empty top-left cell */}
          {days.map(d => (
            <div key={d} style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border-active)' }}>{d}</div>
          ))}
          
          {/* Grid Rows */}
          {timeSlots.map(tObj => (
            <React.Fragment key={tObj.key}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '12px', width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '36px' }}>
                {tObj.label}
              </div>
              {days.map(d => {
                const cellData = seasonalData?.matrix?.find(m => m.timeSlot === tObj.key && m.day === d);
                const count = cellData?.count || 0;
                
                let bgColor = 'var(--bg-page)';
                let borderColor = 'var(--border-default)';
                let txtColor = 'transparent';
                let fontWeight = 500;
                let fontSize = '11px';
                let animation = 'none';

                if (count === 1) {
                  bgColor = 'rgba(245, 158, 11, 0.25)';
                  borderColor = 'var(--amber-dim)';
                  txtColor = 'var(--text-primary)';
                } else if (count === 2) {
                  bgColor = 'rgba(245, 158, 11, 0.50)';
                  borderColor = 'rgba(245, 158, 11, 0.30)';
                  txtColor = 'var(--bg-base)';
                  fontWeight = 700;
                } else if (count >= 3) {
                  bgColor = 'rgba(245, 158, 11, 0.85)';
                  borderColor = 'var(--text-primary)';
                  txtColor = 'var(--bg-base)';
                  fontWeight = 700;
                  fontSize = '12px';
                  animation = 'subtlePulse 2.5s ease-in-out infinite';
                }

                return (
                  <div 
                    key={`${tObj.key}-${d}`}
                    style={{
                      width: 'auto',
                      height: '36px',
                      borderRadius: '4px',
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: txtColor,
                      fontSize: fontSize,
                      fontWeight: fontWeight,
                      cursor: 'default',
                      transition: 'background 0.15s',
                      animation: animation
                    }}
                    onMouseMove={(e) => setTooltipState({ visible: true, x: e.clientX, y: e.clientY, count, time: tObj.label, day: d })}
                    onMouseLeave={() => setTooltipState(prev => ({...prev, visible: false}))}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Floating Tooltip */}
        {tooltipState.visible && (
          <div style={{
            position: 'fixed',
            left: tooltipState.x + 15,
            top: tooltipState.y + 15,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: '6px',
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            minWidth: '140px',
            fontFamily: appFont
          }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
              {tooltipState.count} {t('common.cases')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
              {tooltipState.time} - {tooltipState.day}
            </div>
          </div>
        )}

        {/* Heatmap Insights Strip */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(245, 158, 11,0.08)', border: '1px solid rgba(245, 158, 11,0.2)', borderRadius: '6px' }}>
            <Clock size={16} color="var(--text-primary)" />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{t('ca.peakWindow')}: {peakTimeSlot}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(245, 158, 11,0.08)', border: '1px solid rgba(245, 158, 11,0.2)', borderRadius: '6px' }}>
            <AlertTriangle size={16} color="var(--text-primary)" />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{t('ca.highestRiskDay')}: {highestRiskDay}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: nightRatio > 50 ? 'rgba(245, 158, 11,0.08)' : 'transparent', border: nightRatio > 50 ? '1px solid rgba(245, 158, 11,0.2)' : '1px solid var(--text-muted)', borderRadius: '6px' }}>
            <Moon size={16} color={nightRatio > 50 ? "var(--text-primary)" : "var(--text-muted)"} />
            <span style={{ color: nightRatio > 50 ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>{nightRatio} {t('ca.nightCrimes')}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
