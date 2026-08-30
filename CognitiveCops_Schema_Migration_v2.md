# COGNITIVE COPS — SCHEMA MIGRATION v2
## Reconciling the v1 Hackathon Schema with the Official KSP FIR Database

---

> **Why this document exists:** v1 (`CognitiveCops_DB_Blueprint.md`) was designed *before* KSP/Catalyst
> released real data. It's a denormalized, ML-flavored superset — free-text religion/caste/occupation,
> invented SHA-256 hashes, invented recidivism scores, a generic graph-edge table. The **official schema**
> (`Police_FIR_ER_Diagram.pdf`, 23 tables) is a normalized production FIR system with real IDs and lookup
> tables — but it has **no concept of graphs, ML scores, biometrics, or financial tokens.**
>
> This is not a rename job. Some v1 tables map cleanly onto the official schema. Some map partially.
> Some have **zero backing data** in what KSP gave you. This doc sorts each case and gives you the
> concrete field-level mapping to act on.

---

## 1. THE HEADLINE DECISION: TWO-LAYER ARCHITECTURE

Adopt a **source-of-truth layer + intelligence layer** split instead of trying to force everything into
one flat table set:

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — OFFICIAL DATA LAYER (source of truth)              │
│  Recreate the 23 KSP tables in Catalyst exactly as specified: │
│  CaseMaster, Accused, Victim, ComplainantDetails,              │
│  ArrestSurrender, ActSectionAssociation, Act, Section,         │
│  CrimeHead, CrimeSubHead, CrimeHeadActSection, CaseCategory,   │
│  GravityOffence, CaseStatusMaster, Court, District, State,     │
│  Unit, UnitType, Rank, Designation, Employee, CasteMaster,     │
│  ReligionMaster, OccupationMaster, ChargesheetDetails          │
│  → Populated FROM the real feed KSP gives you. Don't invent    │
│    values here. This is ground truth.                          │
└───────────────────────────┬──────────────────────────────────┘
                            │ referenced by (via real IDs, not
                            │ invented UIDs)
