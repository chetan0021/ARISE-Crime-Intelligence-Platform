# ARISE — AI-Powered Crime Intelligence Platform

> **Karnataka State Police · SCRB · KSP Datathon 2026**  
> Team: **Cognitive Cops** · Built on **Zoho Catalyst**

[![Platform](https://img.shields.io/badge/Platform-Zoho%20Catalyst-blue)](https://catalyst.zoho.com)
[![AI](https://img.shields.io/badge/AI-Catalyst%20GLM%20%7C%20QuickML%20%7C%20Zia-orange)](https://catalyst.zoho.com)
[![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)](https://vitejs.dev)
[![Database](https://img.shields.io/badge/Database-ZCQL%20DataStore-green)](https://catalyst.zoho.com)

---

## What is ARISE?

**ARISE** (Advanced Real-time Intelligence & Surveillance Engine) is a production-grade, AI-driven crime intelligence platform built for the Karnataka State Police and the State Crime Records Bureau (SCRB).

This is **not simulated data**. Every dashboard, chart, and AI response is backed by live data stored across **10 production ZCQL tables** in Zoho Catalyst's DataStore — including real FIR records, offender profiles, geospatial hotspot indicators, modus operandi signatures, and BSA-compliant audit trails.

Police stations running **CCTNS** can push live FIR data directly into ARISE via a secure webhook. The webhook URL and authentication token are available in the Settings page of the platform.

---

## Features

### Challenge 1 — Conversational AI
| Feature | Implementation |
|---------|---------------|
| Natural language chatbot | Catalyst GLM + RAG over live ZCQL tables |
| English + Kannada | Full bilingual UI + Zia STT/TTS |
| Voice input/output | Web Speech API (STT) + edge-tts (TTS) |
| Context-aware conversations | 6-turn history window sent to GLM |
| RAG citations | Every response cites FIR UID / offender UID |
| Save conversation | Export as text file |

### Challenge 2 — Analytics & Visualization
| Feature | Implementation |
|---------|---------------|
| 3D Globe + 2D Map | react-globe.gl + Leaflet + CARTO dark tiles |
| Crime heatmap | leaflet.heat over geospatial_hotspot_indicator table |
| Network graph | D3.js force-directed graph from entity_association_graph |
| Offender profiling | recidivism_risk_score from offender_profile table |
| Predictions | QuickML forecasting + alert_scheduler cron job |
| Socio-economic | Vulnerability index from geospatial_hotspot_indicator |
| Financial crime | phone_financial_token + fraud pattern detection |
| Reports | Catalyst GLM + BSA Sec. 63 SHA-256 hash chains |
| CCTNS webhook | Settings page with push token + endpoint URL |

---

## Architecture

```
┌─────────────────────────────────────┐
│         React + Vite Frontend        │
│  (client/src — 14 dashboard pages)   │
└──────────────┬──────────────────────┘
               │ REST API calls
┌──────────────▼──────────────────────┐
│     Zoho Catalyst Serverless         │
│  ┌─────────────────────────────┐    │
│  │ get_crime_analytics (Express)│    │  ← Main backend
│  │ arise_chatbot_handler        │    │  ← ConvoKraft bot
│  │ alert_scheduler (Cron)       │    │  ← Auto anomaly detection
│  │ zia-tts-engine               │    │  ← Voice synthesis
│  └─────────────────────────────┘    │
└──────────────┬──────────────────────┘
               │ ZCQL queries
┌──────────────▼──────────────────────┐
│     Catalyst DataStore (ZCQL)        │
│  fir_master · offender_profile       │
│  entity_association_graph            │
│  modus_operandi_signature            │
│  geospatial_hotspot_indicator        │
│  bsa_audit_trail · bail_custody      │
│  biometric_record · forensic_evidence│
│  phone_financial_token               │
└─────────────────────────────────────┘
```

---

## Database Tables (10 ZCQL tables)

| Table | Purpose |
|-------|---------|
| `fir_master` | Root FIR records — BNS sections, GPS coords, timestamps |
| `offender_profile` | Accused persons, recidivism scores, bail status |
| `entity_association_graph` | Criminal network edge matrix |
| `modus_operandi_signature` | How crimes are committed — instruments, entry methods |
| `geospatial_hotspot_indicator` | Pre-computed risk grid cells (500m × 500m) |
| `bsa_audit_trail` | BSA Sec. 63 tamper-evident audit log |
| `bail_custody_status` | Real-time custody and bail tracking |
| `biometric_record` | Physical descriptors and biometric hashes |
| `forensic_evidence_log` | BNSS Sec. 176 evidence chain |
| `phone_financial_token` | UPI/bank/crypto/phone network nodes |

All tables follow **BNS 2023 / BNSS 2023 / BSA 2023 / CCTNS IIF** legal framework alignment.

---

## CCTNS Webhook Integration

Police stations can push live FIR data to ARISE without any manual entry:

1. Open **Settings** in the ARISE dashboard
2. Copy the **Webhook URL** and **Push Token**
3. Configure your CCTNS system to POST to this endpoint on every FIR registration
4. Data appears in all dashboards instantly via the live ZCQL tables

The webhook validates the token, maps CCTNS IIF fields to the `fir_master` schema, and triggers the alert_scheduler to check for anomalies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Visualizations | D3.js, Leaflet, react-globe.gl, Recharts |
| Backend | Zoho Catalyst Serverless (Node.js) |
| Database | Catalyst DataStore + ZCQL |
| AI — Chat | Catalyst GLM (GLM 4.7B) |
| AI — Predictions | Zoho QuickML |
| AI — Vision | Zia Face Analytics |
| AI — Voice | Zia STT/TTS + edge-tts (en-US-AvaNeural) |
| Security | BSA Sec. 63 SHA-256 hash chains |
| Deployment | Zoho Catalyst (frontend + backend) |

---

## Local Development

```bash
# 1. Install frontend dependencies
cd client
npm install

# 2. Set your API base URL
# Create client/.env:
echo "VITE_API_BASE=https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics" > .env

# 3. Run dev server
npm run dev
# → http://localhost:5173
```

### Backend (functions)
```bash
cd functions/get_crime_analytics
npm install

# Set environment variables (see .env.example)
# Then deploy via Catalyst CLI:
catalyst deploy
```

---

## Deployment to Zoho Catalyst

Follow the zip protocol (`zip_protocol.md`):

```bash
# Frontend
cd client && npm run build
cd dist && npx bestzip ../../frontend.zip *

# Backend
cd functions/get_crime_analytics
npx bestzip ../../backend.zip *
```

Upload `frontend.zip` to Catalyst Console → Client → Deploy  
Upload `backend.zip` to Catalyst Console → Functions → get_crime_analytics → Deploy

---

## Environment Variables

Set these in **Catalyst Console → Functions → get_crime_analytics → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `ZOHO_CLIENT_ID` | OAuth client ID from Zoho API Console |
| `ZOHO_CLIENT_SECRET` | OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token |
| `QUICKML_ORG_ID` | Your Catalyst org ID |

**Never commit actual values** — use the Catalyst Console env vars panel.

---

## Team

**Cognitive Cops** — KSP Datathon 2026  
Mascots: 🦁 Lion (Authority) · 🦊 Fox (Tactical Intelligence) · 🦉 Owl (Wisdom)

---

## Legal Framework

- **BNS 2023** — Bharatiya Nyaya Sanhita (replaces IPC)
- **BNSS 2023** — Bharatiya Nagarik Suraksha Sanhita (replaces CrPC)
- **BSA 2023** — Bharatiya Sakshya Adhiniyam (replaces Indian Evidence Act)
- **CCTNS IIF** — Crime and Criminal Tracking Network & Systems IIF forms
