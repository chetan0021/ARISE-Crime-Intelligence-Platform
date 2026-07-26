import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const THEME = {
  base: 'var(--bg-base)',
  surface1: 'var(--bg-card)',
  surface2: 'var(--bg-overlay)',
  border: 'var(--border-default)',
  borderHover: 'var(--border-active)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  accent: 'var(--amber)',
  fontFamily: 'var(--font-sans)'
};

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return windowSize;
}

const StatItem = ({ endValue, label, suffix = "" }) => {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let startTimestamp = null;
          const duration = 2000;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setValue(Math.floor(easeOut * endValue));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [endValue]);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: '48px', fontWeight: 700, color: THEME.textPrimary, lineHeight: 1.1 }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: '14px', color: THEME.textMuted, textTransform: 'uppercase', fontVariant: 'small-caps', letterSpacing: '0.05em', marginTop: '8px', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinkStyle = {
    color: THEME.textSecondary,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.2s',
  };

  const primaryBtnStyle = {
    backgroundColor: THEME.accent,
    color: '#09090b',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: THEME.fontFamily,
    transition: 'background-color 0.2s',
  };

  const ghostBtnStyle = {
    backgroundColor: 'transparent',
    color: THEME.textPrimary,
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: THEME.fontFamily,
  };

  const outlineBtnStyle = {
    backgroundColor: 'transparent',
    color: THEME.accent,
    border: `1px solid ${THEME.accent}`,
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: THEME.fontFamily,
  };

  return (
    <div style={{ backgroundColor: THEME.base, color: THEME.textPrimary, fontFamily: THEME.fontFamily, minHeight: '100vh', margin: 0, padding: 0 }}>
      {/* 1. STICKY NAV */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${THEME.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: THEME.accent, fontSize: '20px' }}>◆</span>
          <span style={{ fontWeight: 700, fontSize: '18px', tracking: '-0.02em' }}>ARISE</span>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: '32px' }}>
            <span style={navLinkStyle} onClick={() => scrollTo('platform')} onMouseEnter={(e) => e.target.style.color = THEME.textPrimary} onMouseLeave={(e) => e.target.style.color = THEME.textSecondary}>Platform</span>
            <span style={navLinkStyle} onClick={() => scrollTo('intelligence')} onMouseEnter={(e) => e.target.style.color = THEME.textPrimary} onMouseLeave={(e) => e.target.style.color = THEME.textSecondary}>Intelligence</span>
            <span style={navLinkStyle} onClick={() => scrollTo('security')} onMouseEnter={(e) => e.target.style.color = THEME.textPrimary} onMouseLeave={(e) => e.target.style.color = THEME.textSecondary}>Security</span>
            <span style={navLinkStyle} onClick={() => scrollTo('deployment')} onMouseEnter={(e) => e.target.style.color = THEME.textPrimary} onMouseLeave={(e) => e.target.style.color = THEME.textSecondary}>Deployment</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
          {!isMobile && (
            <button style={ghostBtnStyle} onClick={() => navigate('/login')}>Sign in</button>
          )}
          <button style={outlineBtnStyle} onClick={() => navigate('/login')}>Request access</button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section style={{ padding: '120px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          border: `1px solid ${THEME.border}`,
          borderRadius: '999px',
          padding: '6px 16px',
          fontSize: '13px',
          color: THEME.textSecondary,
          marginBottom: '32px',
          backgroundColor: THEME.surface1
        }}>
          Karnataka State Police · SCRB Platform
        </div>
        
        <h1 style={{
          fontSize: isMobile ? '40px' : '64px',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          maxWidth: '820px',
          margin: '0 0 24px 0',
          lineHeight: 1.1
        }}>
          Intelligence infrastructure <br />
          for <span style={{ color: THEME.accent }}>modern policing</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: THEME.textMuted,
          maxWidth: '560px',
          margin: '0 0 48px 0',
          lineHeight: 1.6
        }}>
          ARISE transforms fragmented crime records across 1,100+ police stations into a unified intelligence layer — connecting patterns, predicting risk, and surfacing evidence that static dashboards cannot.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <button style={{...primaryBtnStyle, padding: '14px 28px', fontSize: '16px'}} onClick={() => navigate('/login')}>
            Enter platform →
          </button>
          <button style={{...ghostBtnStyle, padding: '14px 28px', fontSize: '16px', border: `1px solid ${THEME.border}`}} onClick={() => scrollTo('platform')}>
            See capabilities
          </button>
        </div>
      </section>

      {/* 3. ANIMATED STAT BAR */}
      <section style={{ backgroundColor: 'var(--bg-page)', borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1px', backgroundColor: THEME.border }}>
          <div style={{ backgroundColor: 'var(--bg-page)' }}><StatItem endValue={1100} suffix="+" label="Police stations" /></div>
          <div style={{ backgroundColor: 'var(--bg-page)' }}><StatItem endValue={30} suffix="+" label="Districts covered" /></div>
          <div style={{ backgroundColor: 'var(--bg-page)' }}><StatItem endValue={104} label="Intelligence modules" /></div>
          <div style={{ backgroundColor: 'var(--bg-page)' }}><StatItem endValue={3} label="Legal frameworks" /></div>
        </div>
      </section>

      {/* 4. CAPABILITY PILLARS */}
      <section id="platform" style={{ padding: '120px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '64px' }}>
          <div style={{ color: THEME.accent, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Platform
          </div>
          <h2 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>
            Three capabilities. One operational picture.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1px', backgroundColor: THEME.border }}>
          <div style={{ backgroundColor: THEME.surface1, padding: '48px 32px' }}>
            <div style={{ color: THEME.accent, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Intelligence</div>
            <h3 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 16px 0' }}>From fragmented records to actionable evidence</h3>
            <p style={{ color: THEME.textMuted, fontSize: '16px', lineHeight: 1.6, margin: 0 }}>Unify FIRs, offender profiles, and forensic logs into a single graph database that maps hidden relationships instantly.</p>
          </div>
          <div style={{ backgroundColor: THEME.surface1, padding: '48px 32px' }}>
            <div style={{ color: THEME.accent, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Prediction</div>
            <h3 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 16px 0' }}>Know where crime will happen before it does</h3>
            <p style={{ color: THEME.textMuted, fontSize: '16px', lineHeight: 1.6, margin: 0 }}>Deploy spatiotemporal forecasting to allocate patrol resources efficiently based on historic incident density and temporal risk factors.</p>
          </div>
          <div style={{ backgroundColor: THEME.surface1, padding: '48px 32px' }}>
            <div style={{ color: THEME.accent, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Network</div>
            <h3 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 16px 0' }}>See the connections no spreadsheet reveals</h3>
            <p style={{ color: THEME.textMuted, fontSize: '16px', lineHeight: 1.6, margin: 0 }}>Discover organized syndicate structures by correlating financial tokens, phone CDRs, and biometric co-occurrences in one visual space.</p>
          </div>
        </div>
      </section>

      {/* 5. FEATURE GRID */}
      <section id="intelligence" style={{ backgroundColor: 'var(--bg-page)', padding: '120px 24px', borderTop: `1px solid ${THEME.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 600, margin: '0 0 64px 0', letterSpacing: '-0.02em' }}>
            Built for investigators, not administrators
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: '⎈', title: 'Criminal network analysis', desc: 'Map syndicates through multi-node association graphs.' },
              { icon: '⌖', title: 'Geospatial hotspot detection', desc: 'Identify emerging crime clusters with micro-level precision.' },
              { icon: '⚡', title: 'Predictive risk scoring', desc: 'Assess repeat offender probabilities using historical indicators.' },
              { icon: '✺', title: 'Modus operandi clustering', desc: 'Link unsolved cases based on behavioral and tactical signatures.' },
              { icon: '₹', title: 'Financial crime intelligence', desc: 'Trace illicit fund flows through digital token triangulation.' },
              { icon: '✓', title: 'Explainable AI with audit trails', desc: 'Ensure every algorithm output is backed by a legal BSA audit log.' }
            ].map((feature, i) => (
              <div key={i} style={{ backgroundColor: THEME.surface1, border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '32px', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = THEME.borderHover} onMouseLeave={(e) => e.currentTarget.style.borderColor = THEME.border}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.accent, fontSize: '20px', marginBottom: '24px' }}>
                  {feature.icon}
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>{feature.title}</h4>
                <p style={{ color: THEME.textMuted, fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="deployment" style={{ padding: '120px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 600, margin: '0 0 64px 0', letterSpacing: '-0.02em' }}>
          Operational in three steps
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '32px' : '0' }}>
          {[
            { step: '01', title: 'Connect your data sources', desc: 'Ingest existing CCTNS records, forensic logs, and historical FIRs.' },
            { step: '02', title: 'Configure access roles', desc: 'Set up station-level and district-level permissions with BSA compliance.' },
            { step: '03', title: 'Start investigating', desc: 'Deploy proactive intelligence immediately without extensive training.' }
          ].map((item, i) => (
            <div key={i} style={{ padding: isMobile ? '0' : '0 48px 0 0', borderRight: isMobile ? 'none' : (i < 2 ? `1px solid ${THEME.border}` : 'none'), paddingLeft: isMobile ? '0' : (i > 0 ? '48px' : '0') }}>
              <div style={{ color: THEME.accent, fontSize: '24px', fontWeight: 700, marginBottom: '16px', fontFamily: THEME.fontFamily }}>{item.step}</div>
              <h4 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0' }}>{item.title}</h4>
              <p style={{ color: THEME.textMuted, fontSize: '16px', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. COMPLIANCE BAR */}
      <section id="security" style={{ backgroundColor: 'var(--bg-page)', padding: '64px 24px', borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {['BNS 2023 aligned', 'BNSS 2023 compliant', 'BSA Sec. 63 audit trail', 'CCTNS IIF compatible', 'SHA-256 evidence chain', 'Role-based access control'].map((badge, i) => (
            <div key={i} style={{ backgroundColor: THEME.surface2, color: THEME.textSecondary, fontSize: '14px', fontWeight: 500, padding: '8px 16px', borderRadius: '999px', border: `1px solid ${THEME.border}` }}>
              {badge}
            </div>
          ))}
        </div>
      </section>

      {/* 8. BOTTOM CTA SECTION */}
      <section style={{ padding: '120px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 700, margin: '0 0 40px 0', letterSpacing: '-0.02em' }}>
          Ready to deploy intelligence-led policing?
        </h2>
        <button style={{...primaryBtnStyle, padding: '16px 32px', fontSize: '18px'}} onClick={() => navigate('/login')}>
          Enter platform →
        </button>
      </section>

      {/* 9. FOOTER */}
      <footer style={{ borderTop: `1px solid ${THEME.surface1}`, padding: '32px 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: THEME.accent, fontSize: '16px' }}>◆</span>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>ARISE</span>
        </div>
        <div style={{ color: THEME.textMuted, fontSize: '14px' }}>
          Karnataka State Police · SCRB Integration
        </div>
      </footer>
    </div>
  );
}