┌───────────────────────────▼──────────────────────────────────┐
│  LAYER 2 — INTELLIGENCE / ML ENRICHMENT LAYER (your value-add)│
│  Trimmed versions of: entity_association_graph,                │
│  modus_operandi_signature, geospatial_hotspot_indicator,       │
│  bsa_audit_trail                                                │
│  → FK columns now point at CaseMasterID / AccusedMasterID      │
│    (BigInt) instead of invented fir_uid / offender_uid strings │
│  → Fields with no real data source are either dropped or       │
│    explicitly derived/inferred (see §4)                        │
└──────────────────────────────────────────────────────────────┘
```

Two tables from v1 (`biometric_record`, `phone_financial_token`) and most of
`forensic_evidence_log` have **no corresponding data anywhere in the official schema** — KSP hasn't
given you fingerprints, face encodings, phone numbers, bank accounts, or seizure records. Keep them
in the blueprint as **future/placeholder tables**, but don't seed or demo them as if they're real —
see §5.

---

## 2. TABLE-BY-TABLE MAPPING

### 2.1 `fir_master` → `CaseMaster` (+ 5 joined lookup tables)

This is the biggest structural change: what was one flat table with inline text is now one anchor
table (`CaseMaster`) plus normalized lookups.

| v1 `fir_master` field | Official equivalent | Migration note |
|---|---|---|
| `fir_uid` | `CaseMaster.CrimeNo` | Format is now fixed: 1-digit category + 4-digit district + 4-digit PS + 4-digit year + 5-digit serial. **Stop generating your own `FIR-WHFLD-2024-000441` style UIDs** — use `CrimeNo` as-is. |
| — | `CaseMaster.CaseNo` | New field you didn't have — last 9 digits of `CrimeNo`. Keep both; `CaseNo` is the per-station-per-year serial. |
| `police_station_code` | `CaseMaster.PoliceStationID` → `Unit.UnitName` | Now an FK to `Unit`, not a text code. Join required for display. |
| `district_name` | `CaseMaster.PoliceStationID` → `Unit.DistrictID` → `District.DistrictName` | Two hops now. Consider materializing `district_name` into your Layer-2 hotspot table via ETL rather than joining at query time (Catalyst ZCQL has no multi-hop JOIN optimization). |
| `subdivision_name` | **No equivalent.** | Official schema has District → Unit, no sub-division tier. Drop, or derive from `Unit.ParentUnit` hierarchy if you need it. |
| `fir_registration_datetime` | `CaseMaster.CrimeRegisteredDate` | Note: official field is `DATE`, not `DATETIME` — you lose time-of-day precision unless KSP's actual feed includes time. Check with them before relying on `time_of_day_slot` logic. |
| `incident_reported_datetime` | `CaseMaster.InfoReceivedPSDate` | Direct match. |
| `reporting_delay_hours` | *(derived)* | Compute as `InfoReceivedPSDate − IncidentToDate` in your ETL/app layer. Not a stored column in the official schema — don't expect it to arrive pre-computed. |
| `bns_primary_section` / `bns_additional_sections` | `ActSectionAssociation` (junction table) → `Act` + `Section` | This is now **one-to-many**, not a pipe-delimited string. A case can have multiple Act+Section rows via `ActSectionAssociation.CaseMasterID`, ordered by `ActOrderID`/`SectionOrderID`. Your NLP "multi-charge parsing" logic becomes unnecessary — the data is already structured. |
| `legacy_ipc_section` | **No equivalent.** | Not present. If you still want an IPC cross-reference, that mapping table is your own addition, not sourced from KSP. |
| `offence_description_text` | `CaseMaster.BriefFacts` | Direct match (`Nvarchar(Max)` vs your `Text`, functionally the same). |
| `complainant_name` / `complainant_mobile` | `ComplainantDetails.ComplainantName` (+ no mobile field) | **Moved to a separate table**, and note: `ComplainantDetails` has no mobile/phone column at all. If phone-linkage graph edges depend on complainant mobile, that data isn't in what KSP gave you. |
| `incident_latitude` / `incident_longitude` | `CaseMaster.latitude` / `CaseMaster.longitude` | Direct match — good, your hotspot/geospatial layer keeps working. |
| `incident_address_text` | **No equivalent field name**, but `CaseMaster` has no separate address text field beyond lat/long. | If KSP's actual data feed includes an address string, confirm the column name with them — it's not in the ER diagram as given. |
| `property_type` | **No equivalent.** | Not modeled. Drop or keep as your own enrichment (inferred from `BriefFacts` via NLP, and clearly labeled as inferred). |
| `weapon_used` | **No equivalent.** | Same — not in official schema. Move to Layer 2 as an NLP-derived field, not a source field. |
| `time_of_day_slot` | *(derived from `IncidentFromDate`/`IncidentToDate`)* | Compute in ETL, don't expect it pre-populated. |
| `efir_log_id` | **No equivalent.** | Drop, or ask KSP if e-FIR reference numbers exist elsewhere in their system. |
| `mandatory_forensic_triggered` | **No equivalent.** | This was your own BNSS Sec.176 auto-flag logic. Keep it, but compute it yourself from `GravityOffenceID` + `CrimeHeadID` — it's a derived business rule, not source data. |
| `investigation_officer_id` / `io_name` | `CaseMaster.PolicePersonID` → `Employee.FirstName` | FK to `Employee`, not a free-text name. |
| `case_status` | `CaseMaster.CaseStatusID` → `CaseStatusMaster.CaseStatusName` | Now a lookup FK, not free text. Your ML "case outcome predictor" should train against `CaseStatusID` values, which are a fixed enumerated set in `CaseStatusMaster` — pull the actual value list from KSP rather than assuming `Open/Chargesheeted/Closed-True/Closed-False/Referred`. |
| `chargesheet_filed_datetime` | `ChargesheetDetails.csdate` (joined via `CaseMasterID`) | Now a separate table, one-to-many (a case can have multiple `ChargesheetDetails` rows — `cstype` distinguishes Chargesheet/False Case/Undetected). |
| `bnss_deadline_breached` | *(derived)* | Compute yourself: `CrimeRegisteredDate` + statutory window vs `ChargesheetDetails.csdate` / today. Not a stored flag. |
| `data_entry_operator_id`, `record_created_datetime`, `record_sha256_hash` | **No equivalent — these were your own Catalyst-layer audit fields.** | Keep them, but move them to your Layer-2 `bsa_audit_trail`, not duplicated onto every source row. |

**New fields the official schema has that v1 never modeled:** `GravityOffenceID`, `CrimeMajorHeadID`,
`CrimeMinorHeadID`, `CourtID` — all FKs to lookup tables (`GravityOffence`, `CrimeHead`, `CrimeSubHead`,
`Court`). These give you *better* crime taxonomy than your old flat `crime_category` string — use them.

---

### 2.2 `offender_profile` → `Accused`

The official `Accused` table is much thinner than your v1 table:

| v1 field | Official equivalent | Migration note |
|---|---|---|
| `offender_uid` | `Accused.AccusedMasterID` (PK) + `Accused.PersonID` | `PersonID` is the human-readable sort tag (`A1`, `A2`...) — not a global UID. Use `AccusedMasterID` as your real join key. |
| `full_name` | `Accused.AccusedName` | Direct match. |
| `alias_names`, `fathers_name`, `aadhaar_hash`, `mobile_primary/secondary`, `permanent/current_address_text`, `current_lat/long`, `nationality`, `state_of_origin`, `education_level`, `occupation` | **No equivalents.** | None of this identity/contact detail is in the official `Accused` table. This is a major gap — flag it to KSP/Catalyst organizers directly; don't silently backfill with synthetic values in a "production-grade" claim. |
| `date_of_birth` / `age_at_first_arrest` | `Accused.AgeYear` only | Official schema stores age-in-years at time of case, not DOB. You lose exact-age and DOB-based dedup logic. |
| `gender` | `Accused.GenderID` | Now `M/F/T` lookup value, matches your intent. |
| `total_prior_arrests`, `total_convictions`, `is_repeat_offender`, `is_rowdy_sheeter`, `rowdy_sheet_number`, `gang_affiliation_text`, `recidivism_risk_score`, `photo_url` | **No equivalents — all ML/derived.** | These stay in your Layer-2 as computed values, keyed on `AccusedMasterID`. They're legitimately your value-add (that's the point of the datathon's ML challenge), just don't present them as sourced from KSP data — they're inferred/modeled. |
| — | `Accused.VictimPolice`-style flag exists on **Victim**, not Accused | Note there's a parallel `Victim` table (see 2.3) with its own `AgeYear`/`GenderID` — don't conflate accused and victim demographics. |

---

### 2.3 New tables in the official schema with no v1 counterpart — add these

Your v1 blueprint collapsed people-details into `offender_profile` and `fir_master`. The official
schema splits them out. Add straight to Layer 1:

- **`Victim`** — separate from complainant; a case can have both. `VictimPolice` flags when the victim is themselves a police officer.
- **`ComplainantDetails`** — one-to-many per case; includes `OccupationID`, `ReligionID`, `CasteID` as FKs (not free text — this is more sensitive data than your v1 modeled, handle accordingly).
- **`ArrestSurrender`** — this substantially covers what your v1 `bail_custody_status` was reaching for (arrest date, IO, court, state/district of arrest), but *doesn't* include `bail_type`, `bail_conditions_text`, `bail_expiry_datetime`, or `surety_amount_inr` — those remain gaps, same as above.
- **Lookup tables**: `CasteMaster`, `ReligionMaster`, `OccupationMaster`, `CaseStatusMaster`, `Court`, `District`, `State`, `Unit`, `UnitType`, `Rank`, `Designation`, `Employee`, `CaseCategory`, `GravityOffence`, `CrimeHead`, `CrimeSubHead`, `CrimeHeadActSection`, `Act`, `Section` — all straightforward reference data, create as-is in the Catalyst console.

---

### 2.4 Tables to keep, trimmed, in Layer 2

| v1 table | Verdict | Change required |
|---|---|---|
| `entity_association_graph` | **Keep.** | Change `source_entity_id`/`target_entity_id` to store real `AccusedMasterID`/`CaseMasterID` (BigInt) instead of invented string UIDs. Drop `PHONE`/`BANK` as valid `entity_type` values until `phone_financial_token` has a real source (see below) — right now those edges would be entirely synthetic. |
| `modus_operandi_signature` | **Keep, but relabel as inferred.** | Fields like `instrument_used`, `entry_method`, `escape_method`, `disguise_used` have no source column anywhere in the official schema. If you keep populating them, it must be via NLP extraction from `CaseMaster.BriefFacts`, and the record should carry a confidence score / "AI-inferred" flag so investigators don't mistake a model's guess for a police-verified fact. |
| `geospatial_hotspot_indicator` | **Keep, mostly unchanged.** | Source `cell_center_latitude/longitude` and the crime counts now aggregate from `CaseMaster.latitude/longitude` directly — this table still works well as a Layer-2 rollup. |
| `bsa_audit_trail` | **Keep, unchanged.** | This was always an app-layer audit concern independent of the source schema — no change needed. |
| `bail_custody_status` | **Narrow to match `ArrestSurrender`.** | Keep `bail_type`, `bail_conditions_text`, `bail_expiry_datetime`, `surety_amount_inr` only if you have an actual source for them (e.g., a separate court-integration feed). Otherwise mark them nullable-and-usually-null rather than implying they're populated. |

---

## 3. TABLES WITH NO BACKING DATA — HANDLE WITH CARE

`biometric_record` and `phone_financial_token` (and most of `forensic_evidence_log`) reference data
categories — fingerprints, face/voice hashes, DNA references, phone numbers, UPI IDs, bank accounts,
seizure chain-of-custody — that **do not exist anywhere in the schema KSP provided.**

For the datathon demo, three honest options:
1. **Keep the tables empty** and describe them in your pitch as "designed for future integration once biometric/financial data feeds are available" — this is defensible and shows forward architecture thinking.
2. **Seed them with clearly-fictional demo rows** (as v1 already does) but say so explicitly in the demo — don't let judges assume this is real KSP data.
3. **Cut them from the live demo** entirely and focus judge attention on what *is* real: the CaseMaster/Accused/ArrestSurrender-driven features plus your geospatial and MO-inference layers.

Given this is a judged datathon, option 1 or 3 is safer than presenting synthetic biometric/financial
data as if it came from the official feed.

---

## 4. FIELDS THAT MUST BE RECLASSIFIED AS "DERIVED," NOT "SOURCED"

These were flat stored fields in v1. In the new architecture they should be computed at ETL or query
time from official-schema columns, not treated as raw input:

- `reporting_delay_hours` — compute from `InfoReceivedPSDate` − `IncidentToDate`
- `time_of_day_slot` — bucket from `IncidentFromDate`/`IncidentToDate`
- `bnss_deadline_breached` — compute from `CrimeRegisteredDate` + statutory window vs. `ChargesheetDetails.csdate`
- `mandatory_forensic_triggered` — business rule off `GravityOffenceID`/`CrimeHeadID`
- `district_name`, `police_station_code` (as display text) — resolved via join, not stored redundantly, unless materialized in your Layer-2 tables for query performance

---

## 5. REVISED CATALYST CONSOLE CHECKLIST

```
LAYER 1 — Official schema (create exactly per Police_FIR_ER_Diagram.pdf):
□ CaseMaster              □ ComplainantDetails       □ Victim
□ Accused                 □ ArrestSurrender          □ ActSectionAssociation
□ Act                     □ Section                  □ CrimeHeadActSection
□ CrimeHead               □ CrimeSubHead              □ CaseCategory
□ GravityOffence          □ CaseStatusMaster          □ Court
□ District                □ State                     □ Unit
□ UnitType                □ Rank                      □ Designation
□ Employee                □ CasteMaster               □ ReligionMaster
□ OccupationMaster        □ ChargesheetDetails

