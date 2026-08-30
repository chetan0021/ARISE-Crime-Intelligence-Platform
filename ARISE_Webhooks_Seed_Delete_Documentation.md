# ARISE Webhooks & Data Seeding/Deletion Documentation

## Overview
This document covers all the Zoho Catalyst ZCQL tables that are deleted and re-seeded by the ARISE project webhooks, code file locations, and line references.

---

## 1. Code Files & Line References

### Backend Main Implementation File
| Purpose | File | Lines |
|---------|------|-------|
| **Backend Entry Point & All Webhooks** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js) | Full file |
| **Delete-All Webhook** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2120-L2181) | 2120 - 2181 |
| **Clean-And-Seed Webhook (Definition)** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2184-L3013) | 2184 - 3013 |
| **Tables to Clear (Delete-All)** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2138-L2170) | 2138 - 2170 |
| **Tables to Clear (Clean-And-Seed)** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2201-L2234) | 2201 - 2234 |
| **Master Lookup Tables Seed (State/District/UnitType/Unit/Rank/etc.)** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2240-L2352) | 2240 - 2352 |
| **Case & Person Data Seed (CaseMaster, Accused, Complainants, Victims, ActSections, Arrests)** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2354-L2701) | 2354 - 2701 |
| **Modus Operandi Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2705-L2760) | 2705 - 2760 |
| **Chargesheet Details Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2762-L2782) | 2762 - 2782 |
| **Geospatial Hotspot Indicator Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2784-L2862) | 2784 - 2862 |
| **Entity Association Graph Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2864-L2941) | 2864 - 2941 |
| **Bail & Custody Status Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2943-L2979) | 2943 - 2979 |
| **BSA Audit Trail Seed** | [index.js](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics/index.js#L2981-L3004) | 2981 - 3004 |

### Backend Function Directory
All backend code lives at: [get_crime_analytics](file:///c:/Users/Chetan/Documents/arise2/functions/get_crime_analytics)

### Deployable Package
| File | Location |
|------|----------|
| **Backend Deployment Zip** | [backend.zip](file:///c:/Users/Chetan/Documents/arise2/backend.zip) |

---

## 2. Webhook URLs

After deploying `backend.zip` to Zoho Catalyst (Function `get_crime_analytics`), use these endpoints:

| Webhook | HTTP Method | URL Suffix | Example Full URL |
|---------|-------------|------------|------------------|
| **Delete All Data** | `GET` | `/api/webhook/delete-all` | `https://<your-catalyst-domain>/server/get_crime_analytics/api/webhook/delete-all` |
| **Clean and Seed All Data** | `GET` | `/api/webhook/clean-and-seed` | `https://<your-catalyst-domain>/server/get_crime_analytics/api/webhook/clean-and-seed` |

> Best practice: Always run `delete-all` first, then `clean-and-seed` for a fresh database environment.

---

## 3. Full List of Tables (Deleted & Seeded)
Ordered by dependency (children first, then parents to avoid FK violations).

### Total Tables: **32**

### A. Intelligence / Transactional Tables (Seeded with Case-Derived/Generated Data)
These tables are populated with data derived from CaseMaster and real seeded people data:

| # | Table Name | Type | Category | Seeded Count | Mandatory / Key Fields |
|---|------------|------|----------|--------------|------------------------|
| 1 | `entity_association_graph` | Intel | Graph Edges | ~30-80 edges | `edge_uid` (PK), `source_entity_type`, `source_entity_id`, `target_entity_type`, `target_entity_id`, `relationship_type` |
| 2 | `modus_operandi_signature` | Intel | Crime MOs | ~70% of cases (~80-100 rows) | `mo_uid` (PK), `fir_uid`, `case_id`, `offender_uid`, `crime_category`, `entry_method`, `confidence_score` |
| 3 | `geospatial_hotspot_indicator` | Intel | Hotspots | Top 12 districts (12 rows) | `cell_uid` (PK), `district_name`, `district_id`, `police_station_id`, `cell_center_latitude`, `cell_center_longitude`, `composite_risk_score`, `risk_tier` |
| 4 | `bail_custody_status` | Case Txn | Bail/Custody | 1 per Accused (~80-120 rows) | `bail_uid` (PK), `offender_uid`, `accused_id`, `fir_uid`, `case_id`, `current_status`, `arrest_datetime` |
| 5 | `bsa_audit_trail` | Audit | Audit Logs | 1+ seed row | `audit_uid` (PK), `event_datetime`, `event_type`, `target_table_name`, `target_record_uid`, `actor_officer_id`, `actor_employee_id` |
| 6 | `ArrestSurrender` | Case Txn | Arrests/Surrenders | 1 per Accused (~80-120 rows) | `ArrestSurrenderID` (PK/UQ), `CaseMasterID` (FK), `ArrestSurrenderTypeID`, `ArrestSurrenderDate`, `AccusedMasterID` (FK) |
| 7 | `ChargesheetDetails` | Case Txn | Chargesheets | CaseStatusID >= 2 (~40-60 rows) | `CSID` (PK), `CaseMasterID` (FK), `csdate`, `cstype`, `PolicePersonID` (FK) |
| 8 | `ActSectionAssociation` | Case Txn | Act+Sections | 1 per Case (~115-125 rows) | `CaseMasterID` (FK), `ActID` (FK), `SectionID` (FK), `ActOrderID`, `SectionOrderID` |
| 9 | `Victim` | Person | Victims | 1 per Case (~115-125 rows) | `VictimMasterID` (PK/UQ), `CaseMasterID` (FK), `VictimName`, `AgeYear`, `GenderID`, `VictimPolice` |
| 10 | `Accused` | Person | Accused/Offenders | ~70% of cases with unique IDs per case, repeat offenders linked via PersonID (~80-120 rows) | `AccusedMasterID` (PK/UQ - **MUST BE UNIQUE PER ROW**), `CaseMasterID` (FK), `AccusedName`, `AgeYear`, `GenderID`, `PersonID` (same value links same person across cases) |
| 11 | `ComplainantDetails` | Person | Complainants | 1 per Case (~115-125 rows) | `ComplainantID` (PK/UQ), `CaseMasterID` (FK), `ComplainantName`, `AgeYear`, `GenderID`, `OccupationID`, `ReligionID`, `CasteID` |
| 12 | `CaseMaster` | Core | FIRs/Case Records | All 30 districts - varied by profile (~115-125 rows) | `CaseMasterID` (PK/UQ), `CrimeNo` (UQ), `CaseNo`, `CrimeRegisteredDate`, `PolicePersonID`, `PoliceStationID`, `CaseCategoryID`, `GravityOffenceID`, `CrimeMajorHeadID`, `CrimeMinorHeadID`, `CaseStatusID`, `CourtID`, `IncidentFromDate`, `IncidentToDate`, `InfoReceivedPSDate`, `latitude`, `longitude`, `BriefFacts` |

### B. Employee / HR Tables
| # | Table Name | Category | Seeded Count | Mandatory / Key Fields |
|---|------------|----------|--------------|------------------------|
| 13 | `Employee` | People Ops | 1 row | `EmployeeID` (PK/UQ=1001), `DistrictID`, `UnitID`, `RankID`, `DesignationID`, `KGID`, `FirstName`, `GenderID`, `PhysicallyChallenged` |

### C. Crime Classification Lookup Tables
| # | Table Name | Category | Seeded Count | Mandatory / Key Fields |
|---|------------|----------|--------------|------------------------|
| 14 | `CrimeHeadActSection` | Lookup | 7 rows (CrimeHead ↔ Act/Section mapping) | `CrimeHeadID` (FK), `ActCode` (FK), `SectionCode` (FK) |
| 15 | `Section` | Lookup | 7 rows (BNS sections) | `ActCode` (FK="BNS"), `SectionCode` (PK-like), `SectionDescription`, `Active` |
| 16 | `Act` | Lookup | 1 row (BNS) | `ActCode` (PK="BNS"), `ActDescription`, `ShortName`, `Active` |
| 17 | `CrimeSubHead` | Lookup | 3 rows (Sub-categories) | `CrimeSubHeadID` (PK), `CrimeHeadID` (FK), `CrimeHeadName`, `SeqID` |
| 18 | `CrimeHead` | Lookup | 3 rows (Major categories) | `CrimeHeadID` (PK), `CrimeGroupName`, `Active` |
| 19 | `CaseStatusMaster` | Lookup | 3 rows (Under Invest / CS / Closed) | `CaseStatusID` (PK), `CaseStatusName` |
| 20 | `GravityOffence` | Lookup | 2 rows (Heinous / Non-Heinous) | `GravityOffenceID` (PK), `LookupValue` |
| 21 | `CaseCategory` | Lookup | 1 row (FIR) | `CaseCategoryID` (PK), `LookupValue` |
| 22 | `Court` | Lookup | 1 row (ACMM Court) | `CourtID` (PK), `CourtName`, `DistrictID`, `StateID`, `Active` |

### D. Socio-Demographic Lookup Tables
| # | Table Name | Category | Seeded Count | Mandatory / Key Fields |
|---|------------|----------|--------------|------------------------|
| 23 | `OccupationMaster` | Lookup | 1 row | `OccupationID` (PK), `OccupationName` |
| 24 | `ReligionMaster` | Lookup | 1 row | `ReligionID` (PK), `ReligionName` |
| 25 | `CasteMaster` | Lookup | 1 row | `caste_master_id` (PK), `caste_master_name` |

### E. Police Hierarchy / Geo Hierarchy Lookup Tables
| # | Table Name | Category | Seeded Count | Mandatory / Key Fields |
|---|------------|----------|--------------|------------------------|
| 26 | `Designation` | Hierarchy | 1 row | `DesignationID` (PK), `DesignationName`, `SortOrder`, `Active` |
| 27 | `Rank` | Hierarchy | 1 row | `RankID` (PK), `RankName`, `Hierarchy`, `Active` |
| 28 | `Unit` | Hierarchy | 30 rows (1 PS per Karnataka district) | `UnitID` (PK=100..129), `UnitName`, `TypeID`, `StateID`, `DistrictID`, **`NationalityID` (MANDATORY=1)**, `Active` |
| 29 | `UnitType` | Hierarchy | 1 row (Police Station) | `UnitTypeID` (PK), `UnitTypeName`, `CityDistState`, `Hierarchy`, `Active` |
| 30 | `District` | Geo | 30 rows (All Karnataka Districts) | `DistrictID` (PK=1..30), `DistrictName`, `StateID` (FK), `Active` |
| 31 | `State` | Geo | 1 row (Karnataka) | `StateID` (PK=1), `StateName`, `NationalityID` (1=India), `Active` |

---

## 4. Mandatory Column Notes (Critical Past Fixes)
These mandatory fields were missing or incorrectly populated historically — included explicitly now in seed code:

| Table | Column | Required Value | Reason |
|-------|--------|----------------|--------|
| `Unit` | `NationalityID` | `1` | Zoho Catalyst ZCQL marks this column as mandatory; omitting it throws "Column NationalityID is mandatory and cannot be empty". Fixed by adding to all 30 police station inserts. |
| `Accused` | `AccusedMasterID` | **Unique per row, incremented** | This column must be UNIQUE across the Accused table. A repeat offender (same person across multiple FIRs) must get a **NEW `AccusedMasterID` per case row**, while keeping `PersonID` the same (to link them as the same offender). Fixed by incrementing `accusedId` for every accused (repeaters OR new) — PersonID stays same, AccusedMasterID differs per case. |

---

## 5. Seed Data Coverage

### Geography
- **All 30 Karnataka Districts** covered:
  `Bengaluru Urban`, `Bengaluru Rural`, `Chikkaballapura`, `Chitradurga`, `Davanagere`, `Kolar`, `Shivamogga`, `Tumakuru`, `Bagalkot`, `Belagavi`, `Vijayapura`, `Dharwad`, `Gadag`, `Haveri`, `Uttara Kannada`, `Ballari`, `Bidar`, `Kalaburagi`, `Koppal`, `Raichur`, `Yadgir`, `Chikkamagaluru`, `Dakshina Kannada`, `Hassan`, `Kodagu`, `Mandya`, `Mysuru`, `Udupi`, `Ramanagara`, `Chamarajanagar`

### Crime Distribution
Each district has a realistic case profile. Example seed profiles:

| District | Total Cases | Active Cases | Dominant Sections |
|----------|-------------|--------------|-------------------|
| Bengaluru Urban | 8 | 5 | 318(4) Cyber, 309(4) Robbery, 303 Theft, 331(3) HB |
| Mysuru | 6 | 4 | 318(4), 303, 309(4), 115 Assault |
| Dakshina Kannada | 6 | 4 | 318(4), 309(4), 303, 331(3) |
| Belagavi | 5 | 3 | 309(4), 303, 331(3) |
| Remaining 26 districts | 3-5 each | 1-3 each | Mixed 303/305/115/318(4)/331(3) |

### Crime Templates (BNS Sections Used)
| BNS Section | Category |
|-------------|----------|
| 331(3) | Housebreaking (Night) |
| 303 | Theft |
| 318(4) | Cyber Fraud |
| 115 | Assault |
| 309(4) | Robbery / Snatching |
| 305 | House-trespass |
| 302 | Snatching |

### People Data Coverage
- ~115-125 FIRs (CaseMaster)
- ~115-125 Complainants (ComplainantDetails)
- ~115-125 Victims (Victim)
- ~80-120 Accused (Accused) — includes 8-10 **repeat offenders** (same PersonID across multiple cases, unique AccusedMasterID per case per offender)
- ~80-120 ArrestSurrender records
- 1 Employee (KGID-88231 — Ramesh Kumar, Inspector / IO, Unit 100 Bengaluru Urban)

### Derived Intel Data Coverage
- **Modus Operandi**: 70% of all cases get a MO record (with instrument, entry/escape method, time, target, narrative, etc.)
- **Hotspots**: Top 12 districts (by active+total cases) get hotspot cells (risk tier RED/ORANGE/YELLOW/GREEN, predicted peak hours, dominant crime type)
- **Entity Graph Edges**: Co-offender edges (accused in same case), plus repeat-offender associate/known-contact edges across cases
- **Bail/Custody**: Each accused gets a status (BAIL / JUDICIAL_CUSTODY / ABSCONDING) with court + surety data
- **Chargesheets**: FIRs with CaseStatus >=2 (ChargeSheeted or Closed) get ChargesheetDetails rows
- **BSA Audit**: Seed audit log row for a "SELECT on CaseMaster" event

---

## 6. Clean & Seed Batch Insertion Strategy
To avoid Catalyst row limits, bulk inserts happen in slices of 20 rows (`i += 20` loop) for these tables:
1. CaseMaster
2. ComplainantDetails
3. Victim
4. ActSectionAssociation
5. Accused
6. ArrestSurrender
7. modus_operandi_signature
8. entity_association_graph
9. bail_custody_status

Single-batch inserts are used for smaller tables (District, Unit, State, Section, Act, hotspot cells, chargesheets, etc.).
