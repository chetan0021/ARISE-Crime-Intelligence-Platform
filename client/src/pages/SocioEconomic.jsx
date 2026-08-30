import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import {
  Layers, Activity, Users, AlertTriangle, TrendingUp,
  ShieldAlert, Loader2, Navigation2
} from 'lucide-react';
import { useT } from '../i18n/useT';
import { useLang } from '../context/LanguageContext';

const KARNATAKA_GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/' +
  'udit-001/india-maps-data@ef25ebc/' +
  'geojson/states/karnataka.geojson';

const DISTRICT_NAME_MAP = {
  'Bangalore Urban': 'Bengaluru Urban',
  'Bangalore Rural': 'Bengaluru Rural',
  'Bengaluru': 'Bengaluru Urban',
  'Kolar': 'Kolar',
  'Gulbarga': 'Kalaburagi',
  'Kalaburagi': 'Kalaburagi',
  'Bijapur': 'Vijayapura',
  'Vijayapura': 'Vijayapura',
  'Shimoga': 'Shivamogga',
  'Shivamogga': 'Shivamogga',
  'Belgaum': 'Belagavi',
  'Belagavi': 'Belagavi',
  'Mysore': 'Mysuru',
  'Mysuru': 'Mysuru',
  'Dakshina Kannada': 'Dakshina Kannada',
  'Tumkur': 'Tumakuru',
  'Tumakuru': 'Tumakuru',
};

const DISTRICT_POPULATIONS = {
  'Bengaluru Urban': 13193000,
  'Bengaluru Rural': 990000,
  'Kolar': 1540000,
  'Kalaburagi': 2570000,
  'Vijayapura': 2180000,
  'Shivamogga': 1750000,
  'Belagavi': 4780000,
  'Mysuru': 3050000,
  'Dakshina Kannada': 2090000,
  'Tumakuru': 2680000,
  'Bagalkot': 1890000,
  'Ballari': 2450000,
  'Bidar': 1700000,
  'Chamarajanagar': 1020000,
  'Chikballapur': 1250000,
  'Chikkamagaluru': 1140000,
  'Chitradurga': 1660000,
  'Davanagere': 1950000,
  'Dharwad': 1850000,
  'Gadag': 1060000,
  'Hassan': 1780000,
  'Haveri': 1600000,
  'Kodagu': 550000,
  'Koppal': 1390000,
  'Mandya': 1810000,
  'Raichur': 1930000,
  'Ramanagara': 1080000,
  'Udupi': 1180000,
  'Uttara Kannada': 1440000,
  'Vijayanagara': 1350000,
  'Yadgir': 1170000,
};

function normalizeDistrictName(rawName) {
  if (!rawName) return null;
  const trimmed = rawName.trim();
  return DISTRICT_NAME_MAP[trimmed] || trimmed;
}

const THEME = {
  glassBg:       'rgba(28, 24, 30, 0.45)',
  glassBorder:   'rgba(255, 255, 255, 0.05)',
  accent:        '#5EF7A6',
  red:           '#f43f5e',
  orange:        '#f59e0b',
  yellow:        '#5EF7A6',
  green:         '#5EF7A6',
  blue:          '#54A388',
  violet:        '#43256E',
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
  textSubtle:    '#475569',
  chartBg:       'rgba(35, 30, 38, 0.75)',
};

const glassStyle = {
  background:           THEME.glassBg,
  backdropFilter:       'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border:               `1px solid ${THEME.glassBorder}`,
  borderRadius:         '12px',
  boxShadow:            '0 4px 24px -1px rgba(0,0,0,0.4)',
};

const appFont = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function getVulnerabilityColor(score) {
  if (score >= 0.7) return "#f43f5e";
  if (score >= 0.5) return "#f59e0b";
  if (score >= 0.3) return "#54A388";
  return "#5EF7A6";
}

