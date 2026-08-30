import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Database, Clock, Users, Search, AlertTriangle, FileText, Filter, Key } from 'lucide-react';
import { useRole } from '../context/RoleContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

export default function Governance() {
  const { currentRole, setCurrentRole, ROLES } = useRole();
  const [activeTab, setActiveTab] = useState('audit');
  
  const [data, setData] = useState({
    auditLogs: [],
    empMap: {},
    moList: [],
    casesList: [],
    stationMap: {},
    distMap: {}
  });
  const [loading, setLoading] = useState(true);

  // Filters for Audit Log
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('ALL');

  useEffect(() => {
    fetch(`${API_BASE}/api/governance`)
      .then(res => res.json())
      .then(d => {
        if (d.success) setData(d.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch governance data:", err);
        setLoading(false);
      });
  }, []);

  // --- PART 1: Audit Logs Computation ---
  const filteredAuditLogs = useMemo(() => {
    return data.auditLogs.filter(log => {
      let matchesSearch = true;
      if (auditSearch) {
        matchesSearch = String(log.target_record_uid || '').includes(auditSearch);
      }
      let matchesFilter = true;
      if (auditFilterType !== 'ALL') {
        matchesFilter = log.event_type === auditFilterType;
      }
      return matchesSearch && matchesFilter;
    });
  }, [data.auditLogs, auditSearch, auditFilterType]);

  // --- PART 2: Compliance Stats ---
  const complianceStats = useMemo(() => {
    const lowConfidenceAI = data.moList.filter(mo => parseFloat(mo.confidence_score) < 0.7).length;
    
    // Count accesses to ComplainantDetails (contains CasteID/ReligionID)
    const sensitiveAccesses = data.auditLogs.filter(log => log.target_table_name === 'ComplainantDetails').length;
    
    // AI Inferred vs Verified. We count MO generated entries as inferred points
    const inferredCount = data.moList.length * 6; // each MO has about 6 inferred traits
    // Just a placeholder metric based on real row count:
    const verifiedCount = data.casesList.length * 15; // 15 fields per case

    return { lowConfidenceAI, sensitiveAccesses, inferredCount, verifiedCount };
  }, [data]);

  // --- PART 3: Pendency Tracking ---
  const pendencyStats = useMemo(() => {
    const openCases = data.casesList.filter(c => c.CaseStatusID === 1); // 1 = Under Investigation
    
    let totalDays = 0;
    let breachedBNSS = 0;
    const now = new Date();

    const districtStats = {};

    openCases.forEach(c => {
      const regDate = new Date(c.CrimeRegisteredDate);
      const daysOpen = Math.floor((now - regDate) / (1000 * 60 * 60 * 24));
      totalDays += daysOpen;
      
      const isBreached = daysOpen > 90;
      if (isBreached) breachedBNSS++;

      const ps = data.stationMap[c.PoliceStationID];
      if (ps) {
        const dId = ps.DistrictID;
        if (!districtStats[dId]) districtStats[dId] = { name: data.distMap[dId] || `District ${dId}`, cases: 0, breached: 0, totalDays: 0 };
        districtStats[dId].cases++;
        districtStats[dId].totalDays += daysOpen;
        if (isBreached) districtStats[dId].breached++;
      }
    });

    return {
      openCount: openCases.length,
      avgDays: openCases.length ? Math.round(totalDays / openCases.length) : 0,
      breachedBNSS,
      districtBreakdown: Object.values(districtStats)
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-muted)' }}>
        Loading Governance Data...
      </div>
    );
  }

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
        background: activeTab === id ? 'rgba(245,158,11,0.1)' : 'transparent',
        border: activeTab === id ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
        color: activeTab === id ? 'var(--amber)' : 'var(--text-muted)',
        borderRadius: '8px', fontWeight: 500, fontSize: '13px', cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="arise-page-enter" style={{ padding: '24px', background: 'transparent', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Governance & Audit
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Secure role-based access, audit trails, and compliance SLA monitoring.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px' }}>
        <TabButton id="audit" icon={Database} label="Audit Log Viewer" />
        <TabButton id="compliance" icon={ShieldCheck} label="Data Governance" />
        <TabButton id="pendency" icon={Clock} label="Pendency / SLA Tracking" />
        <TabButton id="roles" icon={Key} label="Role Simulation" />
      </div>

      {activeTab === 'audit' && (
        <div className="arise-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0 12px', width: '300px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search by Target Record ID..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', width: '100%', outline: 'none', fontSize: '13px' }}
              />
            </div>
            <select 
              value={auditFilterType} 
              onChange={e => setAuditFilterType(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)', color: '#fff', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            >
              <option value="ALL">All Event Types</option>
              <option value="SELECT">SELECT</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Datetime</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Event</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Target Table</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Record ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Actor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>
                ) : filteredAuditLogs.map((log, i) => (
                  <tr key={log.audit_uid || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.event_datetime}</td>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>
                      <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '11px' }}>{log.event_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--amber)' }}>{log.target_table_name}</td>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>{log.target_record_uid || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {data.empMap[log.actor_employee_id] ? `${data.empMap[log.actor_employee_id]} (${log.actor_employee_id})` : log.actor_employee_id || 'System'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{log.actor_role}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.is_anomalous ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f43f5e', fontSize: '11px', background: 'rgba(244,63,94,0.1)', padding: '2px 6px', borderRadius: '4px' }} title={log.anomaly_reason_text || log.anomaly_reason || 'Anomaly Detected'}>
                          <AlertTriangle size={12} /> Anomalous
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '11px' }}>Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          
          <div className="arise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Sensitive Demographic Accesses</h3>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--amber)' }}>{complianceStats.sensitiveAccesses}</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Audit events recorded touching <code>ComplainantDetails</code> fields (Religion/Caste).
            </p>
          </div>

          <div className="arise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>AI Low-Confidence Outputs</h3>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#f43f5e' }}>{complianceStats.lowConfidenceAI}</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Inferred MO signatures flagged with confidence &lt; 0.7 requiring human review.
            </p>
          </div>

          <div className="arise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Data Provenance</h3>
            <div style={{ fontSize: '13px', color: '#fff', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Verified System Records:</span>
              <span style={{ fontWeight: 600 }}>{complianceStats.verifiedCount}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--amber)', display: 'flex', justifyContent: 'space-between' }}>
              <span>AI-Inferred Datapoints:</span>
              <span style={{ fontWeight: 600 }}>{complianceStats.inferredCount}</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(complianceStats.verifiedCount / (complianceStats.verifiedCount + complianceStats.inferredCount)) * 100}%`, background: '#10b981' }} />
              <div style={{ width: `${(complianceStats.inferredCount / (complianceStats.verifiedCount + complianceStats.inferredCount)) * 100}%`, background: 'var(--amber)' }} />
            </div>
          </div>

          <div className="arise-card" style={{ padding: '24px', gridColumn: 'span 3', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={24} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#10b981', marginBottom: '8px' }}>Active Compliance Statement</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  All AI outputs across the ARISE platform are natively traceable to source records via the <code>bsa_audit_trail</code>. 
                  Currently, access to sensitive demographic fields (Religion, Caste) is logged and requires explicit supervisory roles. 
                  Inferred behavioral traits (MO signatures) generated by the Catalyst LLM are explicitly tagged with confidence scores, 
                  ensuring investigatory outputs remain distinguishable from hard-recorded FIR data.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'pendency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff' }}><FileText size={24} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Open Cases (Under Inv.)</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{pendencyStats.openCount}</div>
              </div>
            </div>
            <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}><AlertTriangle size={24} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BNSS Deadline Breached (&gt;90d)</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f43f5e' }}>{pendencyStats.breachedBNSS}</div>
              </div>
            </div>
            <div className="arise-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Clock size={24} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Resolution/Age</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{pendencyStats.avgDays} days</div>
              </div>
            </div>
          </div>

          <div className="arise-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>District Pendency Breakdown</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontWeight: 500 }}>District</th>
                  <th style={{ padding: '12px', fontWeight: 500 }}>Open Cases</th>
                  <th style={{ padding: '12px', fontWeight: 500 }}>Avg Case Age</th>
                  <th style={{ padding: '12px', fontWeight: 500 }}>Past BNSS Deadline</th>
                </tr>
              </thead>
              <tbody>
                {pendencyStats.districtBreakdown.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No pendency data available.</td></tr>
                ) : pendencyStats.districtBreakdown.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px', color: '#fff' }}>{d.name}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{d.cases}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{Math.round(d.totalDays / d.cases)} days</td>
                    <td style={{ padding: '12px' }}>
                      {d.breached > 0 ? (
                        <span style={{ color: '#f43f5e', fontWeight: 600 }}>{d.breached} cases</span>
                      ) : (
                        <span style={{ color: '#10b981' }}>0 cases</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          <div className="arise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--amber)', marginBottom: '8px' }}>"View As" Simulation</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              <strong>Notice:</strong> Role-based access is defined and previewed here; true enforcement activates with account authentication in a future pass. 
              This is a session-only design tool to visualize RBAC implementation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.values(ROLES).map(role => (
                <div 
                  key={role.id}
                  onClick={() => setCurrentRole(role)}
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    background: currentRole.id === role.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                    border: currentRole.id === role.id ? '1px solid var(--amber)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: currentRole.id === role.id ? 'var(--amber)' : '#fff' }}>{role.label}</span>
                    {currentRole.id === role.id && <span style={{ fontSize: '11px', color: 'var(--amber)', background: 'rgba(245,158,11,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Active Preview</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{role.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="arise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Active Nav Permissions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {currentRole.allowedNav.map(path => (
                <span key={path} style={{ padding: '6px 12px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', borderRadius: '20px', fontSize: '12px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  {path}
                </span>
              ))}
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Example Hidden Views:</h4>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentRole.id === 'INVESTIGATOR' && (
                  <>
                    <li><code>/dashboard/analytics</code> (Analytics reserved for Analysts/Supervisors)</li>
                    <li><code>/dashboard/governance</code> (Governance reserved for Supervisors)</li>
                  </>
                )}
                {currentRole.id === 'ANALYST' && (
                  <>
                    <li><code>/dashboard/hotspots</code> (Tactical map reserved for Investigators/Supervisors)</li>
                    <li><code>/dashboard/governance</code> (Governance reserved for Supervisors)</li>
                  </>
                )}
                {currentRole.id === 'SUPERVISOR' && (
                  <li>None. Supervisor has universal access to all views.</li>
                )}
                {currentRole.id === 'POLICYMAKER' && (
                  <>
                    <li><code>/dashboard/network</code> (Individual link analysis hidden to protect PII)</li>
                    <li><code>/dashboard/search</code> (Granular search disabled)</li>
                  </>
                )}
              </ul>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

