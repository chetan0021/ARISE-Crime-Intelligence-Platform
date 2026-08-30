# COGNITIVE COPS — KSP DATATHON 2026
## Production-Grade Zoho Catalyst Database Schema Blueprint
### Unified Intelligence-Led Policing Platform (Challenge 1 + Challenge 2 Superset)

---

> **Team:** Cognitive Cops | **Mascots:** Lion (Authority) · Fox (Tactical Intelligence) · Owl (Wisdom)
> **Platform:** Zoho Catalyst DataStore + ZCQL (DML Only)
> **Legal Framework:** BNS 2023 · BNSS 2023 · BSA 2023 · CCTNS IIF Forms

---

## TABLE OF CONTENTS

1. [Schema Architecture Overview](#1-schema-architecture-overview)
2. [Table 1: fir_master](#2-table-1-fir_master)
3. [Table 2: offender_profile](#3-table-2-offender_profile)
4. [Table 3: entity_association_graph](#4-table-3-entity_association_graph)
5. [Table 4: modus_operandi_signature](#5-table-4-modus_operandi_signature)
6. [Table 5: biometric_record](#6-table-5-biometric_record)
7. [Table 6: geospatial_hotspot_indicator](#7-table-6-geospatial_hotspot_indicator)
8. [Table 7: bsa_audit_trail](#8-table-7-bsa_audit_trail)
9. [Table 8: bail_custody_status](#9-table-8-bail_custody_status)
10. [Table 9: forensic_evidence_log](#10-table-9-forensic_evidence_log)
11. [Table 10: phone_financial_token](#11-table-10-phone_financial_token)
12. [Seed Data: 3 Criminal Storylines](#12-seed-data-3-criminal-storylines)
13. [Production ZCQL Queries](#13-production-zcql-queries)
14. [Catalyst Console Setup Checklist](#14-catalyst-console-setup-checklist)

---

## 1. SCHEMA ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHALLENGE 1 LAYER                            │
│         Conversational AI · NLP Chatbot · Voice Interface       │
│   (Queries these tables via ZCQL to produce deterministic rows) │
└───────────────────────┬─────────────────────────────────────────┘
                        │ reads
┌───────────────────────▼─────────────────────────────────────────┐
│                    CHALLENGE 2 LAYER                            │
│      Predictive ML · Hotspot Maps · Graph Visualization         │
└──────────┬──────────────────┬───────────────────┬───────────────┘
           │                  │                   │
    ┌──────▼──────┐   ┌───────▼──────┐   ┌────────▼────────┐
    │ fir_master  │   │entity_assoc  │   │geospatial_      │
    │ offender_   │   │_graph        │   │hotspot_indicator│
    │ profile     │   │(Edge Matrix) │   │                 │
    └──────┬──────┘   └───────┬──────┘   └────────┬────────┘
           │                  │                   │
    ┌──────▼──────────────────▼───────────────────▼────────┐
    │  modus_operandi · biometric · bail_custody ·          │
    │  forensic_evidence · phone_financial_token ·          │
    │  bsa_audit_trail                                      │
    └───────────────────────────────────────────────────────┘
```

### Zoho Catalyst DataStore Constraints (Hardcoded Rules)
- **NO DDL via code.** All table/column creation must be done in the Catalyst Web Console GUI.
- **ZCQL handles DML only:** `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **Primary Keys** are auto-generated BigInt (`ROWID`) by Catalyst. Additional business-logic IDs stored as `VarChar` with `UNIQUE` constraint.
- **Foreign Keys** declared as `BigInt` type; referential integrity enforced at application layer.
- **Maximum VarChar length:** 255 characters (use `Text` for longer narratives).
- **No stored procedures, triggers, or sequences** in Catalyst DataStore.

---

## 2. TABLE 1: `fir_master`

**Purpose:** The root anchor for all criminal data. Every FIR registered across Karnataka's 1100+ stations. Powers the chatbot's primary lookup and the ML engine's base dataset.

**CCTNS IIF Alignment:** IIF-1 (First Information Report)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Catalyst internal row identifier |
| 2 | `fir_uid` | VarChar | Unique, Not Null | IIF-1: FIR Number format `PS-YYYY-NNNNNN` | Chatbot deterministic lookup key; human-readable FIR reference |
| 3 | `police_station_code` | VarChar | Not Null | IIF-1: PS LGD Code (MHA standard) | Geospatial join key; district-level drilldown anchor |
| 4 | `district_name` | VarChar | Not Null | CCTNS: Karnataka Revenue District | Hotspot aggregation by district |
| 5 | `subdivision_name` | VarChar | Not Null | CCTNS: Sub-Division Name | Mid-tier geographic clustering |
| 6 | `fir_registration_datetime` | DateTime | Not Null | BNSS Sec. 173: Mandatory timestamp within 24hr | ML temporal feature; BNSS compliance audit |
| 7 | `incident_reported_datetime` | DateTime | Not Null | BNSS Sec. 173: Date/time of occurrence | Time-delta analysis for delayed reporting pattern |
| 8 | `reporting_delay_hours` | Double | Not Null | BNSS Sec. 173: Derived field (reg - incident) | ML feature; anomaly detection for backdated FIRs |
| 9 | `bns_primary_section` | VarChar | Not Null | BNS 2023: Primary offence section e.g., `BNS-303` | Replaces legacy IPC; chatbot section-to-crime mapping |
| 10 | `bns_additional_sections` | Text | Nullable | BNS 2023: Pipe-delimited additional sections | Multi-charge parsing by NLP layer |
| 11 | `legacy_ipc_section` | VarChar | Nullable | Legacy IPC mapping for cross-reference | Backward compatibility for pre-2023 cases |
| 12 | `offence_description_text` | Text | Not Null | IIF-1: Gist of FIR (complaint narrative) | LLM semantic search; chatbot context window injection |
| 13 | `complainant_name` | VarChar | Not Null | IIF-1: Complainant/Informant Name | Chatbot victim lookup |
| 14 | `complainant_mobile` | VarChar | Nullable | IIF-1: Complainant contact | Graph node: phone linkage |
| 15 | `incident_latitude` | Double | Not Null | IIF-2: GPS coordinates of crime scene | Geospatial hotspot kernel density input |
| 16 | `incident_longitude` | Double | Not Null | IIF-2: GPS coordinates of crime scene | Geospatial hotspot kernel density input |
| 17 | `incident_address_text` | Text | Not Null | IIF-2: Full textual address | Chatbot address-based lookup |
| 18 | `property_type` | VarChar | Nullable | IIF-2: Residential/Commercial/Public/Vehicle | Hotspot segmentation by target type |
| 19 | `weapon_used` | VarChar | Nullable | IIF-2: Weapon/instrument description | MO matching; chatbot "instrument" filter |
| 20 | `time_of_day_slot` | VarChar | Not Null | IIF-2: Dawn/Morning/Afternoon/Evening/Night/Midnight | Temporal pattern ML feature; chatbot time filter |
| 21 | `efir_log_id` | VarChar | Nullable | BNSS Sec. 173(1): e-FIR system reference number | Digital FIR traceability |
| 22 | `mandatory_forensic_triggered` | Boolean | Not Null | BNSS Sec. 176: Auto-flag if offence ≥ 7yr punishment | BNSS compliance; forensic_evidence_log trigger |
| 23 | `investigation_officer_id` | BigInt | FK → offender_profile? No → separate staff table | IIF-1: IO Badge Number | Officer workload analytics |
| 24 | `io_name` | VarChar | Not Null | IIF-1: IO Name | Chatbot "who is investigating" query |
| 25 | `case_status` | VarChar | Not Null | IIF-1: Open/Chargesheeted/Closed-True/Closed-False/Referred | ML case outcome predictor label |
| 26 | `chargesheet_filed_datetime` | DateTime | Nullable | BNSS Sec. 193: 60-day/90-day deadline tracker | BNSS deadline compliance alert |
| 27 | `bnss_deadline_breached` | Boolean | Not Null | BNSS Sec. 193: Auto-flag if chargesheet overdue | Compliance dashboard KPI |
| 28 | `data_entry_operator_id` | VarChar | Not Null | CCTNS: DEO badge who entered record | BSA audit chain |
| 29 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63: Server-side creation timestamp | Audit trail anchor |
| 30 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63: SHA-256 hash of canonical row JSON | Electronic evidence integrity verification |

---

## 3. TABLE 2: `offender_profile`

**Purpose:** Master node registry for all accused, suspects, and persons of interest. This is the primary **node** in the graph visualization. Supports recidivism scoring and chatbot "known offender" queries.

**CCTNS IIF Alignment:** IIF-3 (Arrest / Accused Details)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Catalyst internal identifier |
| 2 | `offender_uid` | VarChar | Unique, Not Null | IIF-3: Accused Person Index `ACC-YYYYNNNNN` | Graph node ID; chatbot accused lookup |
| 3 | `full_name` | VarChar | Not Null | IIF-3: Name of Accused | Primary search field |
| 4 | `alias_names` | Text | Nullable | IIF-3: Aliases / Nicknames | Chatbot name disambiguation |
| 5 | `fathers_name` | VarChar | Nullable | IIF-3: Father's Name (Indian identity standard) | Identity deduplication |
| 6 | `date_of_birth` | DateTime | Nullable | IIF-3: DOB | Age computation; juvenile flag |
| 7 | `age_at_first_arrest` | Double | Nullable | IIF-3: Derived field | Recidivism onset ML feature |
| 8 | `gender` | VarChar | Not Null | IIF-3: Gender | Demographic analytics |
| 9 | `aadhaar_hash` | VarChar | Nullable | UIDAI: SHA-256 of Aadhaar number (never store raw) | Deduplication without PII exposure |
| 10 | `mobile_primary` | VarChar | Nullable | IIF-3: Primary contact number | Graph node: phone edge linkage |
| 11 | `mobile_secondary` | VarChar | Nullable | IIF-3: Secondary number | Graph: alternate phone node |
| 12 | `permanent_address_text` | Text | Nullable | IIF-3: Permanent address | Geographic origin ML feature |
| 13 | `current_address_text` | Text | Nullable | IIF-3: Current address | Proximity-to-crime-scene analysis |
| 14 | `current_latitude` | Double | Nullable | CCTNS: Last known GPS location | Predictive proximity score |
| 15 | `current_longitude` | Double | Nullable | CCTNS: Last known GPS location | Predictive proximity score |
| 16 | `nationality` | VarChar | Not Null | IIF-3: Nationality | Cross-border syndicate flag |
| 17 | `state_of_origin` | VarChar | Nullable | IIF-3: State | Inter-state gang ML clustering |
| 18 | `education_level` | VarChar | Nullable | IIF-3: Education | Socio-demographic feature |
| 19 | `occupation` | VarChar | Nullable | IIF-3: Occupation | Cover occupation pattern detection |
| 20 | `total_prior_arrests` | BigInt | Not Null | IIF-3: Prior criminal history count | Primary recidivism score input |
| 21 | `total_convictions` | BigInt | Not Null | IIF-3: Convictions count | Recidivism weight factor |
| 22 | `is_repeat_offender` | Boolean | Not Null | IIF-3: Habitual offender flag | Chatbot filter: "repeat offender" query |
| 23 | `is_rowdy_sheeter` | Boolean | Not Null | KSP: Rowdy Sheet maintained Y/N | Karnataka-specific high-risk classification |
| 24 | `rowdy_sheet_number` | VarChar | Nullable | KSP: RS-PS-YYYY-NNN format | Direct KSP registry linkage |
| 25 | `gang_affiliation_text` | VarChar | Nullable | IIF-3: Known gang/syndicate name | Graph community detection label |
| 26 | `recidivism_risk_score` | Double | Nullable | ML Output: 0.00–1.00 | Predictive risk display; chatbot risk query |
| 27 | `risk_score_updated_datetime` | DateTime | Nullable | ML: Last model inference timestamp | Model freshness indicator |
| 28 | `photo_url` | VarChar | Nullable | IIF-3: Mugshot reference | UI display |
| 29 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63: Row integrity hash | Audit trail |
| 30 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63: Creation timestamp | Audit anchor |

---

## 4. TABLE 3: `entity_association_graph`

**Purpose:** The **Edge Matrix** of the entire knowledge graph. Every directional relationship between any two entities (person↔person, person↔phone, person↔FIR, person↔bank account, phone↔phone) is stored as a row here. Powers the network link visualization entirely.

**CCTNS IIF Alignment:** IIF-3 (Co-Accused), IIF-4 (Seizure linkages)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Catalyst row ID |
| 2 | `edge_uid` | VarChar | Unique, Not Null | Custom: `EDGE-YYYYNNNNN` | Graph edge unique identifier |
| 3 | `source_entity_type` | VarChar | Not Null | Node type: OFFENDER / FIR / PHONE / BANK / VEHICLE / ADDRESS | Graph node type classifier |
| 4 | `source_entity_id` | VarChar | Not Null | Corresponding UID from source table | Graph: source node pointer |
| 5 | `target_entity_type` | VarChar | Not Null | Node type: OFFENDER / FIR / PHONE / BANK / VEHICLE / ADDRESS | Graph: target node type |
| 6 | `target_entity_id` | VarChar | Not Null | Corresponding UID from target table | Graph: target node pointer |
| 7 | `relationship_type` | VarChar | Not Null | IIF-3: CO_ACCUSED / ASSOCIATE / FAMILY / EMPLOYER / HANDLER / CONDUIT / VICTIM / WITNESS | Edge label for graph rendering |
| 8 | `relationship_strength` | Double | Not Null | ML: 0.00–1.00 co-occurrence weight | Edge thickness in graph visualization |
| 9 | `first_observed_datetime` | DateTime | Not Null | IIF-3: Date relationship first documented | Temporal graph evolution |
| 10 | `last_observed_datetime` | DateTime | Not Null | IIF-3: Most recent confirmed association | Recency weight for active links |
| 11 | `fir_uid_context` | VarChar | Nullable | IIF-3: FIR in which association was established | Edge context; chatbot "connected via case" |
| 12 | `association_evidence_text` | Text | Nullable | IIF-3: Documentary basis for the link | LLM explainability; analyst notes |
| 13 | `is_active` | Boolean | Not Null | Operational: Current active link or historical | Filter active network from dormant |
| 14 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Audit trail |
| 15 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Audit anchor |

---

## 5. TABLE 4: `modus_operandi_signature`

**Purpose:** Encodes the *how* of each crime. Each FIR gets one MO record. This is the critical table for the chatbot's "instrument + time + method" compound filter and for ML clustering of crime series.

**CCTNS IIF Alignment:** IIF-2 (Crime Scene Details), IIF-5 (Chargesheet MO)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `mo_uid` | VarChar | Unique, Not Null | `MO-YYYYNNNNN` | MO record ID |
| 3 | `fir_uid` | VarChar | Not Null, FK→fir_master | IIF-2: FIR reference | Links MO to case |
| 4 | `offender_uid` | VarChar | Not Null, FK→offender_profile | IIF-3: Accused reference | Links MO to individual offender |
| 5 | `crime_category` | VarChar | Not Null | BNS: THEFT / HOUSEBREAKING / ROBBERY / ASSAULT / CYBER / MURDER / NARCOTICS / KIDNAPPING / FRAUD | Top-level crime taxonomy |
| 6 | `crime_subcategory` | VarChar | Nullable | BNS: e.g., DAYTIME_BURGLARY / NOCTURNAL_HOUSEBREAKING / UPI_FRAUD / SIM_SWAP | Granular pattern matching |
| 7 | `entry_method` | VarChar | Nullable | IIF-2: LOCK_PICKED / WALL_SCALED / DOOR_FORCED / WINDOW_BROKEN / SOCIAL_ENGINEERING / NONE | MO clustering key |
| 8 | `instrument_used` | VarChar | Nullable | IIF-2: Specific tool e.g., `crowbar`, `glasscutter`, `OTP_phishing_kit` | Chatbot instrument filter; tool-series linking |
| 9 | `target_selection_criteria` | VarChar | Nullable | IIF-2: ELDERLY_RESIDENT / COMMERCIAL_ATNIGHT / LONE_WOMAN / ATM_USER / ONLINE_SELLER | Victim profiling ML |
| 10 | `time_of_operation` | VarChar | Not Null | IIF-2: DAWN/MORNING/AFTERNOON/EVENING/NIGHT/MIDNIGHT | Temporal MO pattern — chatbot key filter |
| 11 | `day_of_week` | VarChar | Not Null | IIF-2: MON/TUE/WED/THU/FRI/SAT/SUN | Weekly cyclical pattern feature |
| 12 | `escape_method` | VarChar | Nullable | IIF-2: FOOT / TWO_WHEELER / CAR / AUTO / PUBLIC_TRANSPORT / UNKNOWN | Post-crime movement pattern |
| 13 | `vehicle_used_number` | VarChar | Nullable | IIF-2: Vehicle registration if known | Graph node: vehicle edge |
| 14 | `disguise_used` | Boolean | Not Null | IIF-2: Disguise/mask employed Y/N | MO complexity flag |
| 15 | `accomplice_count` | BigInt | Not Null | IIF-3: Number of co-accused | Gang operation indicator |
| 16 | `language_spoken_at_scene` | VarChar | Nullable | IIF-2: Dialect/language used | Geographic origin inference |
| 17 | `property_stolen_value_inr` | Double | Nullable | IIF-4: Estimated value of stolen property | Economic impact; IPC quantum |
| 18 | `digital_footprint_present` | Boolean | Not Null | BSA Sec. 63: Any digital evidence present Y/N | Triggers BSA audit trail |
| 19 | `mo_narrative_text` | Text | Not Null | IIF-2 + IIF-5: Full MO description in investigator's words | LLM semantic similarity for series detection |
| 20 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Audit integrity |
| 21 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp anchor |

---

## 6. TABLE 5: `biometric_record`

**Purpose:** Stores biometric identifiers and physical descriptors per offender. Enables deduplication of repeat offenders across jurisdictions and supports the "unknown accused" matching workflow.

**CCTNS IIF Alignment:** IIF-3 (Physical Description of Accused)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `biometric_uid` | VarChar | Unique, Not Null | `BIO-YYYYNNNNN` | Biometric record ID |
| 3 | `offender_uid` | VarChar | Not Null, FK→offender_profile | IIF-3: Accused reference | Links to offender node |
| 4 | `fingerprint_hash_r_index` | VarChar | Nullable | IIF-3: Right Index fingerprint (hashed, not raw image) | AFIS-compatible deduplication |
| 5 | `fingerprint_hash_l_index` | VarChar | Nullable | IIF-3: Left Index fingerprint hash | Cross-match |
| 6 | `height_cm` | Double | Nullable | IIF-3: Height in cm | Physical description ML feature |
| 7 | `weight_kg` | Double | Nullable | IIF-3: Weight | Physical match |
| 8 | `complexion` | VarChar | Nullable | IIF-3: FAIR/WHEATISH/DARK | Witness description matching |
| 9 | `build` | VarChar | Nullable | IIF-3: LEAN/MEDIUM/STOUT | Witness description matching |
| 10 | `identifying_marks_text` | Text | Nullable | IIF-3: Scars, tattoos, deformities description | NLP-based witness account matching |
| 11 | `hair_colour` | VarChar | Nullable | IIF-3: Hair colour/style | Physical match |
| 12 | `eye_colour` | VarChar | Nullable | IIF-3: Eye colour | Physical match |
| 13 | `face_encoding_hash` | VarChar | Nullable | BSA Sec. 63: Hash of facial recognition encoding vector | Privacy-preserving face match reference |
| 14 | `voice_sample_hash` | VarChar | Nullable | BSA Sec. 63: Hash of voice print | Audio evidence linkage |
| 15 | `blood_group` | VarChar | Nullable | IIF-3: ABO+Rh blood group | Forensic scene linkage |
| 16 | `dna_profile_reference` | VarChar | Nullable | BNSS Sec. 176: DNA profiling reference number (NCRB CODIS) | BNSS mandatory forensic linkage |
| 17 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Audit integrity |
| 18 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp |

---

## 7. TABLE 6: `geospatial_hotspot_indicator`

**Purpose:** Pre-aggregated and ML-scored geospatial intelligence per location cell. Each row represents a geographic grid cell (approx. 500m × 500m) with composite risk scores. This is the primary data source for the **Challenge 2 Hotspot Map** and the predictive policing dashboard.

**CCTNS IIF Alignment:** IIF-2 (Incident Location) — aggregated view

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `cell_uid` | VarChar | Unique, Not Null | `CELL-DISTCODE-HHHHVVVV` (H=horizontal grid, V=vertical) | Grid cell unique ID |
| 3 | `district_name` | VarChar | Not Null | Karnataka Revenue District | District drilldown filter |
| 4 | `police_station_code` | VarChar | Not Null | LGD PS Code | Station-level aggregation |
| 5 | `cell_center_latitude` | Double | Not Null | Geographic centroid lat | Map rendering anchor |
| 6 | `cell_center_longitude` | Double | Not Null | Geographic centroid lon | Map rendering anchor |
| 7 | `cell_radius_meters` | Double | Not Null | Grid resolution parameter | Zoom-level adaptive rendering |
| 8 | `crime_count_total` | BigInt | Not Null | Aggregated from fir_master | Raw intensity for heatmap |
| 9 | `crime_count_last_30d` | BigInt | Not Null | Rolling 30-day window | Recency-weighted hotspot |
| 10 | `crime_count_last_7d` | BigInt | Not Null | Rolling 7-day window | Emerging hotspot alert |
| 11 | `dominant_crime_type` | VarChar | Not Null | BNS: Most frequent crime category in cell | Map tooltip label |
| 12 | `housebreaking_count` | BigInt | Not Null | BNS-331: Housebreaking-specific count | Chatbot "HB in area" query |
| 13 | `cyber_crime_count` | BigInt | Not Null | BNS-318: Cyber fraud count | Cyber hotspot layer |
| 14 | `assault_count` | BigInt | Not Null | BNS-115: Assault count | Violence layer |
| 15 | `night_crime_ratio` | Double | Not Null | % crimes between 21:00–05:00 | Nocturnal risk scoring |
| 16 | `weekend_crime_ratio` | Double | Not Null | % crimes on Sat/Sun | Weekend surge pattern |
| 17 | `repeat_offender_density` | Double | Not Null | % crimes by known repeat offenders | High-risk offender concentration |
| 18 | `socioeconomic_vulnerability_score` | Double | Nullable | Census + crime correlation: 0.00–1.00 | Challenge 2: Socio-economic crime correlation |
| 19 | `unemployment_rate_proxy` | Double | Nullable | District economic indicator | Socio-demographic ML feature |
| 20 | `slum_proximity_flag` | Boolean | Nullable | Census: Urban slum zone proximity | Vulnerability factor |
| 21 | `composite_risk_score` | Double | Not Null | ML Output: Kernel Density + Temporal + Socioeconomic | Primary hotspot rank value; map colour scale |
| 22 | `risk_tier` | VarChar | Not Null | ML Output: RED / ORANGE / YELLOW / GREEN | Dashboard tier label |
| 23 | `predicted_peak_hour_start` | BigInt | Nullable | ML Output: Predicted hour (0–23) crime spike | Patrol scheduling recommendation |
| 24 | `predicted_peak_hour_end` | BigInt | Nullable | ML Output: End hour of predicted spike | Patrol end time |
| 25 | `last_refreshed_datetime` | DateTime | Not Null | ETL pipeline timestamp | Data freshness indicator |
| 26 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Audit |
| 27 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp |

---

## 8. TABLE 7: `bsa_audit_trail`

**Purpose:** A tamper-evident, append-only log of every data access and mutation event in the system. Mandatory under **BSA Section 63** for electronic evidence to be admissible in court. Every row in every other table that is accessed, inserted, or updated generates a corresponding audit row here.

**CCTNS IIF Alignment:** All IIF forms — audit overlay

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `audit_uid` | VarChar | Unique, Not Null | `AUD-YYYYMMDD-NNNNNNN` | Audit record ID |
| 3 | `event_datetime` | DateTime | Not Null | BSA Sec. 63(4): Server-side UTC timestamp | Court-admissible event time |
| 4 | `event_type` | VarChar | Not Null | BSA: INSERT / SELECT / UPDATE / DELETE / LOGIN / EXPORT | Action type for forensic review |
| 5 | `target_table_name` | VarChar | Not Null | BSA: Table affected | Scope of access |
| 6 | `target_record_uid` | VarChar | Not Null | BSA: UID of record accessed | Specific record trace |
| 7 | `actor_officer_id` | VarChar | Not Null | BSA Sec. 63: Officer badge / service ID | Human actor identification |
| 8 | `actor_role` | VarChar | Not Null | RBAC: IO / SHO / SP / ANALYST / CHATBOT_SYSTEM / ADMIN | Role-based context |
| 9 | `actor_ip_address` | VarChar | Not Null | BSA Sec. 63(4): Source IP | Network forensics |
| 10 | `actor_device_id` | VarChar | Not Null | BSA Sec. 63(4): Registered device IMEI or MAC hash | Device authentication |
| 11 | `session_token_hash` | VarChar | Not Null | BSA: SHA-256 of session JWT | Session traceability |
| 12 | `query_executed` | Text | Nullable | BSA: Actual ZCQL query string run | Query-level audit |
| 13 | `data_before_hash` | VarChar | Nullable | BSA Sec. 63: SHA-256 of row JSON pre-mutation | Before-state integrity proof |
| 14 | `data_after_hash` | VarChar | Nullable | BSA Sec. 63: SHA-256 of row JSON post-mutation | After-state integrity proof |
| 15 | `catalyst_server_timestamp` | DateTime | Not Null | BSA Sec. 63(4): Zoho Catalyst infrastructure timestamp | Independent server-side verification |
| 16 | `is_anomalous` | Boolean | Not Null | ML: Unusual access pattern flag | Security monitoring |
| 17 | `anomaly_reason_text` | Text | Nullable | ML Output: Why flagged as anomalous | Alert context |

---

## 9. TABLE 8: `bail_custody_status`

**Purpose:** Real-time custody disposition for each accused across all their associated FIRs. The chatbot's "currently on bail" filter is impossible without this table. Also feeds the risk escalation engine when a known offender is released.

**CCTNS IIF Alignment:** IIF-3 (Arrest/Bail Details)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `bail_uid` | VarChar | Unique, Not Null | `BAIL-YYYYNNNNN` | Status record ID |
| 3 | `offender_uid` | VarChar | Not Null, FK→offender_profile | IIF-3: Accused | Links status to person |
| 4 | `fir_uid` | VarChar | Not Null, FK→fir_master | IIF-3: Case reference | Links status to case |
| 5 | `arrest_datetime` | DateTime | Nullable | BNSS Sec. 35: Mandatory arrest recording | BNSS compliance |
| 6 | `current_status` | VarChar | Not Null | IIF-3: ARRESTED / BAIL / JUDICIAL_CUSTODY / POLICE_CUSTODY / ABSCONDING / SURRENDERED / DISCHARGED | Primary chatbot filter field |
| 7 | `bail_granted_datetime` | DateTime | Nullable | BNSS Sec. 480: Bail order date | Release timeline |
| 8 | `bail_type` | VarChar | Nullable | BNSS: REGULAR / ANTICIPATORY / SURETY / PERSONAL_BOND | Bail classification |
| 9 | `bail_conditions_text` | Text | Nullable | BNSS Sec. 480: Conditions imposed | Compliance monitoring |
| 10 | `bail_expiry_datetime` | DateTime | Nullable | Court order expiry date | Deadline alert |
| 11 | `court_name` | VarChar | Nullable | IIF-3: Jurisdictional court name | Legal trail |
| 12 | `court_case_number` | VarChar | Nullable | Court docket reference | Cross-system reference |
| 13 | `surety_amount_inr` | Double | Nullable | BNSS: Bail bond amount | Financial compliance monitoring |
| 14 | `last_status_updated_datetime` | DateTime | Not Null | Operational: Last update timestamp | Staleness alert |
| 15 | `updated_by_officer_id` | VarChar | Not Null | Operational: Officer who updated | Audit chain |
| 16 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Integrity hash |
| 17 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp |

---

## 10. TABLE 9: `forensic_evidence_log`

**Purpose:** Tracks every piece of physical and digital forensic evidence linked to a case. Triggered automatically when `mandatory_forensic_triggered = TRUE` in `fir_master` (BNSS Sec. 176 compliance).

**CCTNS IIF Alignment:** IIF-4 (Seizure Memo), IIF-5 (Chargesheet exhibits)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `evidence_uid` | VarChar | Unique, Not Null | `EVD-YYYYNNNNN` | Evidence record ID |
| 3 | `fir_uid` | VarChar | Not Null, FK→fir_master | IIF-4: Seizure memo FIR | Links evidence to case |
| 4 | `evidence_type` | VarChar | Not Null | IIF-4: PHYSICAL / DIGITAL / BIOLOGICAL / DOCUMENTARY / TRACE | Evidence taxonomy |
| 5 | `evidence_description_text` | Text | Not Null | IIF-4: Full description | Chatbot evidence query |
| 6 | `seizure_datetime` | DateTime | Not Null | IIF-4: Panchanama date/time | BNSS Sec. 176 timestamp |
| 7 | `seized_from_person` | VarChar | Nullable | IIF-4: Name of person from whom seized | Chain of custody |
| 8 | `storage_location` | VarChar | Nullable | IIF-4: Malkhana / FSL / Court | Physical custody |
| 9 | `fsL_report_status` | VarChar | Nullable | BNSS Sec. 176: PENDING / RECEIVED / INCONCLUSIVE / POSITIVE | FSL pipeline tracking |
| 10 | `fsl_report_datetime` | DateTime | Nullable | BNSS Sec. 176: FSL report date | BNSS timeline compliance |
| 11 | `digital_evidence_hash` | VarChar | Nullable | BSA Sec. 63: SHA-256 of digital evidence file | Electronic admissibility |
| 12 | `device_identifier` | VarChar | Nullable | BSA Sec. 63(4): IMEI/MAC/Serial of seized device | Device forensics chain |
| 13 | `chain_of_custody_log` | Text | Not Null | IIF-4 + BSA: Pipe-delimited custody transfer log | Full chain: seizure→FSL→court |
| 14 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Row integrity |
| 15 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp |

---

## 11. TABLE 10: `phone_financial_token`

**Purpose:** Registry of all phone numbers, UPI IDs, bank accounts, and cryptocurrency wallet addresses linked to any entity in the system. Each row is a **non-person node** in the graph. Critical for cyber-fraud syndicate network mapping.

**CCTNS IIF Alignment:** IIF-3 (Communication details), IIF-4 (Seized financial instruments)

| # | Column Name | Catalyst Data Type | Constraints | BNS/BNSS/IIF Legal Mapping | Architectural Purpose |
|---|---|---|---|---|---|
| 1 | `ROWID` | BigInt | PK, Auto, Not Null | System PK | Internal ID |
| 2 | `token_uid` | VarChar | Unique, Not Null | `TOK-YYYYNNNNN` | Token node ID |
| 3 | `token_type` | VarChar | Not Null | IIF-3/4: MOBILE / IMEI / UPI_ID / BANK_ACCOUNT / CRYPTO_WALLET / EMAIL | Node type classifier |
| 4 | `token_value_hash` | VarChar | Not Null | BSA Sec. 63: SHA-256 of actual value (never store raw) | Privacy-preserving graph node |
| 5 | `token_value_masked` | VarChar | Not Null | Masked display: e.g., `XXXXXXXX4521` for UI | Analyst display without full PII |
| 6 | `telecom_operator` | VarChar | Nullable | IIF-3: Airtel/Jio/BSNL/Vi | SIM-swap pattern detection |
| 7 | `bank_name` | VarChar | Nullable | IIF-4: Bank name | Financial institution link |
| 8 | `registered_state` | VarChar | Nullable | Telecom/bank registration state | Geo-origin inference |
| 9 | `is_flagged` | Boolean | Not Null | KSP/FIU: Flagged by law enforcement/Financial Intelligence | High-risk node indicator |
| 10 | `flag_reason_text` | Text | Nullable | Operational: Reason for flag | Alert context |
| 11 | `transaction_count_linked` | BigInt | Nullable | Financial intelligence: Transaction volume | Money mule detection |
| 12 | `total_amount_transacted_inr` | Double | Nullable | FIU: Total suspicious value | Quantum of cyber fraud |
| 13 | `first_seen_datetime` | DateTime | Not Null | Operational: First appearance in any case | Timeline anchoring |
| 14 | `last_seen_datetime` | DateTime | Not Null | Operational: Most recent case appearance | Recency scoring |
| 15 | `record_sha256_hash` | VarChar | Not Null | BSA Sec. 63 | Integrity |
| 16 | `record_created_datetime` | DateTime | Not Null | BSA Sec. 63 | Timestamp |

---

## 12. SEED DATA: 3 CRIMINAL STORYLINES

> All names, numbers, and identifiers below are **entirely fictional** and created for database testing purposes only.

---

### STORYLINE A: Multi-Jurisdictional Cyber-Fraud Syndicate (OTP/SIM-Swap Ring)

**Narrative:** A Bengaluru-based cyber fraud cell operating from Whitefield and Marathahalli. Ringleader "Vicky" recruits bank mules, uses SIM-swap attacks to intercept OTPs, and launders through multiple UPI IDs.

#### `fir_master` rows

```
fir_uid             : FIR-WHFLD-2024-000441
police_station_code : PS-KA-BLR-WHFLD-031
district_name       : Bengaluru Urban
subdivision_name    : Whitefield
fir_registration_datetime : 2024-09-14 11:32:00
incident_reported_datetime: 2024-09-13 23:15:00
reporting_delay_hours     : 12.28
bns_primary_section       : BNS-318(4)
offence_description_text  : Complainant Meera Rao reports unknown persons performed SIM-swap on her Airtel number +91-98XXXXXX12, intercepted banking OTP, and fraudulently transferred Rs. 2,40,000 from her SBI account to an unknown UPI ID. Victim received no SMS during the swap window.
complainant_name          : Meera Rao
complainant_mobile        : 9845XXXX12
incident_latitude         : 12.9698
incident_longitude        : 77.7499
incident_address_text     : No. 14, Palm Grove Apartments, ITPL Main Road, Whitefield, Bengaluru - 560066
property_type             : DIGITAL_ACCOUNT
weapon_used               : OTP_phishing_kit
time_of_day_slot          : MIDNIGHT
efir_log_id               : EFIR-KA-2024-WF-08812
mandatory_forensic_triggered : TRUE
case_status               : Open
record_sha256_hash        : a3f9c1e8b2d4a6f0c3e7b9d1a5f8c2e4b6d0a3f9c1e8b2d4a6f0c3e7b9d1a5f
record_created_datetime   : 2024-09-14 11:35:22

fir_uid             : FIR-MRATH-2024-000512
police_station_code : PS-KA-BLR-MRATH-029
district_name       : Bengaluru Urban
subdivision_name    : Marathahalli
fir_registration_datetime : 2024-09-18 14:20:00
incident_reported_datetime: 2024-09-17 22:45:00
reporting_delay_hours     : 15.58
bns_primary_section       : BNS-318(4)
offence_description_text  : Suresh Nair reports fraudulent transfer of Rs. 1,75,000 via SIM-swap attack on his Jio number. Same MO as Whitefield case — OTP intercept followed by IMPS transfer to mule account.
complainant_name          : Suresh Nair
incident_latitude         : 12.9561
incident_longitude        : 77.7011
time_of_day_slot          : NIGHT
mandatory_forensic_triggered : TRUE
case_status               : Open
record_sha256_hash        : b7e2d4a1c9f3b5e7d0a2c4f6b8e0d2a4c6f8b0e2d4a1c9f3b5e7d0a2c4f6b8e
record_created_datetime   : 2024-09-18 14:25:10
```

#### `offender_profile` rows

```
offender_uid      : ACC-2024-00441
full_name         : Vikram Shetty
alias_names       : Vicky | Vikki Cyber
fathers_name      : Ramesh Shetty
date_of_birth     : 1992-06-15 00:00:00
gender            : MALE
mobile_primary    : 9741XXXX88
nationality       : Indian
state_of_origin   : Karnataka
occupation        : Freelance IT Consultant (self-declared)
total_prior_arrests : 2
total_convictions   : 0
is_repeat_offender  : TRUE
is_rowdy_sheeter    : FALSE
gang_affiliation_text : Whitefield Cyber Cell
recidivism_risk_score : 0.82
record_sha256_hash  : c1e3a5b7d9f1c3e5a7b9d1f3c5e7a9b1d3f5c7e9a1b3d5f7c9e1a3b5d7f9c1
record_created_datetime: 2024-09-14 11:40:00

offender_uid      : ACC-2024-00442
full_name         : Praveen Kumar M
alias_names       : Pravi Mule
fathers_name      : Mohan Kumar
date_of_birth     : 1999-03-22 00:00:00
gender            : MALE
mobile_primary    : 8880XXXX21
occupation        : Delivery Boy (mule account holder)
total_prior_arrests : 0
total_convictions   : 0
is_repeat_offender  : FALSE
is_rowdy_sheeter    : FALSE
gang_affiliation_text : Whitefield Cyber Cell
recidivism_risk_score : 0.45
record_sha256_hash  : d2f4a6b8e0c2d4f6a8b0e2c4d6f8a0b2e4c6d8f0a2b4d6f8e0c2d4f6a8b0e2
record_created_datetime: 2024-09-18 15:00:00
```

#### `phone_financial_token` rows (Non-Person Nodes)

```
token_uid          : TOK-2024-00881
token_type         : UPI_ID
token_value_hash   : e3a7c1f5b9d3e7a1c5f9b3d7e1a5c9f3b7d1e5a9c3f7b1d5e9a3c7f1b5d9e3
token_value_masked : XXXXXXXXX@okicici
telecom_operator   : NULL
bank_name          : ICICI Bank
is_flagged         : TRUE
flag_reason_text   : Mule account — received Rs. 2,40,000 from Meera Rao SIM-swap case FIR-WHFLD-2024-000441
transaction_count_linked : 18
total_amount_transacted_inr : 847000.00
first_seen_datetime : 2024-09-13 23:20:00
record_sha256_hash  : f4b8c2e6a0d4f8b2c6e0a4d8f2b6c0e4a8d2f6b0c4e8a2d6f0b4c8e2a6d0f4
record_created_datetime: 2024-09-14 11:45:00

token_uid          : TOK-2024-00882
token_type         : MOBILE
token_value_hash   : a5c9e3b7d1f5a9c3e7b1d5f9a3c7e1b5d9f3a7c1e5b9d3f7a1c5e9b3d7f1a5
token_value_masked : 9741XXXX88
telecom_operator   : Jio
is_flagged         : TRUE
flag_reason_text   : Primary operative number for Vikram Shetty / Whitefield Cyber Cell
first_seen_datetime : 2024-09-13 22:00:00
record_sha256_hash  : b6d0e4a8c2f6b0d4e8a2c6f0b4d8e2a6c0f4b8d2e6a0c4f8b2d6e0a4c8f2b6
record_created_datetime: 2024-09-14 11:47:00
```

#### `entity_association_graph` rows (Edges)

```
edge_uid            : EDGE-2024-00901
source_entity_type  : OFFENDER
source_entity_id    : ACC-2024-00441
target_entity_type  : OFFENDER
target_entity_id    : ACC-2024-00442
relationship_type   : CO_ACCUSED
relationship_strength: 0.91
first_observed_datetime: 2024-09-14 00:00:00
last_observed_datetime : 2024-09-18 00:00:00
fir_uid_context     : FIR-WHFLD-2024-000441
association_evidence_text: Praveen Kumar's bank account received funds from UPI ID directly linked to Vikram Shetty's operation. Call records show 14 contacts in 3-day window.
is_active           : TRUE

edge_uid            : EDGE-2024-00902
source_entity_type  : OFFENDER
source_entity_id    : ACC-2024-00441
target_entity_type  : PHONE
target_entity_id    : TOK-2024-00882
relationship_type   : HANDLER
relationship_strength: 0.99
first_observed_datetime: 2024-09-13 22:00:00
fir_uid_context     : FIR-WHFLD-2024-000441
is_active           : TRUE

edge_uid            : EDGE-2024-00903
source_entity_type  : OFFENDER
source_entity_id    : ACC-2024-00442
target_entity_type  : PHONE
target_entity_id    : TOK-2024-00881
relationship_type   : CONDUIT
relationship_strength: 0.95
fir_uid_context     : FIR-WHFLD-2024-000441
is_active           : TRUE
```

---

### STORYLINE B: Organized Nocturnal Housebreaking Ring (Crowbar Entry, Two-Wheeler Escape)

**Narrative:** A three-man ring operating across Jayanagar, JP Nagar, and BTM Layout. Break into ground-floor flats between 00:00–03:00 using crowbars, escape on a stolen Activa. "Ramu" is the repeat offender with prior housebreaking history. Currently out on bail from a 2022 case.

#### `fir_master` rows

```
fir_uid             : FIR-JYNGR-2024-001122
police_station_code : PS-KA-BLR-JAYNAGAR-014
district_name       : Bengaluru Urban
subdivision_name    : South
fir_registration_datetime : 2024-11-02 06:10:00
incident_reported_datetime: 2024-11-02 02:30:00
bns_primary_section : BNS-331(3)
offence_description_text  : Complainant Lakshmi Venkatesh reports door lock broken using heavy instrument. Ground floor flat. Gold jewellery worth Rs. 3,50,000 and cash Rs. 45,000 stolen. Broken lock and pry marks on doorframe indicate crowbar entry. Security camera captured two-wheeler without number plate fleeing north on 4th Block road at 02:42.
complainant_name    : Lakshmi Venkatesh
incident_latitude   : 12.9250
incident_longitude  : 77.5938
property_type       : RESIDENTIAL_GROUND_FLOOR
weapon_used         : crowbar
time_of_day_slot    : MIDNIGHT
mandatory_forensic_triggered : TRUE
case_status         : Open
record_sha256_hash  : c7e1a5d9b3f7c1e5a9d3b7f1c5e9a3d7b1f5c9e3a7d1b5f9c3e7a1d5b9f3c7
```

#### `offender_profile` row

```
offender_uid      : ACC-2022-00189
full_name         : Ramachandra B
alias_names       : Ramu | Stone Ramu
fathers_name      : Basavaiah B
date_of_birth     : 1988-11-03 00:00:00
gender            : MALE
mobile_primary    : 9480XXXX55
occupation        : Casual Labour
total_prior_arrests : 5
total_convictions   : 1
is_repeat_offender  : TRUE
is_rowdy_sheeter    : TRUE
rowdy_sheet_number  : RS-JAYNAGAR-2020-007
gang_affiliation_text : Jayanagar HB Ring
recidivism_risk_score : 0.91
record_sha256_hash  : d8f2b6e0a4c8f2b6e0a4c8f2b6e0a4c8f2b6e0a4c8f2b6e0a4c8f2b6e0a4c8
```

#### `modus_operandi_signature` row

```
mo_uid              : MO-2024-01122
fir_uid             : FIR-JYNGR-2024-001122
offender_uid        : ACC-2022-00189
crime_category      : HOUSEBREAKING
crime_subcategory   : NOCTURNAL_HOUSEBREAKING
entry_method        : DOOR_FORCED
instrument_used     : crowbar
target_selection_criteria: GROUND_FLOOR_RESIDENTIAL
time_of_operation   : MIDNIGHT
day_of_week         : FRI
escape_method       : TWO_WHEELER
vehicle_used_number : KA-05-AB-UNKNOWN-STOLEN-ACTIVA
disguise_used       : TRUE
accomplice_count    : 2
language_spoken_at_scene: Kannada
property_stolen_value_inr: 395000.00
digital_footprint_present: TRUE
mo_narrative_text   : Three offenders arrived on a dark-coloured Activa without number plates at approximately 02:30 hrs. Two acted as lookouts while the primary operative forced the main door using a crowbar. Entry took approx 4 minutes per CCTV. Faces covered with cloth. Exited within 12 minutes carrying a bag. Language overheard by neighbour was Kannada. Same MO as FIR-JPNGR-2024-000988 and FIR-BTM-2024-001041.
```

#### `bail_custody_status` row

```
bail_uid            : BAIL-2024-00189
offender_uid        : ACC-2022-00189
fir_uid             : FIR-JYNGR-2022-000334
arrest_datetime     : 2022-08-12 09:00:00
current_status      : BAIL
bail_granted_datetime: 2023-01-20 00:00:00
bail_type           : REGULAR
bail_conditions_text: Must report to Jayanagar PS every Monday. Shall not leave Karnataka without court permission. Surety of Rs. 50,000.
bail_expiry_datetime: 2025-01-19 00:00:00
court_name          : ACMM Court, Bengaluru
court_case_number   : CC-2023-00445-BLR
surety_amount_inr   : 50000.00
record_sha256_hash  : e9a3c7f1b5d9e3a7c1f5b9d3e7a1c5f9b3d7e1a5c9f3b7d1e5a9c3f7b1d5e9
```

---

### STORYLINE C: Repeat Offender — Serial Mobile Snatching (Auto-Stop Ambush)

**Narrative:** Known offender "Deepu" operating in Koramangala and HSR Layout. Stops victims in autorickshaws at night, flashes a weapon, snatches phone and wallet. Fourth offence; prior three cases led to no conviction due to witness turning hostile.

#### `fir_master` row

```
fir_uid             : FIR-KORAM-2024-002210
police_station_code : PS-KA-BLR-KORAMANGALA-022
district_name       : Bengaluru Urban
subdivision_name    : Southeast
fir_registration_datetime : 2024-12-05 01:45:00
incident_reported_datetime: 2024-12-05 00:50:00
bns_primary_section : BNS-309(4)
offence_description_text  : Victim Ananya Singh travelling in auto. Unknown assailant on bike flagged auto near Sony Signal, knocked on window, threatened with knife-like object, snatched Samsung Galaxy S24 and wallet containing Rs. 8,000 cash and debit cards. Fled east on bike. Auto driver KA-01-AB-4421 is witness.
complainant_name    : Ananya Singh
incident_latitude   : 12.9352
incident_longitude  : 77.6244
property_type       : PUBLIC_ROAD
weapon_used         : knife_suspected
time_of_day_slot    : MIDNIGHT
mandatory_forensic_triggered : FALSE
case_status         : Open
```

#### `offender_profile` row

```
offender_uid      : ACC-2020-00077
full_name         : Deepak Raj N
alias_names       : Deepu | Speed Deepu
fathers_name      : Nagaraju N
date_of_birth     : 1995-07-18 00:00:00
gender            : MALE
total_prior_arrests : 4
total_convictions   : 0
is_repeat_offender  : TRUE
is_rowdy_sheeter    : FALSE
recidivism_risk_score : 0.87
gang_affiliation_text : Solo / Koramangala Snatching
```

#### `entity_association_graph` row

```
edge_uid            : EDGE-2024-02210
source_entity_type  : OFFENDER
source_entity_id    : ACC-2020-00077
target_entity_type  : FIR
target_entity_id    : FIR-KORAM-2024-002210
relationship_type   : ACCUSED
relationship_strength: 0.96
fir_uid_context     : FIR-KORAM-2024-002210
association_evidence_text: Identified by victim from photo array. Tattoo "D" on right forearm matches biometric record BIO-2020-00077. Auto driver corroborates description.
is_active           : TRUE
```

---

## 13. PRODUCTION ZCQL QUERIES

> **Important:** ZCQL uses `table_name.column_name` notation. All JOINs use `=` equality. ZCQL does not support `LIMIT`; use application-layer pagination. String literals use single quotes.

---

### QUERY 1: Geospatial Hotspot Drill-Down Map
*Retrieves all RED and ORANGE risk cells in a district, ordered by composite risk for heatmap rendering*

```sql
SELECT 
  geospatial_hotspot_indicator.cell_uid,
  geospatial_hotspot_indicator.district_name,
  geospatial_hotspot_indicator.police_station_code,
  geospatial_hotspot_indicator.cell_center_latitude,
  geospatial_hotspot_indicator.cell_center_longitude,
  geospatial_hotspot_indicator.composite_risk_score,
  geospatial_hotspot_indicator.risk_tier,
  geospatial_hotspot_indicator.dominant_crime_type,
  geospatial_hotspot_indicator.crime_count_last_30d,
  geospatial_hotspot_indicator.crime_count_last_7d,
  geospatial_hotspot_indicator.night_crime_ratio,
  geospatial_hotspot_indicator.predicted_peak_hour_start,
  geospatial_hotspot_indicator.predicted_peak_hour_end
FROM 
  geospatial_hotspot_indicator
WHERE 
  geospatial_hotspot_indicator.district_name = 'Bengaluru Urban'
  AND (geospatial_hotspot_indicator.risk_tier = 'RED' 
       OR geospatial_hotspot_indicator.risk_tier = 'ORANGE')
ORDER BY 
  geospatial_hotspot_indicator.composite_risk_score DESC
```

---

### QUERY 2: Network Link Graph — Full Co-Accused & Conduit Chain for a Named Offender
*Pulls all direct edges from/to a given offender node, joining entity details for graph node labels*

```sql
SELECT 
  entity_association_graph.edge_uid,
  entity_association_graph.source_entity_type,
  entity_association_graph.source_entity_id,
  entity_association_graph.target_entity_type,
  entity_association_graph.target_entity_id,
  entity_association_graph.relationship_type,
  entity_association_graph.relationship_strength,
  entity_association_graph.fir_uid_context,
  entity_association_graph.association_evidence_text,
  entity_association_graph.first_observed_datetime,
  entity_association_graph.last_observed_datetime,
  offender_profile.full_name,
  offender_profile.alias_names,
  offender_profile.gang_affiliation_text,
  offender_profile.recidivism_risk_score
FROM 
  entity_association_graph, offender_profile
WHERE 
  (entity_association_graph.source_entity_id = 'ACC-2024-00441'
   OR entity_association_graph.target_entity_id = 'ACC-2024-00441')
  AND entity_association_graph.is_active = TRUE
  AND (offender_profile.offender_uid = entity_association_graph.source_entity_id
       OR offender_profile.offender_uid = entity_association_graph.target_entity_id)
ORDER BY 
  entity_association_graph.relationship_strength DESC
```

---

### QUERY 3: Chatbot Deterministic Lookup — "Repeat Offenders on Bail Committing Nocturnal Housebreaking with Specific Instrument"
*The exact query the NLP backend fires when an investigator asks: "Show me all repeat offenders currently on bail who commit housebreaking at night using a crowbar"*

```sql
SELECT 
  offender_profile.offender_uid,
  offender_profile.full_name,
  offender_profile.alias_names,
  offender_profile.mobile_primary,
  offender_profile.gang_affiliation_text,
  offender_profile.recidivism_risk_score,
  offender_profile.rowdy_sheet_number,
  bail_custody_status.current_status,
  bail_custody_status.bail_granted_datetime,
  bail_custody_status.bail_expiry_datetime,
  bail_custody_status.court_name,
  modus_operandi_signature.crime_category,
  modus_operandi_signature.crime_subcategory,
  modus_operandi_signature.instrument_used,
  modus_operandi_signature.time_of_operation,
  modus_operandi_signature.escape_method,
  fir_master.fir_uid,
  fir_master.district_name,
  fir_master.incident_address_text,
  fir_master.fir_registration_datetime
FROM 
  offender_profile, bail_custody_status, modus_operandi_signature, fir_master
WHERE 
  offender_profile.is_repeat_offender = TRUE
  AND bail_custody_status.offender_uid = offender_profile.offender_uid
  AND bail_custody_status.current_status = 'BAIL'
  AND modus_operandi_signature.offender_uid = offender_profile.offender_uid
  AND modus_operandi_signature.crime_category = 'HOUSEBREAKING'
  AND modus_operandi_signature.time_of_operation = 'MIDNIGHT'
  AND modus_operandi_signature.instrument_used = 'crowbar'
  AND fir_master.fir_uid = modus_operandi_signature.fir_uid
ORDER BY 
  offender_profile.recidivism_risk_score DESC
```

---

### QUERY 4: Crime Series Linkage — FIRs Sharing Identical MO Fingerprint
*Identifies all FIRs with matching entry method + instrument + time slot + escape method to surface potential serial offender series*

```sql
SELECT 
  fir_master.fir_uid,
  fir_master.district_name,
  fir_master.police_station_code,
  fir_master.fir_registration_datetime,
  fir_master.incident_latitude,
  fir_master.incident_longitude,
  fir_master.incident_address_text,
  modus_operandi_signature.instrument_used,
  modus_operandi_signature.entry_method,
  modus_operandi_signature.escape_method,
  modus_operandi_signature.time_of_operation,
  modus_operandi_signature.accomplice_count,
  modus_operandi_signature.property_stolen_value_inr,
  offender_profile.offender_uid,
  offender_profile.full_name,
  offender_profile.recidivism_risk_score
FROM 
  fir_master, modus_operandi_signature, offender_profile
WHERE 
  modus_operandi_signature.fir_uid = fir_master.fir_uid
  AND modus_operandi_signature.offender_uid = offender_profile.offender_uid
  AND modus_operandi_signature.instrument_used = 'crowbar'
  AND modus_operandi_signature.entry_method = 'DOOR_FORCED'
  AND modus_operandi_signature.escape_method = 'TWO_WHEELER'
  AND modus_operandi_signature.time_of_operation = 'MIDNIGHT'
ORDER BY 
  fir_master.fir_registration_datetime DESC
```

---

### QUERY 5: BNSS Compliance Alert — Cases Breaching Chargesheet Deadline
*Flags all open cases past their BNSS Section 193 chargesheet filing deadline (60 days for custody / 90 days default), joining IO details for escalation*

```sql
SELECT 
  fir_master.fir_uid,
  fir_master.police_station_code,
  fir_master.district_name,
  fir_master.bns_primary_section,
  fir_master.fir_registration_datetime,
  fir_master.chargesheet_filed_datetime,
  fir_master.bnss_deadline_breached,
  fir_master.io_name,
  fir_master.case_status,
  offender_profile.offender_uid,
  offender_profile.full_name,
  offender_profile.is_repeat_offender,
  offender_profile.recidivism_risk_score,
  bail_custody_status.current_status,
  bail_custody_status.bail_expiry_datetime
FROM 
  fir_master, offender_profile, modus_operandi_signature, bail_custody_status
WHERE 
  fir_master.bnss_deadline_breached = TRUE
  AND fir_master.case_status = 'Open'
  AND modus_operandi_signature.fir_uid = fir_master.fir_uid
  AND offender_profile.offender_uid = modus_operandi_signature.offender_uid
  AND bail_custody_status.fir_uid = fir_master.fir_uid
  AND bail_custody_status.offender_uid = offender_profile.offender_uid
ORDER BY 
  fir_master.fir_registration_datetime ASC
```

---

## 14. CATALYST CONSOLE SETUP CHECKLIST

Use this checklist when manually creating tables in the **Zoho Catalyst Web Console → DataStore → Add Table**.

```
□ Create table: fir_master          (30 columns — see Section 2)
□ Create table: offender_profile    (30 columns — see Section 3)
□ Create table: entity_association_graph (15 columns — see Section 4)
□ Create table: modus_operandi_signature (21 columns — see Section 5)
□ Create table: biometric_record    (18 columns — see Section 6)
□ Create table: geospatial_hotspot_indicator (27 columns — see Section 7)
□ Create table: bsa_audit_trail     (17 columns — see Section 8)
□ Create table: bail_custody_status (17 columns — see Section 9)
□ Create table: forensic_evidence_log (15 columns — see Section 10)
□ Create table: phone_financial_token (16 columns — see Section 11)

COLUMN TYPE MAPPING (Catalyst GUI → this document):
  Text      → Text     (narratives, long descriptions, log fields)
  VarChar   → VarChar  (codes, UIDs, short strings ≤255 chars)
  BigInt    → BigInt   (counts, FK references, integer scores)
  Double    → Double   (lat/lon, risk scores 0.00–1.00, amounts)
  Boolean   → Boolean  (flags, Y/N fields)
  DateTime  → DateTime (all timestamp fields)

□ Seed Storyline A (Cyber Fraud — 2 FIRs, 2 Offenders, 2 Tokens, 3 Edges)
□ Seed Storyline B (HB Ring — 1 FIR, 1 Offender, 1 MO, 1 Bail Status)
□ Seed Storyline C (Mobile Snatching — 1 FIR, 1 Offender, 1 Edge)
□ Run Query 1 → Verify hotspot map returns rows
□ Run Query 3 → Verify Ramu (ACC-2022-00189) appears in bail+crowbar+MIDNIGHT result
□ Run Query 2 → Verify Vikram Shetty (ACC-2024-00441) graph edges appear
```

---

*Document generated for: Cognitive Cops — KSP Police Datathon 2026*
*Schema Version: 1.0 | Framework: BNS 2023 · BNSS 2023 · BSA 2023 · CCTNS IIF*
*Platform: Zoho Catalyst DataStore (ZCQL DML-only)*
