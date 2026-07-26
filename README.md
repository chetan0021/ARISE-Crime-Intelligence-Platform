# ARISE - Crime Intelligence Platform

**Built for Karnataka State Police Datathon 2026 — Challenge 2**

ARISE is a comprehensive, AI-driven crime intelligence platform that bridges the gap between raw policing data and actionable, real-time insights, powered by an advanced conversational voice assistant and sophisticated spatial-temporal analytics.

---

## Problem Statement Summary

- **Challenge 2 (AI-Driven Crime Analytics & Visualization):** KSP needs advanced analytics and visualization tools to detect emerging crime hotspots, track repeat offenders, map criminal networks across jurisdictions, and correlate crime patterns with socio-demographic factors to enable proactive policing and resource allocation.

---

## Feature Overview

### Command Center
A unified operational dashboard providing live Key Performance Indicators (KPIs), real-time alerts, and jurisdictional summaries. It serves as the primary entry point for the Zia voice assistant, allowing officers to get an immediate briefing on the current state of their jurisdiction.

### Zia (Conversational Voice Assistant)
Zia is a specialized, read-only AI assistant built for law enforcement intelligence.
- **Real Flow:** When activated, Zia greets the officer with a proactive, live data briefing based on their jurisdiction (e.g., "Good morning. There are 3 new alerts in your area...").
- **Capabilities:** Supports voice input and output (English and Kannada via edge-tts), multi-turn contextual memory, and general Q&A scoped strictly to the crime database.
- **Role-Aware:** Answers are filtered through the Governance module's role-based preview system (e.g., an Inspector gets different detail levels than a DGP).
- **Safety:** Read-only access ensures no destructive actions can be taken via voice. The entire conversation transcript can be exported as a PDF for official record-keeping.

### Hotspot Map
An advanced geospatial intelligence interface.
- **Visualization:** Supports 2D and 3D heatmaps with spatiotemporal time-of-day layering.
- **Alerts:** Detects real emerging trends by comparing recent spike anomalies against historical averages.
- **Dispatch & Routing:** Integrates static police station locations and real road-based routing (via OSRM).
- **Nearest-Station Detection:** Employs a two-step routing algorithm to find the absolute fastest dispatch route (accounting for road distance, not just crow-flies distance) and generates severity-aware simulated dispatch alerts.

### Crime Analytics
Statistical and visual analysis of crime trends over time.
- **Methodology:** Implements rolling historical averages and z-score anomaly detection to identify statistically significant spikes in specific crime categories, rather than relying on generic black-box ML models.
- **Visuals:** Interactive time-series charts, categorical breakdowns, and jurisdictional comparisons.

### Network Analysis
A 3D force-directed criminal association graph.
- **Capabilities:** Maps co-accused relationships, shared FIRs, and financial links to detect cross-jurisdiction MO (Modus Operandi) patterns. 
- **Zia Text Analytics (NER):** Highlights potential 2nd-degree "hidden links" and entities discovered via natural language extraction from FIR narratives.

### Offender Intelligence
Dedicated profiles for individuals in the system.
- **Tracking:** Monitors repeat offenders and Rowdy Sheeters.
- **Risk Scoring:** Calculates recidivism risk scores based on prior arrest history, gang affiliation, and custody status.
- **Cross-Jurisdiction:** Aggregates cases across different districts into a single, comprehensive pattern card.

### Socio-Demographic & Socio-Economic Correlation
Analyzes the relationship between crime rates and external socio-economic indicators.
- **Methodology:** Uses Pearson correlation coefficients to establish statistical relationships between specific crime categories and variables like literacy rates or unemployment (using seeded illustrative demographic data).

### Predictions & Early Warning
Forecasting potential future hotspots and crime volumes.
- **Methodology:** Utilizes Holt-Winters exponential smoothing (incorporating trend and seasonality) to forecast short-term crime volumes based on historical time-series data.

### Financial Crime
Visualizes money trails, flagged bank accounts, and crypto wallets.
- **Honest Caveat:** KSP has not provided a real financial or phone-record feed. This module operates entirely on structurally accurate *illustrative (mock) data* to demonstrate the capability of the interface. It does not analyze real transaction data.

### Reports & Explainability
Comprehensive reporting tools for accountability.
- **Features:** High-quality PDF generation for any analysis, complete with audit trails, data provenance tags, and methodology disclosures so officers know exactly how a conclusion was reached.

### Governance
Administrative oversight and compliance tracking.
- **Features:** Audit log viewer tracking system usage, compliance dashboard, and pendency/SLA tracking for open cases.
- **Role Definition & Simulation:** Defines strict RBAC (Role-Based Access Control) policies and includes a "Preview as: [Role]" simulation toggle to test UI boundaries.
- **Important Note:** Role-based access enforcement is visually and logically simulated based on the selected preview role, but it will permanently activate once a real Authentication provider is integrated.

### Authentication
- **Status:** Not yet implemented (Planned for next phase).
- **Honest Caveat:** The current application assumes a default logged-in state for datathon demonstration purposes. No real login security or session management is currently enforced.

---

## Architecture & Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Three.js (for 3D networking), Recharts.
- **Backend:** Zoho Catalyst Serverless (Advanced I/O Functions, ZCQL for querying the Catalyst Data Store).
- **AI & NLP:** Catalyst QuickML / OpenAI LLM for natural language processing, edge-tts (local edge generation) for responsive voice synthesis.
- **Geospatial & Routing:** Leaflet, OpenStreetMap, OSRM (Open Source Routing Machine).
- **Data Schema:** Two-layer design. Layer 1 consists of the official KSP schema (FIRs, Arrests, etc.). Layer 2 contains intelligence enrichment tables (Network Edges, Risk Scores, Logs).

---

## Setup / Running Locally

### Prerequisites
- Node.js (v18+)
- Zoho Catalyst CLI (`npm install -g zcatalyst-cli`)

### Frontend
1. Navigate to the `client` directory:
   ```bash
   cd client
   npm install
   ```
2. Set up your environment variables (create a `.env` file based on provided configurations, ensuring `VITE_API_BASE` points to your Catalyst function URL). *Never commit real API keys.*
3. Run the development server:
   ```bash
   npm run dev
   ```

### Backend (Zoho Catalyst)
1. Login to Catalyst CLI:
   ```bash
   catalyst login
   ```
2. Navigate to the `functions/get_crime_analytics` directory and install dependencies:
   ```bash
   cd functions/get_crime_analytics
   npm install
   ```
3. Deploy the backend to your Catalyst project:
   ```bash
   catalyst deploy
   ```

---

## Known Limitations / Honest Roadmap

- **Illustrative Financial Data:** The Financial Crime module runs on structural, illustrative data since no real financial/telecom source feed exists from KSP yet.
- **Simulated Governance Enforcement:** Governance roles are defined and can be previewed/simulated, but are not cryptographically enforced pending the authentication integration.
- **Pending Authentication:** Authentication itself is planned as the very next build phase.
- **Statewide Coverage Limitation:** Full statewide (1,100+ stations) coverage is currently limited to the districts seeded in the database, pending a comprehensive, clean master station list from KSP.

---

## Team / Credits

**Team:** Cognitive Cops
**Event:** Karnataka State Police Datathon 2026
