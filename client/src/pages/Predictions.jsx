import React, { useState, useEffect } from 'react';
import { useT } from '../i18n/useT';
import { Link } from 'react-router-dom';

const Predictions = () => {
  const t = useT();
  const [alerts, setAlerts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE || '';
        const [resAlerts, resLeaderboard, resForecast, resAnomalies] = await Promise.all([
          fetch(`${baseUrl}/api/predict/early-warning`).then(r => r.json()),
          fetch(`${baseUrl}/api/predict/risk-leaderboard`).then(r => r.json()),
          fetch(`${baseUrl}/api/predict/forecast`).then(r => r.json()),
          fetch(`${baseUrl}/api/predict/anomalies`).then(r => r.json())
        ]);
        
        if (resAlerts.success) setAlerts(resAlerts.data.alerts || []);
        if (resLeaderboard.success) setLeaderboard(resLeaderboard.data.leaderboard || []);
        if (resForecast.success) setForecasts(resForecast.data.forecasts || []);
        if (resAnomalies.success) setAnomalies(resAnomalies.data.anomalies || []);
      } catch (err) {
        console.error('Failed to fetch predictions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const triggerQuickMLRescore = async (offenderUid) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || '';
      const res = await fetch(`${baseUrl}/api/predict/quickml-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offenderUid })
      });
      const data = await res.json();
      if (data.success) {
        // Update leaderboard locally
        setLeaderboard(prev => prev.map(o => 
          o.offenderUid === offenderUid 
            ? { ...o, riskScore: data.data.predictedScore, threatLevel: data.data.predictedScore >= 0.9 ? 'CRITICAL' : data.data.predictedScore >= 0.7 ? 'HIGH' : data.data.predictedScore >= 0.5 ? 'MEDIUM' : 'LOW' }
            : o
        ).sort((a, b) => b.riskScore - a.riskScore).map((o, idx) => ({ ...o, rank: idx + 1 })));
        
        alert(`Rescore complete. Old score: ${data.data.storedScore.toFixed(2)}, New QuickML score: ${data.data.predictedScore.toFixed(2)}`);
      }
    } catch (err) {
      console.error('QuickML Error', err);
      alert('Error triggering QuickML rescore');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border-active)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="arise-page-enter min-h-screen bg-[var(--bg-base)] p-6 text-[var(--text-primary)] font-[var(--font-sans)]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('pred.title')}</h1>
        <p className="mt-2 text-[var(--text-secondary)]">{t('pred.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Column - Active Alerts */}
        <div className="col-span-1 flex flex-col gap-6 lg:col-span-8">
          <section className="arise-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('pred.activeAlerts')}</h2>
              <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <div className="h-2 w-2 rounded-full bg-[var(--red)] animate-pulse"></div>
                Live system
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="arise-card p-8 text-center text-[var(--text-muted)]">
                {t('pred.allClear')}
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 transition-colors hover:border-[#71717a] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 flex h-2 w-2 shrink-0 rounded-full ${
                        alert.severity === 'CRITICAL' ? 'bg-[var(--red)] shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                        alert.severity === 'HIGH' ? 'bg-[var(--amber)]' :
                        'bg-[#facc15]'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[var(--border-active)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                            {alert.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h3 className="mt-1 font-medium">{alert.title}</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{alert.message}</p>
                      </div>
                    </div>
                    <Link to={alert.actionLink} className="self-start rounded bg-[#fafafa]/10 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[#fafafa]/20 sm:self-auto">
                      {t('pred.investigate')}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* District Forecast */}
          <section className="arise-card p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('pred.forecast')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[var(--text-muted)]">
                    <th className="pb-3 font-medium">District</th>
                    <th className="pb-3 font-medium text-right">Current Week</th>
                    <th className="pb-3 font-medium text-right">Predicted Next</th>
                    <th className="pb-3 font-medium text-right">Trend</th>
                    <th className="pb-3 font-medium text-right">Confidence</th>
                    <th className="pb-3 font-medium">Dominant Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {forecasts.map(f => (
                    <tr key={f.district} className="hover:bg-[var(--border-active)]/30">
                      <td className="py-3 font-medium">{f.district}</td>
                      <td className="py-3 text-right">{f.currentWeekCount}</td>
                      <td className="py-3 text-right font-medium text-white">{f.predictedNextWeek}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 ${
                          f.trend === 'up' ? 'text-[var(--red)]' :
                          f.trend === 'down' ? 'text-[var(--green)]' :
                          'text-[var(--text-secondary)]'
                        }`}>
                          {f.trend === 'up' ? '↗' : f.trend === 'down' ? '↘' : '→'}
                          {f.changePercent > 0 ? '+' : ''}{f.changePercent}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-active)]">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${f.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">{f.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)]">{f.dominantSection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Anomaly Detection */}
          <section className="arise-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('pred.anomalies')}</h2>
              <span className="text-sm text-[var(--text-muted)]">{t('pred.baseline')} active</span>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {anomalies.map(anomaly => (
                <div key={anomaly.firUid} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-16 w-16 translate-x-8 -translate-y-8 rotate-45 bg-[#fafafa]/10"></div>
                  
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--text-secondary)]">{anomaly.firUid}</span>
                    <span className="rounded bg-[#fafafa]/20 px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                      Score: {anomaly.anomalyScore.toFixed(2)}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-white">{anomaly.crimeCategory || anomaly.section}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{anomaly.district} • {anomaly.timeSlot}</p>
                  
                  <div className="mt-3 space-y-1">
                    {anomaly.reasons.map((reason, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="text-[var(--text-primary)]">•</span> {reason}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Leaderboard */}
        <div className="col-span-1 lg:col-span-4">
          <section className="arise-card p-6 sticky top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('pred.highRiskWatch')}</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#fafafa]"></div>
                <span className="text-xs font-medium text-[var(--text-primary)]">{t('pred.quickmlActive')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {leaderboard.map(offender => (
                <div key={offender.offenderUid} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--border-active)] font-mono text-xs font-bold text-[var(--text-secondary)]">
                        #{offender.rank}
                      </div>
                      <div>
                        <h3 className="font-medium">{offender.fullName}</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={
                            offender.threatLevel === 'CRITICAL' ? 'text-[var(--red)]' :
                            offender.threatLevel === 'HIGH' ? 'text-[var(--amber)]' :
                            'text-[#facc15]'
                          }>
                            Risk: {(offender.riskScore * 100).toFixed(0)}%
                          </span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-[var(--text-secondary)]">{offender.currentStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offender.isRowdy && (
                      <span className="rounded bg-[var(--red)]/10 px-2 py-0.5 text-xs text-[var(--red)]">Rowdy Sheeter</span>
                    )}
                    {offender.isRepeat && (
                      <span className="rounded bg-[var(--amber)]/10 px-2 py-0.5 text-xs text-[var(--amber)]">Repeat Offender</span>
                    )}
                    {offender.gang && (
                      <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">{offender.gang}</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => triggerQuickMLRescore(offender.offenderUid)}
                    className="mt-3 w-full rounded border border-[var(--border-default)] bg-transparent py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-active)] hover:text-white"
                  >
                    {t('pred.rescoreAI')}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 border-t border-[var(--border-default)] pt-4 text-center">
              <a href="https://console.catalyst.zoho.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                {t('pred.configureConsole')} ↗
              </a>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default Predictions;
