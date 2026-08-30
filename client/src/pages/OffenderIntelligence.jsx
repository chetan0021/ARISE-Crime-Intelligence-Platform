import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Shield, AlertTriangle, User, MapPin, Clock, TrendingUp, ChevronRight, X, Upload, Camera, CheckCircle, XCircle, Loader2, FileText, Fingerprint, Brain, BarChart2, Eye } from 'lucide-react';
import { useT } from '../i18n/useT';
import { useLang } from '../context/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function OffenderIntelligence() {
  const t = useT();
  const { lang } = useLang();
  
  const [offenders, setOffenders] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [selectedOffender, setSelectedOffender] = useState(null);
  const [offenderDetail, setOffenderDetail] = useState(null);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorList, setErrorList] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeRiskFilter, setActiveRiskFilter] = useState('All risk');
  const [sortOrder, setSortOrder] = useState('Risk ↓');
  
  const [activeTab, setActiveTab] = useState('Profile');
  
  const [photoFile, setPhotoFile] = useState(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState(null);

  const fileInputRef = useRef(null);

  const fetchSummaryStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/offenders/summary/stats`);
      const data = await res.json();
      if (data.success) {
        setSummaryStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary stats', err);
    }
  };

  const fetchOffenders = async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      let url = `${import.meta.env.VITE_API_BASE}/api/offenders?`;
      if (activeFilter === 'Repeat') url += 'repeat_only=true&';
      if (activeFilter === 'Rowdy sheeter') url += 'rowdy_only=true&';
      if (activeFilter === 'On bail') url += 'status=BAIL&';
      if (activeFilter === 'Absconding') url += 'status=ABSCONDING&';
      if (activeFilter === 'Critical risk') url += 'min_risk=0.9&';
      
      if (activeRiskFilter === '>0.5') url += 'min_risk=0.5&';
      if (activeRiskFilter === '>0.7') url += 'min_risk=0.7&';
      if (activeRiskFilter === '>0.9 Critical') url += 'min_risk=0.9&';
      
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOffenders(data.data.offenders);
      } else {
        setErrorList(data.error);
      }
    } catch (err) {
      setErrorList(err.message);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    fetchSummaryStats();
  }, []);

  useEffect(() => {
    fetchOffenders();
  }, [activeFilter, activeRiskFilter, searchQuery]);

  const handleSelectOffender = async (uid) => {
    setSelectedOffender(uid);
    setLoadingDetail(true);
    setErrorDetail(null);
    setOffenderDetail(null);
    setPhotoAnalysisResult(null);
    setPhotoFile(null);
    setActiveTab('Profile');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/offenders/${uid}`);
      const data = await res.json();
      if (data.success) {
        setOffenderDetail(data.data);
      } else {
        setErrorDetail(data.error);
      }
    } catch (err) {
      setErrorDetail(err.message);
    }
    setLoadingDetail(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPhotoFile(URL.createObjectURL(file));
    setAnalyzingPhoto(true);
    setPhotoAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 300;

            if (width > height && width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64String = canvas.toDataURL('image/jpeg', 0.5);
            console.log('Compressed image payload size:', Math.round(base64String.length / 1024), 'KB');

            const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/offenders/${selectedOffender}/analyze-photo`, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ imageBase64: base64String })
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
            }

            const data = await res.json();
            if (data.success) {
              setPhotoAnalysisResult(data.data);
            } else {
              setPhotoAnalysisResult({ error: data.error || 'Zia Face Analytics failed' });
            }
          } catch (innerErr) {
            console.error('API Error:', innerErr);
            setPhotoAnalysisResult({ error: 'Failed to process image or payload too large. Error: ' + innerErr.message });
          } finally {
            setAnalyzingPhoto(false);
          }
        };
        img.onerror = () => {
          setPhotoAnalysisResult({ error: 'Failed to load image for resizing' });
          setAnalyzingPhoto(false);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setPhotoAnalysisResult({ error: 'Failed to read file' });
      setAnalyzingPhoto(false);
    }
  };

  const sortedOffenders = useMemo(() => {
    const arr = [...offenders];
    if (sortOrder === 'Risk ↓') arr.sort((a, b) => (parseFloat(b.recidivism_risk_score) || 0) - (parseFloat(a.recidivism_risk_score) || 0));
    if (sortOrder === 'Risk ↑') arr.sort((a, b) => (parseFloat(a.recidivism_risk_score) || 0) - (parseFloat(b.recidivism_risk_score) || 0));
    if (sortOrder === 'Name A-Z') arr.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    if (sortOrder === 'Arrests ↓') arr.sort((a, b) => (parseInt(b.total_prior_arrests) || 0) - (parseInt(a.total_prior_arrests) || 0));
    return arr;
  }, [offenders, sortOrder]);

  const getThreatColors = (threat) => {
    switch(threat) {
      case 'CRITICAL': return { bg: 'var(--red-dim)', border: 'rgba(239,68,68,0.25)', color: '#f87171' };
      case 'HIGH': return { bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)', color: 'var(--amber)' };
      case 'MEDIUM': return { bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)', color: '#facc15' };
      case 'LOW': return { bg: 'var(--green-dim)', border: 'rgba(74,222,128,0.25)', color: 'var(--green)' };
      default: return { bg: '#27272a', border: '#3f3f46', color: '#a1a1aa' };
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const pts = name.split(' ');
    if (pts.length > 1) return (pts[0][0] + pts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const radarData = useMemo(() => {
    if (!offenderDetail) return [];
    
    // Violence (based on instrument/weapon)
    const violenceLevel = offenderDetail.cases.some(c => c.instrument_used === 'FIREARM' || c.instrument_used === 'MACHETE' || c.weapon_used) ? 9 : 
                          offenderDetail.cases.some(c => c.instrument_used === 'KNIFE' || c.instrument_used === 'CROWBAR') ? 6 : 3;
    
    // Stealth
    const stealthLevel = offenderDetail.cases.some(c => c.entry_method === 'LOCK_PICKING' || c.entry_method === 'ROOF_ENTRY') ? 8 : 4;
    
    // Planning
    const planningLevel = offenderDetail.cases.some(c => parseInt(c.accomplice_count) > 1) ? 7 : 4;
    
    // Recidivism direct from score
    const recScore = Math.round((parseFloat(offenderDetail.profile.recidivism_risk_score) || 0) * 10);
    
    // Cross-jurisdiction complexity
    const complexLevel = offenderDetail.crossJurisdictionCount > 1 ? 8 : 4;

    return [
      { subject: 'Violence', A: violenceLevel, fullMark: 10 },
      { subject: 'Stealth', A: stealthLevel, fullMark: 10 },
      { subject: 'Planning', A: planningLevel, fullMark: 10 },
      { subject: 'Recidivism', A: recScore, fullMark: 10 },
      { subject: 'Network', A: complexLevel, fullMark: 10 }
    ];
  }, [offenderDetail]);

  const renderPhotoUpload = () => (
    <div style={{ border: '1px dashed #27272a', borderRadius: 8, padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Camera size={16} color="#fafafa" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('oi.photoVerification')}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>{t('oi.ziaAnalysis')}</p>
      
      {!photoFile && !analyzingPhoto && (
        <div 
          style={{ background: '#18181b', border: '1px dashed #3f3f46', borderRadius: 6, padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={20} color="#52525b" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drop photo here or click to upload</div>
        </div>
      )}
      
      {photoFile && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <img src={photoFile} alt="uploaded" style={{ height: 120, width: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #27272a' }} />
          
          <div style={{ flex: 1 }}>
            {analyzingPhoto ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 13 }}>
                <Loader2 size={16} className="animate-spin" />
                Analyzing with Zia...
              </div>
            ) : photoAnalysisResult && !photoAnalysisResult.error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {photoAnalysisResult.profileComparison?.verificationStatus === 'VERIFIED' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#4ade80' }}>
                    <CheckCircle size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t('oi.verified')}</div>
                      <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                        Detected: {photoAnalysisResult.faceAnalysis.detectedAge} yrs • {photoAnalysisResult.faceAnalysis.detectedGender}<br/>
                        Confidence: {(photoAnalysisResult.faceAnalysis.confidence).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
                {photoAnalysisResult.profileComparison?.verificationStatus === 'DISCREPANCY' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-primary)' }}>
                    <AlertTriangle size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t('oi.discrepancy')}</div>
                      <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                        Recorded age: {photoAnalysisResult.profileComparison.storedAge} | Detected: {photoAnalysisResult.faceAnalysis.detectedAge}<br/>
                        Gender match: {photoAnalysisResult.profileComparison.genderMatch ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                )}
                {photoAnalysisResult.profileComparison?.verificationStatus === 'UNVERIFIABLE' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#a1a1aa' }}>
                    <Eye size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Unable to verify</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>No clear face detected in the image.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--red)', fontSize: 12 }}>
                Analysis failed: {photoAnalysisResult?.error}
              </div>
            )}
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: 12, background: 'transparent', border: '1px solid #3f3f46', color: 'var(--text-primary)', padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer' }}
            >
              Upload different photo
            </button>
          </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/jpeg, image/png" onChange={handlePhotoUpload} />
      <div style={{ fontSize: 10, color: '#3f3f46', marginTop: 16, textAlign: 'right' }}>Powered by Zia Face Analytics</div>
    </div>
  );

  return (
    <div className="arise-page-enter" style={{ display: 'flex', height: '100%', width: '100%', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      
      {/* LEFT PANEL */}
      <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-default)', background: 'transparent', zIndex: 10, boxShadow: '4px 0 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header & Filters */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-default)' }}>
          
          {/* Stat Strip */}
          {summaryStats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ className: "arise-card", padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('oi.totalTracked')}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{summaryStats.totalOffenders}</div>
              </div>
              <div style={{ className: "arise-card", padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('oi.onBail')}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: summaryStats.onBail > 0 ? '#fafafa' : '#fafafa' }}>{summaryStats.onBail}</div>
              </div>
              <div style={{ className: "arise-card", padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('oi.absconding')}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: summaryStats.absconding > 0 ? '#ef4444' : '#fafafa' }}>{summaryStats.absconding}</div>
              </div>
              <div style={{ className: "arise-card", padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('oi.criticalRisk')}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>{summaryStats.criticalRisk}</div>
              </div>
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} color="#71717a" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input 
              type="text" 
              placeholder={t('oi.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px 8px 36px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#fafafa'}
              onBlur={(e) => e.target.style.borderColor = '#27272a'}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {['All', 'Repeat', 'Rowdy sheeter', 'On bail', 'Absconding', 'Critical risk'].map(f => (
              <div 
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{ 
                  whiteSpace: 'nowrap', padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer',
                  background: activeFilter === f ? 'rgba(245, 158, 11,0.1)' : '#18181b',
                  border: `1px solid ${activeFilter === f ? 'var(--border-active)' : 'var(--border-default)'}`,
                  color: activeFilter === f ? 'var(--amber)' : 'var(--text-secondary)'
                }}
              >{f}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {['All risk', '>0.5', '>0.7', '>0.9 Critical'].map(f => (
              <div 
                key={f}
                onClick={() => setActiveRiskFilter(f)}
                style={{ 
                  whiteSpace: 'nowrap', padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer',
                  background: activeRiskFilter === f ? 'rgba(245, 158, 11,0.1)' : '#18181b',
                  border: `1px solid ${activeRiskFilter === f ? 'var(--border-active)' : 'var(--border-default)'}`,
                  color: activeRiskFilter === f ? 'var(--amber)' : 'var(--text-secondary)'
                }}
              >{f}</div>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#52525b' }}>{sortedOffenders.length} offenders</div>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: 11, outline: 'none', cursor: 'pointer' }}
            >
              <option value="Risk ↓">Sort: Risk ↓</option>
              <option value="Risk ↑">Sort: Risk ↑</option>
              <option value="Name A-Z">Sort: Name A-Z</option>
              <option value="Arrests ↓">Sort: Arrests ↓</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingList ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#27272a', animation: 'pulse 2s infinite' }}></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, width: '60%', background: '#27272a', borderRadius: 4, animation: 'pulse 2s infinite' }}></div>
                  <div style={{ height: 10, width: '40%', background: '#27272a', borderRadius: 4, animation: 'pulse 2s infinite' }}></div>
                </div>
              </div>
            ))
          ) : errorList ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--red)' }}>
              <AlertTriangle size={24} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13 }}>Failed to load offenders</div>
            </div>
          ) : (
            sortedOffenders.map(o => {
              const tc = getThreatColors(o.threatLevel);
              const isSel = selectedOffender === o.offender_uid;
              const rScore = parseFloat(o.recidivism_risk_score) || 0;
              const rColor = rScore > 0.8 ? '#ef4444' : rScore > 0.6 ? '#fafafa' : '#4ade80';

              return (
                <div 
                  key={o.offender_uid}
                  onClick={() => handleSelectOffender(o.offender_uid)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSel ? 'rgba(245, 158, 11,0.04)' : 'transparent',
                    borderLeft: isSel ? '2px solid var(--amber)' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', background: '#27272a', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      border: (o.is_rowdy_sheeter === true || o.is_rowdy_sheeter === 'true') ? '2px dashed #ef4444' : 'none'
                    }}>
                      {getInitials(o.full_name)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.full_name}
                      </div>
                      {o.alias_names && (
                        <div style={{ fontSize: 12, color: '#52525b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.alias_names.split(',')[0]}
                        </div>
                      )}
                      {o.gang_affiliation_text && (
                        <div style={{ display: 'inline-block', marginTop: 4, background: 'rgba(245, 158, 11,0.1)', color: 'var(--text-primary)', fontSize: 10, padding: '2px 6px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.gang_affiliation_text}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>
                        {o.threatLevel}
                      </div>
                      {o.current_status === 'BAIL' && <div style={{ background: 'rgba(245, 158, 11,0.2)', color: 'var(--text-primary)', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>BAIL</div>}
                      {o.current_status === 'ABSCONDING' && <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>ABSCONDING</div>}
                      {(o.current_status === 'JUDICIAL_CUSTODY' || o.current_status === 'POLICE_CUSTODY') && <div style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>CUSTODY</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 3, background: '#27272a', borderRadius: 2 }}>
                      <div style={{ width: `${rScore * 100}%`, height: '100%', background: rColor, borderRadius: 2 }}></div>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: rColor }}>{rScore.toFixed(2)}</div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {o.total_prior_arrests || 0} arrests · {o.total_convictions || 0} convictions
                    {o.mo_signatures?.length > 0 && ` · ${o.mo_signatures.length} MOs`}
                  </div>

                  {(o.is_repeat_offender === true || o.is_repeat_offender === 'true') && (
                    <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ⟳ {t('oi.repeatOffender')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'transparent', position: 'relative' }}>
        {!selectedOffender ? (
          // DASHBOARD STATE
          <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t('oi.title')}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4, marginBottom: 32 }}>{t('oi.subtitle')} · Karnataka State Police</p>

            {summaryStats ? (
              <>
                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.totalTracked')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>{summaryStats.totalOffenders}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.repeatOffender')}s</div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>{summaryStats.repeatOffenders}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.rowdySheeter')}s</div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>{summaryStats.rowdySheeters}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.onBail')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)' }}>{summaryStats.onBail}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.absconding')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--red)' }}>{summaryStats.absconding}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>{t('oi.criticalRisk')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--red)' }}>{summaryStats.criticalRisk}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>Gender distribution</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 120, height: 120, position: 'relative' }}>
                        {/* Fake donut using SVG */}
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f43f5e" strokeWidth="4" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${(summaryStats.genderBreakdown?.M || 0) / summaryStats.totalOffenders * 100}, 100`} />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 18, fontWeight: 700 }}>
                          {summaryStats.totalOffenders}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }}></div> Male: {summaryStats.genderBreakdown?.M || 0}
                        </div>
                        <div style={{ fontSize: 13, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, background: '#f43f5e', borderRadius: '50%' }}></div> Female: {summaryStats.genderBreakdown?.F || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>Primary crime categories</h3>
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryStats.topCrimeCategories} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#27272a' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
                          <Bar dataKey="count" fill="#fafafa" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={32} className="animate-spin" color="#fafafa" />
              </div>
            )}
          </div>
        ) : (
          // DETAIL STATE
          loadingDetail ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Loader2 size={40} className="animate-spin" color="#fafafa" />
            </div>
          ) : errorDetail ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16 }}>Error loading profile: {errorDetail}</div>
            </div>
          ) : offenderDetail && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              
              {/* Header */}
              <div style={{ background: '#0d0d0f', padding: '24px 32px 0 32px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button onClick={() => setSelectedOffender(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}>
                    <X size={24} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: 72, height: 72, borderRadius: '50%', background: '#27272a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)',
                      border: (offenderDetail.profile.is_rowdy_sheeter === true || offenderDetail.profile.is_rowdy_sheeter === 'true') ? '2.5px dashed #ef4444' : 'none'
                    }}>
                      {getInitials(offenderDetail.profile.full_name)}
                    </div>
                    {(offenderDetail.profile.is_repeat_offender === true || offenderDetail.profile.is_repeat_offender === 'true') && (
                      <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', border: '2px solid #0d0d0f' }}></div>
                    )}
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {(offenderDetail.profile.is_rowdy_sheeter === true || offenderDetail.profile.is_rowdy_sheeter === 'true') && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>ROWDY SHEETER</div>}
                      <div style={{ background: getThreatColors(offenderDetail.threatLevel).bg, color: getThreatColors(offenderDetail.threatLevel).color, border: `1px solid ${getThreatColors(offenderDetail.threatLevel).border}`, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                        {parseFloat(offenderDetail.profile.recidivism_risk_score) >= 0.9 ? 'CRITICAL' : parseFloat(offenderDetail.profile.recidivism_risk_score) >= 0.7 ? 'HIGH' : parseFloat(offenderDetail.profile.recidivism_risk_score) >= 0.5 ? 'MEDIUM' : 'LOW'} RISK
                      </div>
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>{offenderDetail.profile.full_name}</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{offenderDetail.profile.alias_names || 'No known aliases'}</div>
                    
                    {offenderDetail.profile.gang_affiliation_text && (
                      <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(245, 158, 11,0.1)', color: 'var(--text-primary)', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                        Affiliation: {offenderDetail.profile.gang_affiliation_text}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 32 }}>
                  {['Profile', 'MO Analysis', 'Case Timeline', 'Custody', 'Biometric'].map(tab => (
                    <div 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{ 
                        padding: '12px 0', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                        color: activeTab === tab ? '#fafafa' : '#a1a1aa',
                        borderBottom: activeTab === tab ? '2px solid #fafafa' : '2px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab === 'Profile' ? t('oi.title') : 
                       tab === 'MO Analysis' ? t('oi.moAnalysis') : 
                       tab === 'Case Timeline' ? t('oi.caseTimeline') : 
                       tab === 'Custody' ? t('oi.custody') : t('oi.biometric')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div style={{ padding: 32, flex: 1 }}>
                
                {activeTab === 'Profile' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
                    {/* Left col - Risk */}
                    <div>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                        <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 200, margin: '0 auto' }}>
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#27272a" strokeWidth="12" strokeLinecap="round" />
                          <path 
                            d="M 20 100 A 80 80 0 0 1 180 100" 
                            fill="none" 
                            stroke={parseFloat(offenderDetail.profile.recidivism_risk_score) > 0.8 ? '#ef4444' : parseFloat(offenderDetail.profile.recidivism_risk_score) > 0.6 ? '#fafafa' : '#4ade80'} 
                            strokeWidth="12" 
                            strokeLinecap="round"
                            strokeDasharray={Math.PI * 80}
                            strokeDashoffset={Math.PI * 80 * (1 - (parseFloat(offenderDetail.profile.recidivism_risk_score) || 0))}
                          />
                          <text x="100" y="85" textAnchor="middle" fill="#fafafa" fontSize="28" fontWeight="700">
                            {Math.round((parseFloat(offenderDetail.profile.recidivism_risk_score) || 0) * 100)}%
                          </text>
                          <text x="100" y="100" textAnchor="middle" fill="#52525b" fontSize="11">
                            {t('oi.riskScore')}
                          </text>
                        </svg>
                        
                        <div style={{ marginTop: 24, textAlign: 'left' }}>
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Contributing factors</div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #27272a' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Prior arrests</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{offenderDetail.profile.total_prior_arrests || 0}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #27272a' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Repeat offender flag</span>
                            {(offenderDetail.profile.is_repeat_offender === true || offenderDetail.profile.is_repeat_offender === 'true') ? <CheckCircle size={14} color="#ef4444" /> : <XCircle size={14} color="#4ade80" />}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Convictions</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{offenderDetail.profile.total_convictions || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(245, 158, 11,0.04)', border: '1px solid rgba(245, 158, 11,0.15)', borderRadius: 8, padding: 16, marginTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                          <Brain size={14} /> {t('oi.behavioralSig')}
                        </div>
                        <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 16 }}>
                          {offenderDetail.behavioralProfile.operationalPattern}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase' }}>Preferred Time</div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{offenderDetail.behavioralProfile.preferredTimeSlot}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase' }}>Jurisdictions</div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{offenderDetail.crossJurisdictionCount} districts</div>
                          </div>
                        </div>

                        {offenderDetail.escalationPattern.escalating && (
                          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444', borderRadius: '0 4px 4px 0' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>⚠ Escalating pattern detected</div>
                            <div style={{ fontSize: 11, color: '#f87171' }}>{offenderDetail.escalationPattern.escalationNote}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right col - Personal details & Zia */}
                    <div>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 24px 0' }}>Personal details</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 24, columnGap: 32 }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Age</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.age ? `${offenderDetail.profile.age} years` : 'Unknown'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Gender</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.gender || 'Unknown'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Father's Name</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.fathers_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Nationality</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.nationality || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Primary Mobile</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.mobile_primary || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Occupation</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.occupation || '-'}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', marginBottom: 4 }}>Permanent Address</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.profile.permanent_address_text || '-'}</div>
                          </div>
                        </div>

                        {renderPhotoUpload()}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'MO Analysis' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 320 }}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" width={280} height={280} data={radarData}>
                          <PolarGrid stroke="#27272a" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                          <Radar name="Profile" dataKey="A" stroke="#fafafa" fill="rgba(245, 158, 11,0.2)" fillOpacity={1} />
                        </RadarChart>
                      </div>

                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Entry patterns</div>
                          {Object.entries(offenderDetail.cases.reduce((acc, c) => { if(c.entry_method) acc[c.entry_method] = (acc[c.entry_method] || 0) + 1; return acc; }, {})).map(([k, v], i) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i === 0 ? 'none' : '1px solid #1c1c1f', color: i === 0 ? '#fafafa' : '#a1a1aa' }}>
                              <span style={{ fontSize: 13 }}>{k.replace(/_/g, ' ')}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Escape routes</div>
                          {Object.entries(offenderDetail.cases.reduce((acc, c) => { if(c.escape_method) acc[c.escape_method] = (acc[c.escape_method] || 0) + 1; return acc; }, {})).map(([k, v], i) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i === 0 ? 'none' : '1px solid #1c1c1f', color: i === 0 ? '#fafafa' : '#a1a1aa' }}>
                              <span style={{ fontSize: 13 }}>{k.replace(/_/g, ' ')}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {offenderDetail.cases.some(c => c.ziaKeywords && c.ziaKeywords.length > 0) && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>✨</span>
                          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Zia AI extracted intelligence</h3>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Key entities from MO narratives across all cases</div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                          {offenderDetail.cases.flatMap(c => c.ziaKeywords || []).slice(0, 15).map((kw, i) => (
                            <div key={i} style={{ padding: '4px 12px', background: kw.confidence > 0.8 ? 'rgba(245, 158, 11,0.1)' : '#27272a', color: kw.confidence > 0.8 ? '#fafafa' : '#a1a1aa', borderRadius: 16, fontSize: 12 }}>
                              {kw.keyword || kw.text || typeof kw === 'string' ? kw : JSON.stringify(kw)}
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ fontSize: 10, color: '#52525b', fontStyle: 'italic' }}>
                          Extracted by Zia Text Analytics NER from MO narrative text. Verify before formal investigation use.
                        </div>
                      </div>
                    )}

                    {offenderDetail.crossJurisdictionPattern && offenderDetail.crossJurisdictionPattern.length > 1 && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>🌐</span>
                          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Cross-Jurisdiction MO Pattern</h3>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                          This offender has documented activity across {offenderDetail.crossJurisdictionPattern.length} police jurisdictions. Side-by-side comparison of modus operandi below.
                        </div>
                        {(() => {
                          const patterns = offenderDetail.crossJurisdictionPattern;
                          const fieldCounts = {};
                          patterns.forEach((p) => {
                            (p.modusSignatures || p.modus_signatures || []).forEach((sig) => {
                              ['entryMethod', 'instrumentUsed', 'timeOfOperation', 'entry_method', 'instrument_used', 'time_of_operation'].forEach(field => {
                                const val = sig[field];
                                if (val) {
                                  const key = `${field}::${val}`;
                                  fieldCounts[key] = (fieldCounts[key] || 0) + 1;
                                }
                              });
                            });
                          });
                          const matchedCount = Object.values(fieldCounts).filter(c => c >= 2).length;
                          return (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                {patterns.map((p, pIdx) => {
                                  const policeStation = p.policeStation || p.police_station || 'Unknown';
                                  const district = p.district || p.district_name || '';
                                  const firs = p.firs || p.firList || [];
                                  const modusSignatures = p.modusSignatures || p.modus_signatures || [];
                                  return (
                                    <div key={pIdx} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: 16 }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{policeStation}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{district}</div>
                                      </div>
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>FIRs</div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                                        {firs.length > 0 ? firs.map((fir, fIdx) => {
                                          const firUid = fir.firUid || fir.fir_uid || fir;
                                          const crimeDate = fir.crimeDate || fir.crime_date || fir.fir_registration_datetime;
                                          return (
                                            <div key={fIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                              <span style={{ background: '#27272a', color: 'var(--amber)', fontFamily: 'monospace', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{typeof firUid === 'string' ? firUid : `FIR-${fIdx+1}`}</span>
                                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{crimeDate ? new Date(crimeDate).toISOString().slice(0,10) : '-'}</span>
                                            </div>
                                          );
                                        }) : (
                                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No FIRs linked</span>
                                        )}
                                      </div>
                                      {modusSignatures.length > 0 && (
                                        <>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>MO Signatures</div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {modusSignatures.map((sig, sIdx) => (
                                              <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {[
                                                  { field: 'entryMethod', fieldAlt: 'entry_method', label: 'Entry' },
                                                  { field: 'instrumentUsed', fieldAlt: 'instrument_used', label: 'Instrument' },
                                                  { field: 'timeOfOperation', fieldAlt: 'time_of_operation', label: 'Time' },
                                                ].map(({ field, fieldAlt, label }) => {
                                                  const val = sig[field] || sig[fieldAlt];
                                                  if (!val) return null;
                                                  const key = `${field}::${val}`;
                                                  const keyAlt = `${fieldAlt}::${val}`;
                                                  const isMatched = (fieldCounts[key] || fieldCounts[keyAlt] || 0) >= 2;
                                                  return (
                                                    <div key={field} style={{
                                                      background: isMatched ? '#facc1522' : 'transparent',
                                                      border: isMatched ? '1px solid #facc1555' : '1px solid transparent',
                                                      borderRadius: 4, padding: '3px 8px', fontSize: 11,
                                                      display: 'flex', gap: 6
                                                    }}>
                                                      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                                                      <span style={{ color: 'var(--text-primary)' }}>{String(val).replace(/_/g, ' ')}</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ fontSize: 12, color: matchedCount >= 2 ? 'var(--red)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                Matching MO fields across jurisdictions = {matchedCount} fields — classified as {matchedCount >= 2 ? 'SERIAL PATTERN (high confidence)' : 'emerging pattern'}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Case Timeline' && (
                  <div>
                    {offenderDetail.crossJurisdictionCount > 1 ? (
                      <div style={{ background: 'rgba(245, 158, 11,0.1)', border: '1px solid rgba(245, 158, 11,0.2)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚡</span> Multi-jurisdiction offender — active across {offenderDetail.behavioralProfile.jurisdictionsActive.join(', ')}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: '#a1a1aa', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 13 }}>
                        Single jurisdiction — {offenderDetail.behavioralProfile.jurisdictionsActive[0]}
                      </div>
                    )}

                    <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
                      {/* Timeline line */}
                      <div style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, background: '#27272a' }}></div>
                      
                      {offenderDetail.cases.map((c, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          {/* Node dot */}
                          <div style={{ position: 'absolute', left: -25, top: 16, width: 10, height: 10, borderRadius: '50%', background: c.case_status === 'Open' ? '#fafafa' : c.case_status === 'Closed' ? '#71717a' : '#22c55e', border: '2px solid #09090b' }}></div>
                          
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 13 }}>{c.fir_uid}</span>
                                <span style={{ background: '#27272a', color: 'var(--text-primary)', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>{c.district_name}</span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                {new Date(c.fir_registration_datetime).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.crime_category}</span>
                              <span style={{ fontSize: 12, color: '#a1a1aa' }}>• {c.bns_primary_section}</span>
                            </div>

                            <div style={{ background: 'rgba(245, 158, 11,0.04)', borderLeft: '3px solid #fafafa', borderRadius: '0 6px 6px 0', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                              <div style={{ fontSize: 12, color: '#a1a1aa' }}>Entry: <span style={{ color: 'var(--text-primary)' }}>{c.entry_method?.replace(/_/g, ' ') || '-'}</span></div>
                              <div style={{ fontSize: 12, color: '#a1a1aa' }}>Instrument: <span style={{ color: 'var(--text-primary)' }}>{c.instrument_used?.replace(/_/g, ' ') || '-'}</span></div>
                              <div style={{ fontSize: 12, color: '#a1a1aa' }}>Escape: <span style={{ color: 'var(--text-primary)' }}>{c.escape_method?.replace(/_/g, ' ') || '-'}</span></div>
                              <div style={{ fontSize: 12, color: '#a1a1aa' }}>Time: <span style={{ color: 'var(--text-primary)' }}>{c.time_of_operation || '-'}</span></div>
                            </div>

                            {c.mo_narrative_text && (
                              <details style={{ cursor: 'pointer', outline: 'none' }}>
                                <summary style={{ fontSize: 12, color: '#52525b', userSelect: 'none' }}>View MO narrative ▾</summary>
                                <div style={{ marginTop: 8, fontSize: 12, color: '#a1a1aa', lineHeight: 1.5, padding: 12, background: '#1c1c1f', borderRadius: 6 }}>
                                  {c.mo_narrative_text}
                                </div>
                              </details>
                            )}

                            {c.incident_address_text && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                                <MapPin size={12} /> {c.incident_address_text.length > 60 ? c.incident_address_text.substring(0,60)+'...' : c.incident_address_text}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Custody' && (
                  <div>
                    {offenderDetail.custody.length > 0 && offenderDetail.custody[0].current_status === 'BAIL' && (
                      <div style={{ background: 'rgba(245, 158, 11,0.1)', border: '1px solid rgba(245, 158, 11,0.3)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{t('oi.currentlyOnBail')}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{offenderDetail.custody[0].court_name}</div>
                            <div style={{ fontSize: 12, color: '#a1a1aa' }}>Granted: {new Date(offenderDetail.custody[0].bail_granted_datetime).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {Math.max(0, Math.floor((new Date(offenderDetail.custody[0].bail_expiry_datetime) - Date.now()) / (1000*60*60*24)))} {t('oi.daysRemaining')}
                            </div>
                            <div style={{ fontSize: 12, color: '#a1a1aa' }}>Type: {offenderDetail.custody[0].bail_type}</div>
                          </div>
                        </div>
                        
                        {parseFloat(offenderDetail.profile.recidivism_risk_score) > 0.8 && (
                          <div style={{ marginTop: 16, background: '#ef444420', borderLeft: '3px solid #ef4444', padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                            {t('oi.highRiskBail')}
                          </div>
                        )}
                      </div>
                    )}

                    {offenderDetail.custody.length > 0 && offenderDetail.custody[0].current_status === 'ABSCONDING' && (
                      <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: 20, marginBottom: 24, animation: 'pulse 2s infinite' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>⚠ {t('oi.absconding.alert')}</div>
                        <div style={{ fontSize: 13, color: '#f87171' }}>Immediate apprehension required.</div>
                      </div>
                    )}

                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>Full custody record</h3>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#1c1c1f', borderBottom: '1px solid #27272a', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 500 }}>Arrest Date</th>
                            <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                            <th style={{ padding: '12px 16px', fontWeight: 500 }}>Court</th>
                            <th style={{ padding: '12px 16px', fontWeight: 500 }}>Bail Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offenderDetail.custody.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #27272a', background: i === 0 ? '#1c1c1f' : 'transparent', fontSize: 13 }}>
                              <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{new Date(c.arrest_datetime).toLocaleDateString()}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ 
                                  background: c.current_status === 'BAIL' ? 'rgba(245, 158, 11,0.1)' : c.current_status === 'ABSCONDING' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                  color: c.current_status === 'BAIL' ? '#fafafa' : c.current_status === 'ABSCONDING' ? '#ef4444' : '#3b82f6',
                                  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500 
                                }}>
                                  {c.current_status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{c.court_name || '-'}</td>
                              <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{c.bail_type || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'Biometric' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>Physical descriptors</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Height</div>
                          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{offenderDetail.biometric?.height_cm ? `${offenderDetail.biometric.height_cm} cm` : '-'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Weight</div>
                          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{offenderDetail.biometric?.weight_kg ? `${offenderDetail.biometric.weight_kg} kg` : '-'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Complexion</div>
                          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{offenderDetail.biometric?.complexion || '-'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Build</div>
                          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{offenderDetail.biometric?.build || '-'}</div>
                        </div>
                      </div>

                      {offenderDetail.biometric?.identifying_marks_text && (
                        <div style={{ background: 'rgba(245, 158, 11,0.05)', border: '1px solid rgba(245, 158, 11,0.2)', borderRadius: 6, padding: 16, marginBottom: 24 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>Identifying marks</div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{offenderDetail.biometric.identifying_marks_text}</div>
                        </div>
                      )}

                      {offenderDetail.biometric?.dna_profile_reference ? (
                        <div style={{ display: 'inline-block', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '6px 12px', borderRadius: 6, fontSize: 12 }}>
                          CODIS reference on file: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{offenderDetail.biometric.dna_profile_reference}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-block', background: '#27272a', color: '#a1a1aa', padding: '6px 12px', borderRadius: 6, fontSize: 12 }}>
                          No DNA profile on file
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {renderPhotoUpload()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