LAYER 2 — Intelligence layer (trimmed from v1, FKs updated to BigInt official IDs):
□ entity_association_graph   (source/target IDs now reference AccusedMasterID / CaseMasterID)
□ modus_operandi_signature   (mark as AI-inferred; add confidence_score column)
□ geospatial_hotspot_indicator (unchanged, sources from CaseMaster.latitude/longitude)
□ bsa_audit_trail            (unchanged)
□ bail_custody_status        (narrowed — only populate fields you have a real source for)

FUTURE / PLACEHOLDER — do not present as sourced from official data:
□ biometric_record
□ phone_financial_token
□ forensic_evidence_log
```

---

## 6. OPEN QUESTIONS TO TAKE BACK TO KSP/CATALYST ORGANIZERS

Worth clarifying before you finalize the migration, since several v1 features have no home in the
official schema as given:

1. Does `CrimeRegisteredDate` carry time-of-day, or only date? (Affects `time_of_day_slot` and MO temporal features.)
2. Is there an address-text field for incidents beyond lat/long?
3. Is there any phone/financial/biometric data source at all, even in a separate system, that could feed `phone_financial_token`/`biometric_record`?
4. What's the actual enumerated value list for `CaseStatusMaster.CaseStatusName` and `GravityOffence.LookupValue`? (Your ML labels need to match KSP's real categories, not your invented ones.)

---

*Prepared for: Cognitive Cops — KSP Police Datathon 2026*
*Migration target: Official KSP FIR ER Schema (Police_FIR_ER_Diagram.pdf)*
*Source: CognitiveCops_DB_Blueprint.md v1.0*
