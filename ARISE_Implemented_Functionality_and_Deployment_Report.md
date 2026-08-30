# ARISE (Cognitive Cops) — SCRB Karnataka
## Functionality / Visual Cards / Graphs Report
**Status date:** 2026-07-25  
**Stack:** Zoho Catalyst (Express backend, ZCQL tables) + React 18 / Vite 5 frontend with Recharts, Leaflet, Three.js, deck.gl

---

## 1. Login / Entry Flow

### 1.1 Landing
- **File:** [Landing.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Landing.jsx)
- Hero + feature overview card grid. Entry point that redirects authenticated users to `/dashboard/command-center`.

### 1.2 Login
- **File:** [Login.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Login.jsx)
- Dual cards: Username + password login form (left) / i18n locale toggle + branding (right).
- Supports English + Kannada (kn) locale via [LanguageContext](file:///c:/Users/Chetan/Documents/arise2/client/src/context/LanguageContext.jsx).

### 1.3 Shell / Layout
- **File:** [DashboardShell.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/DashboardShell.jsx)
- Left collapsible nav with 14 module icons + labels.
- Top bar: org badge, locale switch (EN/ಕನ್ನಡ), notifications chip, user avatar.
- Hash-router outlet that renders child pages below.

---

## 2. Command Center (Landing Dashboard)
- **File:** [CommandCenter.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/CommandCenter.jsx)
- **API:** `/api/analytics` → `{ kpis, byDistrict, bySection, recentFIRs, byTimeSlot, alerts }` + `/api/ai_recommendations`

### KPI Cards (row of 4, responsive `repeat(auto-fit, minmax(200px, 1fr))`)
| KPI | Label | Meta |
|---|---|---|
| `kpis.totalFIRs` | Total FIRs registered | Δ % vs 30-day, green/red delta badge |
| `kpis.openCases` | Open investigations | Δ % vs 30-day |
| `kpis.forensicCases` | Cases under forensic review | Δ % vs 30-day |
| `kpis.repeatOffenders` | Repeat offenders in custody | Δ % vs 30-day |

### Alert strips (live from Catalyst)
- `alerts[]` rendered with pulsing red border on `severity === 'CRITICAL'` → `arise-alert-pulse`; amber for emerging; links to offender / hotspot sub-pages.

### Charts (row 1: 2 col)
1. **District Comparison Bar Chart** (Recharts `BarChart`) – vertical bars per `byDistrict.district_name` (x) vs count (y), rotated labels, custom tooltip.
2. **IPC / BNS Section Mix Pie Chart** (Recharts `PieChart`) – `bySection[]` (`count` / `section`) with 6-color palette `[#f4f4f6,#3b82f6,#4ade80,#ef4444,#a78bfa,#ec4899]`, `Pie` + `Cell` color coding.

### Charts (row 2: 3 col + 2 col split)
3. **Recent FIRs table** — links to `/dashboard/search`, columns: FIR UID, Date, PS, Accused, Status (Open/Closed/Chargesheeted).
4. **Time-of-day crime distribution** — 6-slot (DAWN / MORNING / AFTERNOON / EVENING / NIGHT / MIDNIGHT) mini bar chart with colored bars + percentage height + legend labels per slot (each slot distinct color).

### AI Recommendation card
- "Recommended actions" panel driven by `/api/ai_recommendations`, expandable cards per case with priority pill (P1→red, P2→amber, P3→cyan).

---

## 3. Crime Analytics (Deep Trends)
- **File:** [CrimeAnalytics.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/CrimeAnalytics.jsx)
- **API:** `/api/crime-trends` → `{ byMonth, bySection, byPS, byTimeSlot }`

### Top KPI strip (hidden in skeleton)
- FIR trend 12-month % change, peak section, peak PS, worst time slot.

### Charts
1. **Monthly trend LineChart** (Recharts `LineChart`) — `byMonth` with dashed grid, month on x, total count y, multi-colored section lines if broken down.
2. **Section-wise vertical BarChart** (Recharts `BarChart`, `layout="vertical"`) — IPC/BNS section label y, count x, bar fills mapped severity color.
3. **Day-of-week × Time-slot Heatmap** — custom CSS grid 24×7 matrix (7 days rows × 24 time cols) with opacity/color gradient; cell hover tooltip shows absolute count.

---

## 4. Hotspot Map (Spatial)
- **File:** [HotspotMap.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/HotspotMap.jsx)
- **Components:** [HotspotGlobe3D.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/components/HotspotGlobe3D.jsx) + [HotspotGlobeSidebar.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/components/HotspotGlobeSidebar.jsx)
- **API:** `/api/hotspots` → `{ heatLayer: [{lat,lng,weight,riskTier,district,policeStation,count7d,count30d,dominantCrime}], summary, aiRecommendations }`

### Visualizations
- **Dual view toggle** (2D Leaflet ↔ 3D Globe):
  - **2D (Leaflet `react-leaflet`):**
    - `HeatmapLayer` via `leaflet.heat` plugin → radius 35, blur 20.
    - `PulsingMarker` with CSS `@keyframes radarPing` on HIGH/CRITICAL tier cells; popup shows PS, 7d vs 30d count, dominant crime.
    - `LayersControl` with OSM + DarkMatter basemaps.
  - **3D (HotspotGlobe3D `react-globe.gl`):** textured Karnataka globe, hex extruded columns by cell weight; `HotspotGlobeSidebar` Palantir-style left control with filters, top cells, AI recs.
- **Filter chips:** risk-tier (ALL/LOW/MODERATE/HIGH/CRITICAL) + district dropdown.
- **Summary card strip:** total cells, total FIRs, CRITICAL count, HIGH count.

---

## 5. Socio-Demographic Insights
- **File:** [SocioEconomic.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/SocioEconomic.jsx)
- **API:** `/api/socio/correlations` → `{ correlationData:[{district_name,count,population,crimeRatePer1M,vulnerabilityScore,radarAxes:[{}],topSections:[{}],psBreakdown:[{}]}], factors:[] }`

### Choropleth (Leaflet `L.geoJSON`, Karnataka districts GeoJSON)
- **Fill algorithm (4-tier literal hex, no CSS `var()`)** via `getVulnerabilityColor(score)`:
  - ≥ 0.7 → `#ff0055` (SEVERE)
  - ≥ 0.5 → `#fb923c` (HIGH)
  - ≥ 0.3 → `#facc15` (MODERATE)
  - else  → `#00ffaa` (LOW)
- Guaranteed 4-tier via backend **quantile/percentile scoring** (top 10% → 0.72–0.93, next 20% → 0.51–0.69, next 30% → 0.31–0.49, bottom 40% → 0.12–0.29) so the map never goes all-green on sparse data.
- 3-tier fuzzy GeoJSON name matching: exact → normalized 4-char prefix → raw 4-char prefix.
- Every district clickable; unmatched geographies still get synthetic spread fallback data so side panel is never empty. Default auto-selects Bengaluru Urban @ score 0.82.

### Right side panel (selected district inspector)
1. **5-axis Radar Chart** (Recharts `RadarChart`) — per-district `radarAxes`: Population density, Unemployment %, Literacy %, Youth %, Urbanization %.
2. **Top 5 IPC Sections** (Recharts horizontal `BarChart`) — crime count per section.
3. **PS-wise Breakdown** table — Police Stations sorted by case count.
4. **KPI tiles (4):** Total FIRs, Population, Crime Rate /1M pop, Vulnerability score badge (SEVERE/HIGH/MODERATE/LOW pill).

---

## 6. Network Analysis (3D Molecule Graph)
- **File:** [NetworkAnalysis.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/NetworkAnalysis.jsx)
- **API:** `/api/network-graph` → `{ nodes:[{id,type,name,riskScore,firCount,metadata,group}], links:[{source,target,relationship_type,weight}], offenderInspector, firInspector }`

### 3D Scene (raw Three.js `0.185.1`, OrbitControls, no react-three-fiber)
- **Scene setup:** dark ARISE background, 3 colored point lights + ambient, 1,200-star starfield shell at radius 240, 240-unit floor grid.
- **Toolbar buttons:** `⟳ Spin` (toggle `OrbitControls.autoRotate`), `⤢ Reset View`, `🔍 Focus selected`, `🗑 Clear`.
- **Controls:** LMB drag = orbit; Wheel = zoom; RMB drag = pan.

### Node visuals (per-type geometry + emissive glow) — `NODE_CONFIG`
| Type | Shape | Color | Emissive | Size fn |
|---|---|---|---|---|
| OFFENDER | Sphere (24×24) | `#fafafa` | 0xffd86a × 0.7 | `1.1 + riskScore·0.9` |
| FIR | Box | `#22d3ee` | 0x22d3ee × 0.9 | 0.9 |
| VICTIM | Octahedron | `#f43f5e` | 0xf43f5e × 0.9 | 0.85 |
| LOCATION | Cone (8 seg) | `#00ffaa` | 0x00ffaa × 0.9 | `0.85 + firCount·0.2` |
| FINANCIAL | Icosahedron | `#a78bfa` | 0xa78bfa × 0.9 | 0.85 + fraud score |
| NER ENTITY | Tetrahedron | `#38bdf8` | 0x38bdf8 × 0.9 | 0.75 |

- Each node also has a **RingGeometry halo** that billboards the camera + slowly rotates on Z.
- Node labels rendered via **CanvasTexture → `THREE.Sprite`** (billboarding always faces camera) with tinted border frame matching node type color.

### Edge visuals (dual-line neon bloom)
- Per relationship color from `EDGE_COLORS`: `CO_ACCUSED` (amber), `VICTIM_OF` (rose), `ACCUSED_IN` (cyan), `KNOWS` (purple), `FIN_LINK` (violet), `HIDDEN` (zinc 600).
- Core line + glow line with 3× lower opacity layered; transparency + opacity dimming on unlinked nodes.

### Physics (custom 3D force simulator, ~85 tick decay)
- Electrostatic charge per node type (Offenders −90, FIRs −55, Others −38).
- Spring distance / constant per edge type; centering gravity; 86% velocity damping; `α *= 0.992` decay until `α < 0.004` → stops.

### Picking & Inspector
- **Raycaster** detects mesh + halo clicks / hovers: hover cursor = pointer, selected scales ×1.25, unselected dim to 12% opacity, unconnected edges to 8%, connected to 77%.
- Click opens existing **Node Inspector side drawer tabs** (preserved verbatim): Offender (profile/cases/custody), FIR (timeline), Location (FIR list), Financial (transactions), Entity (related nodes).

### Filter chips (left rail)
- Node type: All / Offenders / FIRs / Victims / Locations / Financial / Entity
- Risk tier: All / ≥0.5 / ≥0.7 / CRITICAL (≥0.9)
- Edge type chips + search box (fuzzy by name/UID → matching nodes dim others to 12%).

---

## 7. Offender Intelligence
- **File:** [OffenderIntelligence.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/OffenderIntelligence.jsx)
- **APIs:** `/api/offenders` (list), `/api/offenders/:uid` (detail), `/api/offenders/:uid/rescore` (QuickML)

### Left — list panel
- **Summary stats (2-up grid):** total tracked, HIGH/CRITICAL count, rowdy sheeters, absconding count.
- **Filter chips:** All / Repeat / Rowdy sheeter / On bail / Absconding / Critical risk + risk thresholds `>0.5 / >0.7 / >0.9 Critical`.
- **Sort:** Risk ↓, Risk ↑, Name A-Z, Arrests ↓.
- **Offender list cards:** avatar + name, alias, gang-affiliation pill (amber border-left), THREAT badge (CRITICAL→red / HIGH→amber / MEDIUM→yellow / LOW→green), recidivism score bar (0–100% color-graded), current status (BAIL / ABSCONDING / CUSTODY chip).

### Right — detail panel (tabbed: Profile / Cases / Custody / Links / Rescore)
- **Top stat grid (3-up):** prior arrests, FIR count, cross-jurisdiction count.
- **6-axis RadarChart (`RadarChart` + `PolarGrid` + `Radar`)** — offender threat profile: Violence, Planning level, Criminal history, Recidivism, Cross-jurisdiction complexity, Gang link strength (0–10 scored from profile fields).
- **Primary-crime BarChart** (vertical `BarChart`, layout vertical) — top categories.
- **Rowdy sheeter + RISK level pill strip.**
- **Gang affiliation badge** (if any); **modus operandi** tag cloud; **known associates** card grid; **prior cases table** (FIR, date, section, disposal); **custody history timeline** (arrest → bail → remand → release).
- **Rescore tab:** calls QuickML endpoint, updates local leaderboard with new predicted score + threat-level recolor.

---

## 8. Predictions
- **File:** [Predictions.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Predictions.jsx)
- **APIs:** `/api/predict/early-warning`, `/api/predict/risk-leaderboard`, `/api/predict/forecast`, `/api/predict/anomalies`

### 4 Tabs
1. **Early Warning Alerts** — table: Location, Trigger, Dominant IPC, Confidence % bar (0–100 width), Escalate-to-PS button.
2. **Risk Leaderboard** — ranked offenders, avatar + name + recidivism % + THREAT badge (color-coded CRITICAL/HIGH/MEDIUM/LOW). Click to rescore → QuickML call.
3. **Crime Forecast (Next 90 days)** — Recharts `AreaChart` stacked with shaded 95% confidence band; 3-month ahead rolling projection per district.
4. **Anomaly Detection** — card list: anomaly timestamp, description (sudden spike / unusual section shift / PS outlier), severity pill, affected FIR count chip.

---

## 9. Financial Crime (AML / TMT / Benami)
- **File:** [FinancialCrime.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/FinancialCrime.jsx)
- **APIs:** `/api/fin/tokens`, `/api/fin/tokens/:uid`, `/api/fin/patterns`

### Left panel — instrument / token browser
- **KPI strip (2×2 grid):**
  - Total instruments (financial token count)
  - **Flagged count** — red with ⚠ AlertTriangle if > 0
  - Suspicious ₹ value — `₹X.XX Cr / L / K` formatting helper
  - Pattern count (Hawala-layering / Smurfing / Benami-beneficiary / round-trip / TMT-tied / structuring)
- **Search + filter chips:** All / Bank A/C / UPI / Crypto / Cash / Benami Property / Shell-company
- **Token list cards** — selectable; selected gets amber 2px left border + `rgba(245,158,11,0.04)` background.

### Right panel — selected token inspector (tabs: Summary / AML pattern / TMT trail / Linked offenders / FIRs)
- **KPI summary grid (2×2):** flagged? yes/no, A/C / wallet masked number, current balance ₹, linked accused count.
- **Pattern cards** — `patternCard` with 3px colored left border (red→high, amber→medium, cyan→benign); pattern title + icon, explanation + supporting-transactions table.
- **TMT (Terror-Money Trail) visual chain** — `trailBox` breadcrumb nodes (colored border/background): Account → Beneficiary → Hawala hub → Shell → Accused person; arrows between.
- **Offender cards** — `offenderCard` with REL badge (HOLDER / BENEFICIARY / NOMINEE / SIGNATORY) each with its own border color.
- **FIR cards** — case UID, date, sections, disposal stage.

---

## 10. AI Assistant (Cognitive Copilot)
- **File:** [AIAssistant.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/AIAssistant.jsx)
- **API:** `/api/chat` (streaming SSE, 4-step BNS/IPC grounded RAG)

### UI
- Left: step-thinking column (Step 1: Intent parse → Step 2: BNS match → Step 3: Case law → Step 4: Answer).
- Right: chat bubble column; bot = dark card with neon border, streaming markdown rendered via `ReactMarkdown`.
- Input row: text field + ⏺ Record mic (red highlight on `listening:true`) + ➤ Send.
- **Quick-chips:** "Interpret §302 BNS", "Draft remand app", "Compare FIR-2025-0011 vs 2025-0043", "Summarise today's alerts", "List loopholes in chargesheet".
- Per-message Copy / Regenerate / Expand-thinking toolbar (copy shows green CheckCircle).

### Safety
- Footer "DO NOT" disclaimer; red alert banner for hallucination flag via `model.confidence < 0.7`.
- BNS / IPC label lookup table hard-coded at top for rapid response without round trips.

---

## 11. Reports
- **File:** [Reports.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Reports.jsx)
- **APIs:** `/api/reports/list-firs`, `/api/reports/generate` (POST), `/api/reports/audit-trail/:firUid`

### Tabs
1. **Report generator** —
   - FIR dropdown selector
   - Report type radio pills: `CASE_SUMMARY` / `CHARGESHEET_DRAFT` / `REMAND_APPLICATION` / `LEGAL_OPINION`
   - Language: EN / ಕನ್ನಡ
   - **Generate** button → loading spinner → `react-markdown` rendered body.
   - **Export → PDF (jspdf + html2canvas)** — renders with color-graded weights (red > amber > accent > green for `explanationFactors[]`) + confidence-score chip + integrity-hash QR area + similar-cases card grid.
2. **Audit trail (tamper-evident)** — per-edit actor + timestamp + delta description + SHA-256 integrity hash (copy button, shows green check on copied).
3. **Methodology disclosure** — collapsible accordion of RAG retrieval queries with click-to-expand.

---

## 12. Search
- **File:** [Search.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Search.jsx)
- **API:** `/api/search?q=` → `{ firs:[], accused:[], victims:[], ps:[], sections:[] }`
- **Unified search bar** (top) with type-ahead filters: FIR #, Name, UID, Section, PS name, Date range.
- **Tabbed result groups:** FIRs / Accused / Victims / PS / Sections; each with drill-down link to detail page.

---

## 13. Settings
- **File:** [Settings.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Settings.jsx)
- Profile / password / 2FA / notification preferences / API keys (client-only UI).

---

## 14. Governance (placeholder)
- **File:** [Governance.jsx](file:///c:/Users/Chetan/Documents/arise2/client/src/pages/Governance.jsx)
- Single centered title "Governance" — no cards / graphs yet (pending future SLA / attendance / pendency module).

---

# II. Backend Packaging & Deployment (Zoho Catalyst)

## 2.1 Backend source layout
- Function root: [functions/get_crime_analytics/](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/)
- Entry: [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js) (Express app, 20+ routes)
- Catalyst config: [catalyst-config.json](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/catalyst-config.json)
- Dependencies (in `package.json`): `express`, `cors`, `zcatalyst-sdk-node`, `node-fetch`, etc.

## 2.2 Zip rules (MANDATORY — written in [AGENTS.md](file:///c:/Users/Chetan/Documents/arise2/.agents/AGENTS.md))
> ❌ **NEVER** use Windows `Compress-Archive` or right-click → Send to → Compressed (zipped). These produce zip files with Windows-only metadata and backslash paths that **fail to unzip on the Catalyst Linux runtime**, leading to `MODULE_NOT_FOUND` (see §2.4 below).
>
> ✅ **ALWAYS** use the cross-platform npm `bestzip` module via `npx`.

## 2.3 Step-by-step backend.zip build (PowerShell)
```powershell
# 1. Go into the function folder
cd c:\Users\Chetan\Documents\arise2\functions\get_crime_analytics

# 2. Fresh install WITH production node_modules (Catalyst does NOT run `npm install` on upload)
npm.cmd install --omit=dev

# 3. Build the zip using bestzip (relative path = project root backend.zip, ../../ from function folder)
npx bestzip ../../backend.zip index.js package.json package-lock.json catalyst-config.json node_modules
```

**Expected output:** `c:\Users\Chetan\Documents\arise2\backend.zip` → ~6–7 MB with 3,300+ entries including `node_modules/express/index.js`, `node_modules/zcatalyst-sdk-node/` etc.

### Verify zip contents are healthy
```powershell
# Quick sanity: confirm express & zcatalyst-sdk-node are inside
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [IO.Compression.ZipFile]::OpenRead("c:\Users\Chetan\Documents\arise2\backend.zip")
$z.Entries | Where-Object { $_.FullName -like "*express/index.js" -or $_.FullName -like "*zcatalyst-sdk-node/package.json" } | Select-Object FullName
$z.Dispose()
```

## 2.4 Known gotchas (fixed earlier in session)
- **`MODULE_NOT_FOUND: Cannot find module 'express'` on Catalyst logs** — root cause = first `backend.zip` had only 4 files (no `node_modules/`). Zoho Catalyst serverless **never runs `npm install` on upload**; it directly unzips and runs `node index.js`. Fix = add `--omit=dev` install step + explicitly include `node_modules` in `bestzip` source list.
- Do **NOT** include the `temp/` scratch folder in the zip (excluded by enumerating files explicitly rather than glob `*`).

## 2.5 Upload to Catalyst
1. Log into [Zoho Catalyst Console → Project: cognitivecops → Serverless → Functions → get_crime_analytics](https://console.catalyst.zoho.com/).
2. Click **Edit / Re-upload Function**.
3. Choose ZIP upload mode → select `c:\Users\Chetan\Documents\arise2\backend.zip`.
4. Wait for deploy (~30–60s). Function URL will be:
   `https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics`
5. Validate endpoints with quick smoke tests from browser dev-tools or curl:
   ```
   GET  /api/analytics
   GET  /api/socio/correlations
   GET  /api/network-graph
   POST /api/chat  (body: {message:"Hello"})
   ```

---

# III. Frontend Testing + Packaging + Slate Deployment

## 3.1 Local development (current phase as of today)
> We are **currently in frontend local-testing phase** (backend already packaged + deployed once per §II; frontend being iterated on local npm dev server). Only once all pages render clean on local do we move to build + frontend.zip + Slate.

### Start local Vite dev server (PowerShell 5)
```powershell
cd c:\Users\Chetan\Documents\arise2\client
npm.cmd run dev
```
- Vite default port **5173**, fallback 5174 / 5175 (HMR active; edits save → instant refresh).
- Open `http://localhost:5175/#/dashboard/command-center` and iterate through the sidebar.
- API base URL is read from `VITE_API_BASE` env var in each page; fallback (already hard-coded in CommandCenter, AIAssistant, etc.):
  `https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics`
- Override if needed by editing [client/.env](file:///c:/Users/Chetan/Documents/arise2/client/.env) or creating `.env.local` (git-ignored):
  ```
  VITE_API_BASE=https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics
  ```

### Lint check before packaging
```powershell
cd c:\Users\Chetan\Documents\arise2\client
npm.cmd run lint
```

## 3.2 Production build + frontend.zip
When local testing passes, run the build then package the `dist/` folder the same bestzip way (NOT Windows compress):

```powershell
cd c:\Users\Chetan\Documents\arise2\client

# 1. Production bundle into client/dist/
npm.cmd run build

# 2. Zip ONLY the CONTENTS of dist/, NOT the dist folder itself, so /index.html is at zip root.
cd dist
npx bestzip ../../frontend.zip *
```

- **Output location:** `c:\Users\Chetan\Documents\arise2\frontend.zip`
- **Validate zip root:** The zip must contain at its top level `index.html`, `assets/`, `vite.svg` (NOT wrapped in a `dist/` subfolder — otherwise Slate serves 404 on `/`).
  ```powershell
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $z = [IO.Compression.ZipFile]::OpenRead("c:\Users\Chetan\Documents\arise2\frontend.zip")
  $z.Entries | Select-Object -First 12 FullName
  $z.Dispose()
  ```
  Expected: first entries = `index.html`, `assets/index-XXXX.js`, `assets/index-XXXX.css` …

### Optional: local preview of production bundle before deploy
```powershell
cd c:\Users\Chetan\Documents\arise2\client
npm.cmd run preview -- --port 4173
```
Open `http://localhost:4173/` → should exactly match Slate-served behavior (hash routing, API calls, asset paths).

## 3.3 Deploy frontend.zip to Slate (SCRB / ksp-slate or equivalent hosting)
1. Log into the **Slate** static-hosting console (KSP SCRB project bucket).
2. Create / select the existing `arise-frontend` site.
3. Click **Upload new version** → choose `c:\Users\Chetan\Documents\arise2\frontend.zip`.
4. Set deployment config in Slate dashboard (if not already configured):
   - **Serving mode:** Single-page app with hash routing (we use `HashRouter` → `#/dashboard/…` so no 404 rewrite rules needed on the server side).
   - **Index document:** `index.html`
   - **404 fallback:** `index.html` (belt-and-suspenders if ever switched to BrowserRouter later).
   - **Cache headers:** Set `assets/*` → `Cache-Control: public, max-age=31536000, immutable`; `/index.html` → `Cache-Control: no-cache` so users get the new version immediately after deploy.
5. Wait for deploy to go **Healthy → Green**.
6. Smoke-test the Slate URL on these critical paths:
   - `/` (Landing → redirects to `#/dashboard/command-center`)
   - `#/dashboard/network` (Three.js 3D graph loads without `ReferenceError: nodeGroup`)
   - `#/dashboard/socio` (choropleth map shows 4 colors, side panel populated on Bengaluru Urban click)
   - `#/dashboard/ai-assistant` (chat streaming works, API reachable)
   - `#/dashboard/hotspots` → toggle 2D ↔ 3D globe.

---

## 4. Build / Deploy Pipeline Cheatsheet (as-of today)

| Step | Command | Where |
|---|---|---|
| Install backend deps (prod) | `npm.cmd install --omit=dev` | `functions/get_crime_analytics/` |
| Build **backend.zip** | `npx bestzip ../../backend.zip index.js package.json package-lock.json catalyst-config.json node_modules` | `functions/get_crime_analytics/` |
| Run frontend locally | `npm.cmd run dev` | `client/` |
| Lint frontend | `npm.cmd run lint` | `client/` |
| Build frontend bundle | `npm.cmd run build` | `client/` |
| Build **frontend.zip** | `npx bestzip ../../frontend.zip *` | `client/dist/` |
| Preview production build | `npm.cmd run preview` | `client/` |

> ❗ **Both zips:** `bestzip` ONLY. Never Windows Explorer zip / `Compress-Archive`. ❗