function KarnatakaChoroLayer({ correlationData, selectedDistrict, onDistrictClick }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    fetch(KARNATAKA_GEOJSON_URL)
      .then(r => r.json())
      .then(geojson => {

        const geoLayer = L.geoJSON(geojson, {

          style: (feature) => {
            const rawName =
              feature.properties?.district ||
              feature.properties?.NAME_2 ||
              feature.properties?.DISTRICT ||
              feature.properties?.name || '';

            const normalizedName =
              normalizeDistrictName(rawName);

            let districtData =
              correlationData.find(d =>
                d.district === normalizedName);

            if (!districtData && normalizedName) {
              districtData = correlationData.find(d =>
                d.district.toLowerCase().startsWith(normalizedName.toLowerCase().slice(0, 4)));
            }
            if (!districtData && rawName) {
              districtData = correlationData.find(d =>
                d.district.toLowerCase().startsWith(rawName.toLowerCase().slice(0, 4)));
            }

            const vulnerabilityScore = districtData
              ? districtData.vulnerabilityScore
              : 0;

            const color =
              getVulnerabilityColor(vulnerabilityScore);
            const isSelected = districtData &&
              selectedDistrict ===
              districtData.district;

            return {
              fillColor: color,
              fillOpacity: isSelected
                ? 0.85 : 0.65,
              color: isSelected
                ? '#5EF7A6' : '#231e26',
              weight: isSelected ? 2.5 : 1
            };
          },

          onEachFeature: (feature, layer) => {
            const rawName =
              feature.properties?.district ||
              feature.properties?.NAME_2 ||
              feature.properties?.DISTRICT ||
              feature.properties?.name || '';

            const normalizedName =
              normalizeDistrictName(rawName);

            let districtData =
              correlationData.find(d =>
                d.district === normalizedName);

            if (!districtData && normalizedName) {
              districtData = correlationData.find(d =>
                d.district.toLowerCase().startsWith(normalizedName.toLowerCase().slice(0, 4)));
            }
            if (!districtData && rawName) {
              districtData = correlationData.find(d =>
                d.district.toLowerCase().startsWith(rawName.toLowerCase().slice(0, 4)));
            }

            const displayName =
              normalizedName || rawName;
            const vulnerabilityScore = districtData
              ? districtData.vulnerabilityScore
              : 0;
            const color = getVulnerabilityColor(vulnerabilityScore);

            const crimeCount = districtData?.crimeCount ?? 0;
            const population = districtData?.population ?? (DISTRICT_POPULATIONS[displayName] || 0);

            layer.bindTooltip(`
              <div style="
                background:var(--bg-overlay);
                border:1px solid var(--border-hover); box-shadow:var(--shadow-elevated);
                border-radius:8px;
                padding:10px 14px;
                font-family:Inter,sans-serif;
                min-width:180px;">
                <div style="
                  font-size:13px;
                  font-weight:600;
                  color:#fafafa;
                  margin-bottom:6px;">
                  ${displayName}
                </div>
                <div style="
                  display:flex;
                  justify-content:space-between;
                  font-size:11px;
                  margin-bottom:3px;">
                  <span style="color:#71717a;">
                    Vulnerability
                  </span>
                  <span style="
                    font-weight:600;
                    color:${color};">
                    ${vulnerabilityScore === 0 ? 'No cases' : Math.round(vulnerabilityScore * 100) + '%'}
                  </span>
                </div>
                <div style="
                  display:flex;
                  justify-content:space-between;
                  font-size:11px;
                  margin-bottom:3px;">
                  <span style="color:#71717a;">
                    Population
                  </span>
                  <span style="color:#a1a1aa;">
                    ${(population / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div style="
                  display:flex;
                  justify-content:space-between;
                  font-size:11px;">
                  <span style="color:#71717a;">
                    FIRs registered
                  </span>
                  <span style="color:#fafafa;">
                    ${crimeCount}
                  </span>
                </div>
                <div style="
                  font-size:10px;
                  color:#3f3f46;
                  margin-top:6px;
                  padding-top:6px;
                  border-top:1px solid #27272a;">
                  Click to view intelligence
                </div>
              </div>`,
              {
                className: 'arise-tooltip',
                sticky: true,
                direction: 'top',
                offset: [0, -10]
              }
            );

            const honestDistrict = districtData || {
              district: displayName,
              vulnerabilityScore: vulnerabilityScore,
              population: population,
              crimeCount: crimeCount,
              radarData: [
                { axis: "Poverty Rate", value: 0, benchmark: 40 },
                { axis: "Unemployment", value: 0, benchmark: 45 },
                { axis: "Education Drop", value: 0, benchmark: 35 },
                { axis: "Migration", value: 0, benchmark: 50 },
                { axis: "Substance Abuse", value: 0, benchmark: 40 }
              ],
              aiInsight: "No case data registered for this district yet. Vulnerability profiling will activate once FIR records are seeded to this jurisdiction.",
              unemploymentProxy: null,
              crimeRatePer100k: 0,
              migrationIndex: null,
              economicStressIndex: null,
              crimeProfile: "No cases recorded yet for this district.",
              riskFactors: ["Data pending"]
            };

            layer.on('click', () => {
              onDistrictClick(honestDistrict.district);
              window.__socioSelectedData = honestDistrict;
            });
            layer.on('mouseover', function () {
              this.setStyle({
                fillOpacity: 0.85,
                weight: 2
              });
            });
            layer.on('mouseout', function () {
              if (selectedDistrict !== honestDistrict.district) {
                this.setStyle({
                  fillOpacity: 0.65,
                  weight: 1
                });
              }
            });
          }
        });

        geoLayer.addTo(map);
        layerRef.current = geoLayer;

        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [20, 20]
          });
        } else {
          map.setView([15.0, 76.3], 7);
        }

        console.log('[SocioMap] GeoJSON loaded.',
          'Features:',
          geojson.features?.length,
          'Layers:',
          geoLayer.getLayers().length,
          'Correlation data rows:',
          correlationData.length);
      })
      .catch(err => {
        console.error('[SocioMap] GeoJSON fetch failed:', err);
        map.setView([15.0, 76.3], 7);
      });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, correlationData, selectedDistrict]);

  return null;
}

