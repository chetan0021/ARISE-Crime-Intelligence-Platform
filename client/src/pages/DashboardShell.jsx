import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BarChart3, MapPin, Users, Network, 
  TrendingUp, DollarSign, Search, FileText, Settings,
  ChevronLeft, ChevronRight, Globe, Bot, ShieldCheck
} from 'lucide-react';
import { useT } from '../i18n/useT';
import { useLang } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import ZiaOrb from '../components/ZiaOrb';
import GlobalBot from '../components/GlobalBot';

export default function DashboardShell() {
  const [expanded, setExpanded] = useState(true);
  const [pageKey, setPageKey] = useState(0);
  const location = useLocation();
  const t = useT();
  const { lang, toggle } = useLang();
  const { currentRole } = useRole();

  // Trigger page-enter animation on route change
  useEffect(() => {
    setPageKey(k => k + 1);
  }, [location.pathname]);

  useEffect(() => {
    const existing = document.getElementById('kannada-font');
    if (lang === 'kn' && !existing) {
      const link = document.createElement('link');
      link.id = 'kannada-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;700&display=swap';
      document.head.appendChild(link);
    }
  }, [lang]);

  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: t('nav.commandCenter'), exact: true },
        { path: '/dashboard/analytics', icon: BarChart3, label: t('nav.crimeAnalytics') },
        { path: '/dashboard/hotspots', icon: MapPin, label: t('nav.hotspotMap') },
      ]
    },
    {
      label: t('nav.group.intelligence'),
      items: [
        { path: '/dashboard/network', icon: Network, label: t('nav.networkAnalysis') },
        { path: '/dashboard/offenders', icon: Users, label: t('nav.offenderIntelligence') },
        { path: '/dashboard/predictions', icon: TrendingUp, label: t('nav.predictionsAlerts') },
        { path: '/dashboard/socioeconomic', icon: Globe, label: t('nav.socioEconomic') },
        { path: '/dashboard/financial', icon: DollarSign, label: t('nav.financialCrime') },
      ]
    },
    {
      label: t('nav.group.investigation'),
      items: [
        { path: '/dashboard/search', icon: Search, label: t('nav.searchInvestigation') },
        { path: '/dashboard/assistant', icon: Bot, label: t('nav.aiAssistant') },
        { path: '/dashboard/reports', icon: FileText, label: t('nav.reportsExplainability') },
      ]
    },
    {
      label: t('nav.group.administration'),
      items: [
        { path: '/dashboard/governance', icon: ShieldCheck, label: t('nav.governance') },
        { path: '/dashboard/settings', icon: Settings, label: t('nav.settings') },
      ]
    }
  ];

  const filteredNavGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => currentRole.allowedNav.includes(item.path))
  })).filter(group => group.items.length > 0);

  const getPageTitle = () => {
    let allItems = [];
    NAV_GROUPS.forEach(g => allItems.push(...g.items));
    const activeItem = allItems.find(item =>
      item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
    );
    return activeItem ? activeItem.label : 'ARISE';
  };

  const labelFont = lang === 'kn'
    ? "'Noto Sans Kannada', sans-serif"
    : "'Inter', sans-serif";

  const NavItem = ({ path, icon: Icon, label, exact }) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
      <NavLink
        to={path}
        title={!expanded ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: expanded ? '7px 10px' : '7px 0',
          margin: '1px 6px',
          justifyContent: expanded ? 'flex-start' : 'center',
          textDecoration: 'none',
          borderRadius: '6px',
          gap: '8px',
          transition: 'all 0.12s ease',
          position: 'relative',
          // Active vs inactive
          background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
          border: isActive
            ? '1px solid rgba(245,158,11,0.15)'
            : '1px solid transparent',
          boxShadow: isActive ? '0 0 20px rgba(245,158,11,0.06)' : 'none',
          color: isActive ? 'var(--amber)' : 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <Icon
          size={16}
          style={{
            flexShrink: 0,
            color: isActive ? 'var(--amber)' : 'var(--text-dimmed)',
            filter: isActive ? 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' : 'none',
            transition: 'all 0.12s ease',
          }}
        />
        {expanded && (
          <span style={{
            fontSize: '13px',
            fontWeight: isActive ? 500 : 400,
            whiteSpace: 'nowrap',
            fontFamily: labelFont,
            letterSpacing: '-0.01em',
          }}>
            {label}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-base)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* 3D Spatial Grid Background */}
      <div className="arise-spatial-container">
        <div className="arise-3d-grid" />
      </div>

      {/* ── SIDEBAR ──────────────────────────── */}
      <aside style={{
        width: expanded ? '232px' : '52px',
        background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-base) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
        transition: 'width 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* Logo area */}
        <div style={{
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '0 16px' : '0',
          gap: '10px',
          flexShrink: 0,
        }}>
          {/* Logo mark - Cinematic Orb */}
          <div style={{ transform: 'scale(0.4)', transformOrigin: 'center left', width: '32px', display: 'flex', alignItems: 'center' }}>
            <div className="cinematic-orb-container">
              <div className="cinematic-orb"></div>
              <div className="cinematic-orb-inner"></div>
              <div className="cinematic-orb-highlight"></div>
            </div>
          </div>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-primary)',
              }}>
                ARISE
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}>
                {t('header.scrbPlatform')}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          flex: 1,
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {filteredNavGroups.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              {gIdx > 0 && (
                <div style={{
                  margin: '8px 12px',
                  height: '1px',
                  background: 'rgba(255,255,255,0.04)',
                  flexShrink: 0,
                }} />
              )}
              {group.label && expanded && (
                <div style={{
                  padding: '16px 12px 6px',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-dimmed)',
                  fontFamily: labelFont,
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => (
                <NavItem key={item.path} {...item} />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            margin: '8px',
            padding: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      {/* ── MAIN AREA ────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── HEADER BAR ───────────────────── */}
        <header style={{
          height: '56px',
          background: 'rgba(22, 19, 22, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'relative',
          zIndex: 50,
        }}>

          {/* Left — Page title */}
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              fontFamily: labelFont,
              lineHeight: 1.2,
            }}>
              {getPageTitle()}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 400,
              marginTop: '1px',
              letterSpacing: '0.01em',
            }}>
              SCRB · Karnataka
            </div>
          </div>

          {/* Right — Status + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Role Preview Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--amber)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                Previewing as: {currentRole.label}
              </span>
            </div>

            {/* SCRB sync status pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(74,222,128,0.06)',
              border: '1px solid rgba(74,222,128,0.15)',
            }}>
              <div className="arise-live-dot" />
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(74,222,128,0.8)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                {t('header.syncActive')}
              </span>
            </div>

            {/* Language toggle */}
            <button
              onClick={toggle}
              title={lang === 'en' ? 'Switch to Kannada' : 'Switch to English'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                background: lang === 'kn' ? 'var(--amber-dim)' : 'var(--bg-card)',
                border: lang === 'kn'
                  ? '1px solid rgba(245,158,11,0.25)'
                  : '1px solid var(--border-default)',
                color: lang === 'kn' ? 'var(--amber)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = lang === 'kn'
                  ? 'rgba(245,158,11,0.4)'
                  : 'var(--border-hover)';
                e.currentTarget.style.color = lang === 'kn'
                  ? 'var(--amber)'
                  : 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = lang === 'kn'
                  ? 'rgba(245,158,11,0.25)'
                  : 'var(--border-default)';
                e.currentTarget.style.color = lang === 'kn'
                  ? 'var(--amber)'
                  : 'var(--text-secondary)';
              }}
            >
              {lang === 'en' ? '🇮🇳 ಕನ್ನಡ' : '🇬🇧 English'}
            </button>

            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))',
              border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--amber)',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              IO
            </div>
          </div>
        </header>

        {/* ── CONTENT AREA ─────────────────── */}
        <div
          key={pageKey}
          className="arise-page-enter"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent',
            padding: ['/dashboard/hotspots', '/dashboard/network', '/dashboard/offenders', '/dashboard/socioeconomic', '/dashboard/financial', '/dashboard/search', '/dashboard/assistant', '/dashboard/reports', '/dashboard/face-analytics'].some(route => location.pathname.startsWith(route)) ? '0' : '24px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          <Outlet />
        </div>
        
      </main>

      <GlobalBot />
    </div>
  );
}
