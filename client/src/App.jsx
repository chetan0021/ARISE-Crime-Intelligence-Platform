import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardShell from './pages/DashboardShell';
import CommandCenter from './pages/CommandCenter';
import CrimeAnalytics from './pages/CrimeAnalytics';
import HotspotMap from './pages/HotspotMap';
import OffenderIntelligence from './pages/OffenderIntelligence';
import NetworkAnalysis from './pages/NetworkAnalysis';
import Predictions from './pages/Predictions';
import FinancialCrime from './pages/FinancialCrime';
import Search from './pages/Search';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SocioEconomic from './pages/SocioEconomic';
import AIAssistant from './pages/AIAssistant';
import Governance from './pages/Governance';
import ZiaFaceAnalytics from './pages/ZiaFaceAnalytics';
import ZiaTest from './pages/ZiaTest';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="analytics" element={<CrimeAnalytics />} />
          <Route path="hotspots" element={<HotspotMap />} />
          <Route path="network" element={<NetworkAnalysis />} />
          <Route path="offenders" element={<OffenderIntelligence />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="socioeconomic" element={<SocioEconomic />} />
          <Route path="financial" element={<FinancialCrime />} />
          <Route path="search" element={<Search />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="governance" element={<Governance />} />
          <Route path="settings" element={<Settings />} />
          <Route path="face-analytics" element={<ZiaFaceAnalytics />} />
          <Route path="zia-test" element={<ZiaTest />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
