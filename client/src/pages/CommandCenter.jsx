import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useT } from '../i18n/useT';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MapPin, Clock, FileText, AlertCircle, Fingerprint, Users } from 'lucide-react';
import { STATION_LOCATIONS } from '../data/stationLocations';
import ZiaOrb from '../components/ZiaOrb';

const PIE_COLORS = ['#00e5ff', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#64748b'];

// Simplified HeatmapLayer for Risk Zones
const HeatmapLayer = ({ heatData }) => {
  const map = useMap();
  useEffect(() => {
    let heatLayer = null;
    import('leaflet.heat').then(() => {
      if (!map || !heatData || !heatData.length) return;
      const points = heatData.map(cell => [cell.lat, cell.lng, cell.weight]);
      heatLayer = L.heatLayer(points, {
        radius: 35, blur: 20, maxZoom: 12, max: 1.0,
        gradient: { 0.0: '#1e3a5f', 0.4: '#00e5ff', 0.7: '#f59e0b', 1.0: '#f43f5e' }
      });
      heatLayer.addTo(map);
    });
    return () => { if (heatLayer && map) map.removeLayer(heatLayer); };
  }, [map, heatData]);
  return null;
};

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom glowing crime pin
const createGlowingIcon = (color) => {
  return L.divIcon({
    html: `<div style="position:relative;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Helper to map districts to approx coordinates using stationLocations.js
const getApproxCoordinates = (districtName) => {
  const station = Object.values(STATION_LOCATIONS).find(s => s.districtName?.toLowerCase() === districtName?.toLowerCase());
  if (station) {
    // Add random scatter (approx 10-20km) so pins don't stack perfectly on top of each other
    const scatterLat = (Math.random() - 0.5) * 0.15;
    const scatterLng = (Math.random() - 0.5) * 0.15;
    return { lat: station.lat + scatterLat, lng: station.lng + scatterLng };
  }
  return { lat: 12.9716 + (Math.random() - 0.5)*0.2, lng: 77.5946 + (Math.random() - 0.5)*0.2 }; // default to BLR with scatter
};

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useT();
  const dashboardRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';
        const url = `${baseUrl}/api/analytics?t=${Date.now()}`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const json = await response.json();
        if (json.success) setData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      // 1. Capture the dashboard (use lower scale for performance and smaller file)
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#000000'
      });
      // Use JPEG instead of PNG to vastly reduce file size for maps/gradients
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      // 2. Initialize jsPDF correctly
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
      
      // 3. Add Dashboard screenshot
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // 4. Add new page for AI Recommendations
      pdf.addPage();
      pdf.setFillColor(4, 18, 38);
      pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
      
      pdf.setTextColor(0, 229, 255);
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('ARISE Intelligence - Strategic Recommendations', 16, 20);
      
      pdf.setDrawColor(0, 119, 255);
      pdf.line(16, 25, pdfWidth - 16, 25);
      
      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      
      let currentY = 35;
      const addPoint = (title, desc) => {
        pdf.setTextColor(0, 229, 255);
        pdf.setFont(undefined, 'bold');
        pdf.text(`• ${title}:`, 16, currentY);
        pdf.setTextColor(226, 232, 240);
        pdf.setFont(undefined, 'normal');
        
        const textLines = pdf.splitTextToSize(desc, pdfWidth - 36);
        pdf.text(textLines, 16 + pdf.getTextWidth(`• ${title}: `), currentY);
        currentY += (textLines.length * 6) + 4;
      };

      addPoint("Resource Allocation", `Shift patrol units to high-risk zones identified in the analogical heatmap, particularly focusing on the clusters in the central districts.`);
      addPoint("Targeted Operations", `Incident trends show an elevated volume of BNS-303 and BNS-318. Recommend initiating targeted operations to dismantle organized syndicates operating in these domains.`);
      addPoint("Temporal Deployment", `The temporal analysis shows distinct peaks in the late evening. Recommend overlapping shift changes to ensure maximum coverage during these high-incident timeslots.`);
      addPoint("Repeat Offenders", `We have ${d.kpis?.repeatOffenders || 0} active repeat offenders currently tracked. Proactive monitoring and parole checks should be prioritized in their registered localities.`);

      // 5. Save the PDF safely using a Blob object URL
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ARISE_CommandCenter_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error("Failed to export PDF", err);
    }
  };

  if (loading) {
    return (
      <div className="arise-page-enter" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 100px)' }}>
        <div className="arise-skeleton" style={{ flex: 1.3 }} />
        <div className="arise-skeleton" style={{ flex: 1 }} />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: '24px' }}>{t('common.error')} ({error})</div>;
  }

  const d = data || { kpis: {}, byDistrict: [], bySection: [], byTimeSlot: [], recentFIRs: [] };

  const districtChartData = (d.byDistrict || []).slice(0, 10);
  const sectionChartData = (d.bySection || []).slice(0, 8);
  const timeChartData = (d.byTimeSlot || []).map(t => ({ name: t.time_of_day_slot, count: t.count }));
  
  // Prepare heatmap data from recent FIRs
  const processedFIRs = (d.recentFIRs || []).map(fir => {
    const coords = getApproxCoordinates(fir.district_name);
    return { ...fir, lat: coords.lat, lng: coords.lng };
  });

  const heatData = processedFIRs.map(f => ({
    lat: f.lat,
    lng: f.lng,
    weight: 1.0
  }));

  const mapCenter = heatData.length > 0 ? [heatData[0].lat, heatData[0].lng] : [12.9716, 77.5946];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontWeight: 500 }}>{payload[0].payload.district_name || payload[0].payload.bns_primary_section || payload[0].payload.name}</div>
          <div style={{ color: payload[0].color || 'var(--cyan)' }}>{payload[0].value} cases</div>
        </div>
      );
    }
    return null;
  };

  const CardHeader = ({ title, dropdown = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', letterSpacing: '0.02em' }}>{title}</div>
      {dropdown && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
          AI Crime <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );

  return (
    <div ref={dashboardRef} className="arise-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px', background: '#000' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
          AI Crime Analysis
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportPDF} style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', transition: 'all 0.2s' }}>
            Export Report
          </button>
        </div>
      </div>

      {/* TOP COMMAND CENTER LAYER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '32px', alignItems: 'center' }}>
        
        {/* Left KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff' }}><FileText size={24} /></div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Cases</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{d.kpis?.totalFIRs || 0}</div>
            </div>
          </div>
          <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}><AlertCircle size={24} /></div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Open Cases</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{d.kpis?.openCases || 0}</div>
            </div>
          </div>
        </div>

        {/* Center Zia Orb */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <ZiaOrb />
        </div>

        {/* Right KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Fingerprint size={24} /></div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Forensic Cases</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{d.kpis?.forensicCases || 0}</div>
            </div>
          </div>
          <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Users size={24} /></div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Repeat Offenders</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{d.kpis?.repeatOffenders || 0}</div>
            </div>
          </div>
        </div>

      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Panel 1: Crime Trends (Dynamic Color BarChart) */}
          <div className="arise-card" style={{ padding: '20px', height: '340px' }}>
            <CardHeader title="Crime Trends (by District)" dropdown />
            <ResponsiveContainer width="100%" height="100%" style={{ paddingBottom: '20px' }}>
              <BarChart data={districtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="district_name" interval={0} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {districtChartData.map((entry, index) => {
                    const color = PIE_COLORS[index % PIE_COLORS.length];
                    return <Cell key={`cell-${index}`} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2: Incident Categories (Red Area Chart) */}
          <div className="arise-card glowing-area-red" style={{ padding: '20px', height: '280px' }}>
            <CardHeader title="Incident Categories" dropdown />
            <ResponsiveContainer width="100%" height="100%" style={{ paddingBottom: '20px' }}>
              <AreaChart data={sectionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="bns_primary_section" interval={0} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Area type="step" dataKey="count" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#redGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 3: Temporal Analysis (Cyan Bar Chart) */}
          <div className="arise-card glowing-bar-cyan" style={{ padding: '20px', height: '240px' }}>
            <CardHeader title="Temporal Analysis" dropdown />
            <ResponsiveContainer width="100%" height="100%" style={{ paddingBottom: '20px' }}>
              <BarChart data={timeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" interval={0} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" fill="#00e5ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Panel 4: Live Map Window */}
          <div className="arise-card" style={{ padding: '20px', height: '340px', display: 'flex', flexDirection: 'column' }}>
            <CardHeader title="Live Map View" dropdown />
            <div style={{ 
              flex: 1, 
              borderRadius: '8px', 
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--border-default)',
              zIndex: 1
            }}>
              <MapContainer 
                center={mapCenter} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }} 
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {heatData.slice(0, 50).map((pt, i) => (
                  <Marker 
                    key={i} 
                    position={[pt.lat, pt.lng]} 
                    icon={createGlowingIcon('#00e5ff')}
                  />
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Panel 5: Predictive Analysis */}
          <div className="arise-card" style={{ padding: '20px', height: '280px', display: 'flex', flexDirection: 'column' }}>
            <CardHeader title="Predictive Analysis" dropdown />
            <div style={{ flex: 1, position: 'relative', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectionChartData.slice(0,5)} dataKey="count" nameKey="bns_primary_section" innerRadius={65} outerRadius={95} stroke="none" paddingAngle={2}>
                    {sectionChartData.slice(0,5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text for Donut */}
              <div style={{ position: 'absolute', inset: 0, right: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{(d.kpis?.totalFIRs || 0)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
              </div>
            </div>
          </div>

          {/* Panel 6: Analogical Risk Zones Heatmap */}
          <div className="arise-card" style={{ padding: '20px', height: '240px', display: 'flex', flexDirection: 'column' }}>
            <CardHeader title="Risk Zones Heatmap" dropdown />
            <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-default)', position: 'relative', zIndex: 1 }}>
              <MapContainer 
                center={mapCenter} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }} 
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
                <HeatmapLayer heatData={heatData} />
              </MapContainer>
            </div>
          </div>

        </div>
      </div>

      {/* RESTORED BOTTOM SECTION: RANKING AND RECENT FIRS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '4px' }}>
        
        {/* Crime Ranking */}
        <div className="arise-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 16px 0' }}>Crime Ranking (Top Districts)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {districtChartData.slice(0, 5).map((dist, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>{i + 1}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{dist.district_name}</div>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--cyan)', fontWeight: 600 }}>{dist.count} cases</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent FIRs */}
        <div className="arise-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>Recent Incidents</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {processedFIRs.slice(0, 5).map((fir, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '13px', color: 'var(--cyan)', fontWeight: 500 }}>{fir.fir_no || fir.fir_uid}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(fir.fir_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#fff' }}>{fir.bns_primary_section}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {fir.district_name} ({fir.police_station})
                </div>
              </div>
            ))}
            {!(d.recentFIRs || []).length && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No recent incidents found.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