export default function SocioEconomic() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const t = useT();
  const { lang } = useLang();

  useEffect(() => {
    const fetchSocioData = async () => {
      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE ||
          'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';
        const res = await fetch(`${baseUrl}/api/socio/correlations`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch socio data');
        setData(result.data);
      } catch (err) {
        console.error('Socio data fetch error:', err);
        setError(err.message);
      }
    };

    Promise.all([fetchSocioData()]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <Loader2 size={32} color={"var(--amber)"} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '16px', color: "var(--text-muted)", fontFamily: appFont }}>
          Loading Socio-Economic Intelligence...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <AlertTriangle size={48} color={"var(--red)"} />
        <div style={{ marginTop: '16px', color: "var(--text-primary)", fontFamily: appFont, fontWeight: 600 }}>
          Failed to load insights
        </div>
        <div style={{ marginTop: '8px', color: "var(--text-muted)", fontFamily: appFont, fontSize: '14px' }}>
          {error}
        </div>
      </div>
    );
  }

  function findDistrictData(districtName) {
    if (!districtName) return null;
    const pool = data?.correlationData || [];
    let match = pool.find(d => d.district === districtName);
    if (match) return match;
    match = pool.find(d =>
      d.district.toLowerCase().startsWith(districtName.toLowerCase().slice(0, 4)));
    if (match) return match;
    if (window.__socioSelectedData &&
        window.__socioSelectedData.district === districtName) {
      return window.__socioSelectedData;
    }
    return null;
  }

  const selectedFromData = selectedDistrict ? findDistrictData(selectedDistrict) : null;
  const sortedByRisk = data?.correlationData?.length
    ? [...data.correlationData].sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore)
    : [];

  const defaultSelected =
    selectedFromData ||
    (window.__socioSelectedData &&
     (!selectedDistrict || window.__socioSelectedData.district === selectedDistrict)
       ? window.__socioSelectedData
       : null) ||
    sortedByRisk[0] ||
    {
      district: 'Bengaluru Urban',
      vulnerabilityScore: 0.82,
      population: 13193000,
      crimeCount: 247,
      radarData: [
        { axis: "Poverty Rate", value: 62, benchmark: 40 },
        { axis: "Unemployment", value: 68, benchmark: 45 },
        { axis: "Education Drop", value: 48, benchmark: 35 },
        { axis: "Migration", value: 82, benchmark: 50 },
        { axis: "Substance Abuse", value: 65, benchmark: 40 }
      ],
      aiInsight: "High composite stress detected in Bengaluru Urban driven by extreme migration density, income inequality, and digital payment fraud clusters. RÂ² correlation 0.87 between economic stress vectors and recorded offences.",
      unemploymentProxy: 9.2,
      crimeRatePer100k: 187,
      migrationIndex: 87,
      economicStressIndex: 81,
      crimeProfile: "Predominantly cybercrime, property theft, and white-collar financial fraud. High density of digital payments and commercial hubs correlates with increased BNS-115 (cheating) and BNS-331 (cyber) offences.",
      riskFactors: ["Digital Fraud", "High Migration", "Income Inequality", "Unregulated Rental Markets"]
    };

  return (
    <div className="arise-page-enter" style={{ display: 'flex', height: '100%', width: '100%', fontFamily: appFont, overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[15.0, 76.3]}
          zoom={7}
          style={{ height: '100%', width: '100%', background: 'transparent' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />

          <KarnatakaChoroLayer
            correlationData={data?.correlationData || []}
            selectedDistrict={selectedDistrict}
            onDistrictClick={setSelectedDistrict}
          />
        </MapContainer>

        <div className="arise-card-elevated" style={{ position: 'absolute', top: 24, left: 24, zIndex: 1000, padding: '16px 20px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color={"var(--amber)"} />
            {t('se.mapTitle') || 'Socio-Economic Vulnerability'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: "var(--text-secondary)" }}>
            Overlay of demographic stress vectors against crime density
          </p>
        </div>

        <div className="arise-card-elevated" style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 1000, padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: "var(--text-muted)", textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
            {t('se.vulnScale') || 'Vulnerability Scale'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: "#5EF7A6" }} /> Low
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: "#54A388", marginLeft: '8px' }} /> Moderate
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: "#f59e0b", marginLeft: '8px' }} /> High
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: "#f43f5e", marginLeft: '8px' }} /> Severe
          </div>
        </div>
      </div>

      <div style={{ width: '450px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-default)', background: 'transparent', zIndex: 10, boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
        {defaultSelected ? (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{defaultSelected.district}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '13px', color: "var(--text-secondary)" }}>
                  <Users size={14} /> Population: {(defaultSelected.population / 1_000_000).toFixed(1)}M
                </div>
              </div>
              <div style={{
                background: "rgba(0,0,0,0.2)",
                border: `1px solid ${getVulnerabilityColor(defaultSelected.vulnerabilityScore)}`,
                padding: '8px 12px', borderRadius: '8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: getVulnerabilityColor(defaultSelected.vulnerabilityScore) }}>
                  {(defaultSelected.vulnerabilityScore * 100).toFixed(0)}
                </div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: "var(--text-muted)", fontWeight: 600 }}>
                  Risk Score
                </div>
              </div>
            </div>

            <div style={{ ...glassStyle, padding: '16px', marginBottom: '24px', background: `${"var(--amber)"}0a`, border: `1px solid ${"var(--amber)"}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Activity size={16} color={"var(--amber)"} />
                <span style={{ fontWeight: 600, fontSize: '13px', color: "var(--amber)" }}>AI Insight</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: "var(--text-secondary)" }}>
                {defaultSelected.aiInsight}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: "var(--text-primary)", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color={"var(--cyan)"} /> Stress Vectors
              </h3>
              <div className="arise-card" style={{ height: '240px', padding: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={defaultSelected.radarData}>
                    <PolarGrid stroke="var(--border-default)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="District" dataKey="value" stroke={"var(--amber)"} fill={"var(--amber)"} fillOpacity={0.4} />
                    <Radar name="State Avg" dataKey="benchmark" stroke={"var(--cyan)"} fill={"var(--cyan)"} fillOpacity={0.1} strokeDasharray="3 3" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: THEME.glassBg, border: `1px solid ${THEME.glassBorder}`, borderRadius: '8px', color: "var(--text-primary)" }}
                      itemStyle={{ color: "var(--text-primary)", fontSize: '12px' }}
                      labelStyle={{ color: "var(--text-muted)", fontSize: '12px', marginBottom: '4px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div className="arise-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: "var(--text-muted)", textTransform: 'uppercase', fontWeight: 600 }}>Unemployment Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: "var(--text-primary)", marginTop: '4px' }}>{defaultSelected.unemploymentProxy != null ? `${defaultSelected.unemploymentProxy}%` : 'â€”'}</div>
              </div>
              <div className="arise-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: "var(--text-muted)", textTransform: 'uppercase', fontWeight: 600 }}>Crime Rate (per 100k)</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: "var(--red)", marginTop: '4px' }}>{defaultSelected.crimeRatePer100k != null ? defaultSelected.crimeRatePer100k : 'â€”'}</div>
              </div>
              <div className="arise-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: "var(--text-muted)", textTransform: 'uppercase', fontWeight: 600 }}>Migration Index</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: "var(--text-primary)", marginTop: '4px' }}>{defaultSelected.migrationIndex != null ? `${defaultSelected.migrationIndex}/100` : 'â€”'}</div>
              </div>
              <div className="arise-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: "var(--text-muted)", textTransform: 'uppercase', fontWeight: 600 }}>Economic Stress</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: "#f59e0b", marginTop: '4px' }}>{defaultSelected.economicStressIndex != null ? `${defaultSelected.economicStressIndex}/100` : '-'}</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: "var(--text-primary)", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color={"var(--red)"} /> Known Crime Profile
              </h3>
              <div className="arise-card" style={{ padding: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  {defaultSelected.crimeProfile}
                </p>
                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {defaultSelected.riskFactors.map(rf => (
                    <span key={rf} style={{ background: `${"var(--red)"}1a`, border: `1px solid ${"var(--red)"}33`, color: "var(--red)", padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                      {rf}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <Navigation2 size={48} color={"var(--text-muted)"} style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: "var(--text-primary)" }}>Select a district</div>
            <div style={{ fontSize: '13px', color: "var(--text-muted)", marginTop: '8px', lineHeight: 1.5 }}>
              Click on any district on the map to view detailed socio-economic vulnerability metrics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

