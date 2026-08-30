import React from 'react';
import { useZia } from '../context/ZiaContext';
import { Volume2, Clock, Database, Terminal, Code } from 'lucide-react';

export default function Settings() {
  const { playbackRate, setPlaybackRate, speakDelay, setSpeakDelay } = useZia();

  const speedLabel = playbackRate < 0.9 ? 'Slow' : playbackRate < 1.1 ? 'Normal' : playbackRate < 1.4 ? 'Fast' : 'Very Fast';

  return (
    <div className="arise-page-enter" style={{ height: '100%', padding: '24px', background: 'transparent' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '24px', letterSpacing: '-0.02em' }}>
        System Settings
      </h2>

      <div className="arise-card" style={{ padding: '24px', maxWidth: '600px', background: 'var(--bg-card)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--amber)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Zia Voice Assistant Preferences
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Speed Control */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} className="text-amber-500" />
                Voice Playback Speed
              </label>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                {speedLabel} ({playbackRate.toFixed(2)}x)
              </span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.8"
              step="0.05"
              value={playbackRate}
              onChange={e => setPlaybackRate(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--amber)' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
              Adjusts how quickly Zia speaks. 1.0x is recommended for normal conversation flow.
            </p>
          </div>

          {/* Delay Control */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} className="text-amber-500" />
                Speech Delay
              </label>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                {(speakDelay / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={speakDelay}
              onChange={e => setSpeakDelay(parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--amber)' }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
              Adds a slight delay before Zia starts speaking to allow text rendering, if applicable.
            </p>
          </div>
        </div>
      </div>

      <div className="arise-card" style={{ padding: '24px', maxWidth: '800px', background: 'var(--bg-card)', marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--amber)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} />
          Data Seeding & Webhooks
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
              To ensure the ARISE dashboard reflects the latest analytical data without manual entry, police departments can integrate their existing CCTNS platforms using these secure webhooks. You must only push data to the recognized tables below to avoid backend rejection.
            </p>

            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} className="text-amber-500" />
              Supported CCTNS ZCQL Tables
            </h4>
            <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                'CaseMaster', 'Accused', 'ComplainantDetails', 'Victim', 'Unit', 'District',
                'ActSectionAssociation', 'ArrestSurrender', 'ChargesheetDetails',
                'modus_operandi_signature', 'geospatial_hotspot_indicator',
                'entity_association_graph', 'bail_custody_status', 'bsa_audit_trail'
              ].map(table => (
                <div key={table} style={{ color: '#00e5ff', fontSize: '13px', fontFamily: 'monospace', padding: '6px 10px', background: 'rgba(0, 229, 255, 0.1)', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  {table}
                </div>
              ))}
            </div>
            
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clean & Seed Endpoint (Full Wipe & Update)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--amber)', wordBreak: 'break-all' }}>
                GET https://&lt;your-catalyst-domain&gt;/server/get_crime_analytics/api/webhook/clean-and-seed
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} className="text-amber-500" />
              cURL: Automated Cron Integration
            </h4>
            <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', overflowX: 'auto', marginBottom: '24px' }}>
              <pre style={{ margin: 0, color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace' }}>
                <code>
{`# Execute the webhook to wipe and re-seed the database nightly
curl -X GET \\
  "https://<your-catalyst-domain>/server/get_crime_analytics/api/webhook/clean-and-seed" \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer <CCTNS_SECURE_TOKEN>"
`}
                </code>
              </pre>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={16} className="text-amber-500" />
              Python: CCTNS Middleware Sync Script
            </h4>
            <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
              <pre style={{ margin: 0, color: '#a78bfa', fontSize: '13px', fontFamily: 'monospace' }}>
                <code>
{`import requests
import logging

def sync_cctns_to_arise():
    """Trigger ARISE backend to clear old data and pull fresh CCTNS data."""
    webhook_url = "https://<your-catalyst-domain>/server/get_crime_analytics/api/webhook/clean-and-seed"
    headers = {"Accept": "application/json", "Authorization": "Bearer <CCTNS_SECURE_TOKEN>"}
    
    logging.info("Initiating ARISE Database Sync...")
    try:
        response = requests.get(webhook_url, headers=headers)
        response.raise_for_status()
        logging.info(f"Sync Successful: {response.json()}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Sync Failed. Error: {e}")

if __name__ == "__main__":
    sync_cctns_to_arise()`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

