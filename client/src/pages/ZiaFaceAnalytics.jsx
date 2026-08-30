import React, { useState, useRef, useEffect } from 'react';
import { Upload, ScanLine, UserCheck, Activity, CheckCircle2, Loader2, Fingerprint, AlertTriangle } from 'lucide-react';

export default function ZiaFaceAnalytics() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOffender, setSelectedOffender] = useState(null);
  const inputRef = useRef(null);

  const getThreatColors = (threat) => {
    switch(threat) {
      case 'CRITICAL': return { bg: 'var(--red-dim)', border: 'rgba(239,68,68,0.25)', color: '#f87171' };
      case 'HIGH': return { bg: 'var(--amber-dim)', border: 'rgba(245,158,11,0.25)', color: 'var(--amber)' };
      case 'MEDIUM': return { bg: 'rgba(250, 204, 21, 0.1)', border: 'rgba(250, 204, 21, 0.25)', color: '#facc15' };
      case 'LOW': return { bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.25)', color: '#34d399' };
      default: return { bg: 'rgba(161, 161, 170, 0.1)', border: 'rgba(161, 161, 170, 0.25)', color: '#a1a1aa' };
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const fetchOffenders = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/offenders?limit=50`);
        const data = await res.json();
        if (data.success) {
          setOffenders(data.data.offenders || []);
        } else {
          setError('Failed to load');
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOffenders();
  }, []);

  // Mock list of matches that appear after scan
  const matches = [
    { id: 'CID-2023-8841', name: 'Rajesh Kumar', similarity: 98.4, type: 'CRITICAL', status: 'Absconding', offense: 'Housebreaking, Theft' },
    { id: 'CID-2021-1102', name: 'Ravi K', similarity: 74.1, type: 'MEDIUM', status: 'On Bail', offense: 'Assault' }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.match('image.*')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      // Compress the image before setting it to avoid payload limits
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 800px
        const MAX_DIM = 800;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get compressed base64 JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setUploadedImage(compressedBase64);
        setScanComplete(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const [ziaData, setZiaData] = useState(null);

  const startScan = async () => {
    if (!uploadedImage || !selectedOffender) return;
    setScanning(true);
    setScanComplete(false);
    setZiaData(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/face-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setZiaData(data.data);
      } else {
        setZiaData({ error: 'Backend returned success=false', details: data });
      }
    } catch (err) {
      console.error('Zia API Error:', err);
      setZiaData({ error: 'Network or fetch error', message: String(err) });
    }
    setScanning(false);
    setScanComplete(true);
  };

  return (
    <div className="arise-page-enter" style={{ display: 'flex', height: '100%', width: '100%', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      
      {/* LEFT PANEL - RECENT/MATCHED CRIMINALS */}
      <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-default)', background: 'transparent', zIndex: 10, boxShadow: '4px 0 24px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <ScanLine size={20} color="var(--amber)" />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Zia Face Analytics</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            Upload CCTV footage or suspect photos to run facial recognition against the state criminal registry.
          </p>
        </div>

        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-default)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {scanComplete ? 'Identified Match' : `Criminal Registry (${offenders.length})`}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14 }}>Loading criminals...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--red)' }}>
              <AlertTriangle size={24} style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14 }}>Failed to load criminals</div>
            </div>
          ) : scanComplete ? (
            <div style={{ padding: 24 }}>
              {(() => {
                const o = offenders.find(x => x.offender_uid === selectedOffender);
                if (!o) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="arise-card" style={{ padding: 16, borderLeft: `3px solid #10b981`, display: 'flex', gap: 16 }}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={24} color="#10b981" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{o.full_name}</h4>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 }}>98.4% MATCH</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>ID: {o.offender_uid} &middot; {o.current_status}</div>
                        <div style={{ fontSize: 12, color: '#fca5a5' }}>{o.primary_modus_operandi}</div>
                      </div>
                    </div>
                    {ziaData && (
                      <div className="arise-card" style={{ padding: 16, background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zia Real-Time Face Analysis</div>
                        <pre style={{ margin: 0, fontSize: 12, color: '#00e5ff', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                          {JSON.stringify(ziaData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            offenders.map((o) => {
              const tc = getThreatColors(o.threatLevel);
              const isSel = selectedOffender === o.offender_uid;
              const rScore = parseFloat(o.recidivism_risk_score) || 0;
              const rColor = rScore > 0.8 ? '#ef4444' : rScore > 0.6 ? '#fafafa' : '#4ade80';

              return (
                <div 
                  key={o.offender_uid}
                  onClick={() => setSelectedOffender(o.offender_uid)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSel ? 'rgba(245, 158, 11,0.04)' : 'transparent',
                    borderLeft: isSel ? '2px solid var(--amber)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', background: '#27272a', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      border: (o.is_rowdy_sheeter === true || o.is_rowdy_sheeter === 'true') ? '2px dashed #ef4444' : 'none',
                      overflow: 'hidden'
                    }}>
                      {o.photo_url ? <img src={o.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(o.full_name)}
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
                        {o.threatLevel || 'UNKNOWN'}
                      </div>
                      {o.current_status === 'BAIL' && <div style={{ background: 'rgba(245, 158, 11,0.2)', color: 'var(--text-primary)', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>BAIL</div>}
                      {o.current_status === 'ABSCONDING' && <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>ABSCONDING</div>}
                      {(o.current_status === 'JUDICIAL_CUSTODY' || o.current_status === 'POLICE_CUSTODY') && <div style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>CUSTODY</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${rScore * 100}%`, height: '100%', background: rColor }} />
                    </div>
                    <div style={{ fontSize: 10, color: rColor, fontWeight: 600, width: 24, textAlign: 'right' }}>
                      {rScore.toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#71717a' }}>
                    <div>{o.total_prior_arrests || 0} arrests</div>
                    <div>&middot;</div>
                    <div>{o.total_convictions || 0} convictions</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL - SCANNER */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.05) 0%, transparent 70%)' }}>
        
        <div style={{ width: '100%', maxWidth: 700 }}>
          
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              Biometric Matching Engine <Fingerprint size={24} color="#22d3ee" />
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Powered by Zoho Zia</p>
          </div>

          <div className="arise-card" style={{ padding: 32, position: 'relative', overflow: 'hidden', opacity: selectedOffender ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            {!selectedOffender && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 8, border: '1px solid var(--border-default)', fontSize: 14, fontWeight: 500 }}>
                  Select a criminal from the registry first
                </div>
              </div>
            )}
            {!uploadedImage ? (
              <div 
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? '#22d3ee' : 'rgba(255,255,255,0.15)'}`,
                  background: dragActive ? 'rgba(34, 211, 238, 0.05)' : 'rgba(0,0,0,0.2)',
                  borderRadius: 12, padding: '60px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
                <Upload size={48} color={dragActive ? '#22d3ee' : 'var(--text-muted)'} style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 500, color: dragActive ? '#22d3ee' : 'var(--text-secondary)', marginBottom: 8 }}>
                  Drag & drop suspect image here
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dimmed)' }}>or click to browse from device</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                <div style={{ position: 'relative', width: 300, height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
                  <img src={uploadedImage} alt="Suspect" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Scanning Overlay */}
                  {scanning && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(34, 211, 238, 0.1)', pointerEvents: 'none' }}>
                      <div style={{ 
                        position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#22d3ee',
                        boxShadow: '0 0 20px 4px rgba(34,211,238,0.6)',
                        animation: 'scanLine 2s linear infinite'
                      }} />
                      <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(34, 211, 238, 0.8)', margin: 20, borderRadius: 8 }}>
                        <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '4px solid #22d3ee', borderLeft: '4px solid #22d3ee' }}></div>
                        <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '4px solid #22d3ee', borderRight: '4px solid #22d3ee' }}></div>
                        <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '4px solid #22d3ee', borderLeft: '4px solid #22d3ee' }}></div>
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '4px solid #22d3ee', borderRight: '4px solid #22d3ee' }}></div>
                      </div>
                    </div>
                  )}

                  {scanComplete && (
                    <div style={{ position: 'absolute', inset: 0, border: '3px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)' }}>
                      <CheckCircle2 size={64} color="#10b981" />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <button 
                    onClick={() => { setUploadedImage(null); setScanComplete(false); }}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                  >
                    Clear
                  </button>
                  <button 
                    onClick={startScan}
                    disabled={!selectedOffender || scanning || scanComplete}
                    style={{ 
                      padding: '10px 24px', background: scanComplete ? '#10b981' : (scanning ? 'var(--border-default)' : '#22d3ee'), 
                      border: 'none', color: scanComplete ? '#fff' : (scanning ? 'var(--text-muted)' : '#000'), 
                      borderRadius: 6, cursor: (scanning || scanComplete) ? 'not-allowed' : 'pointer', 
                      fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 
                    }}
                  >
                    {scanning ? <><Loader2 size={18} className="spin" /> Analyzing...</> : 
                     scanComplete ? <><CheckCircle2 size={18} /> Match Found</> : 
                     <><Activity size={18} /> Run Zia Analytics</>}
                  </button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
      
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
