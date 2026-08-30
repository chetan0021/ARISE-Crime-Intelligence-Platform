# ARISE / COGNITIVE COPS — FRESH CATALYST SCHEMA BUILD GUIDE
## Every table, every column, every data type, ready-to-enter seed data

---

> Starting fresh, no migration baggage. This is the complete set of tables to create in
> **Zoho Catalyst Web Console → DataStore → Add Table**, in the order you should create them
> (lookups first, so FKs resolve), with exact column names, Catalyst data types, constraints,
> and one fully-linked demo case (a Whitefield housebreaking FIR) seeded across every table so
> you can copy the values straight in and see joins work immediately.
>
> **Catalyst rules baked into every table below:**
> - `ROWID` (BigInt, PK, Auto) is created automatically by Catalyst — don't add it yourself, it's listed here only so you remember it exists.
> - Every table also gets its own **business ID** column (e.g. `CaseMasterID`, `AccusedMasterID`) as `BigInt, Unique, Not Null` — this is what every FK in every other table actually points to. Assign these yourself sequentially when you insert rows (Catalyst won't auto-increment a custom column).
> - Foreign keys are typed `BigInt` (or `VarChar` where the official diagram uses a code like `ActCode`/`SectionCode`), enforced at the app layer — Catalyst DataStore doesn't enforce FK constraints.
> - `Nvarchar(Max)` / long descriptions → Catalyst `Text`. Short codes/names → `VarChar`. Dates and datetimes → `DateTime`. Flags → `Boolean`. Money/coordinates/scores → `Double`.

---

## BUILD ORDER (create top to bottom — lookups before anything that FKs into them)

```
1.  State                    9.  Court                  17. CrimeHeadActSection
2.  District                 10. CaseCategory            18. Employee
3.  UnitType                 11. GravityOffence          19. CaseMaster
4.  Unit                     12. CaseStatusMaster        20. ComplainantDetails
5.  Rank                     13. CrimeHead                21. Victim
6.  Designation               14. CrimeSubHead             22. Accused
7.  CasteMaster               15. Act                      23. ArrestSurrender
8.  ReligionMaster            16. Section                  24. ActSectionAssociation
                                                            25. ChargesheetDetails
--- Layer 2 (intelligence layer, build after all of the above) ---
26. entity_association_graph  28. geospatial_hotspot_indicator  30. bail_custody_status
27. modus_operandi_signature  29. bsa_audit_trail
```

---

## LAYER 1 — OFFICIAL SOURCE-OF-TRUTH TABLES

### 1. `State`
| Column | Type | Constraints |
|---|---|---|
| StateID | BigInt | Unique, Not Null (business key) |
| StateName | VarChar | Not Null |
| NationalityID | BigInt | Nullable |
| Active | Boolean | Not Null |

**Seed row:**
```
StateID: 1 | StateName: Karnataka | NationalityID: 1 | Active: TRUE
```

---

### 2. `District`
| Column | Type | Constraints |
|---|---|---|
| DistrictID | BigInt | Unique, Not Null |
| DistrictName | VarChar | Not Null |
| StateID | BigInt | FK → State.StateID |
| Active | Boolean | Not Null |

**Seed row:**
```
DistrictID: 44 | DistrictName: Bengaluru Urban | StateID: 1 | Active: TRUE
```

---

### 3. `UnitType`
| Column | Type | Constraints |
|---|---|---|
| UnitTypeID | BigInt | Unique, Not Null |
| UnitTypeName | VarChar | Not Null |
| CityDistState | VarChar | Not Null — City / District / State |
| Hierarchy | BigInt | Not Null (lower = higher authority) |
| Active | Boolean | Not Null |

**Seed row:**
```
UnitTypeID: 1 | UnitTypeName: Police Station | CityDistState: City | Hierarchy: 5 | Active: TRUE
```

---

### 4. `Unit`
| Column | Type | Constraints |
|---|---|---|
| UnitID | BigInt | Unique, Not Null |
| UnitName | VarChar | Not Null |
| TypeID | BigInt | FK → UnitType.UnitTypeID |
| ParentUnit | BigInt | Nullable, self-FK → Unit.UnitID |
| NationalityID | BigInt | Nullable |
| StateID | BigInt | FK → State.StateID |
| DistrictID | BigInt | FK → District.DistrictID |
| Active | Boolean | Not Null |

**Seed row:**
```
UnitID: 6 | UnitName: Whitefield Police Station | TypeID: 1 | ParentUnit: NULL
StateID: 1 | DistrictID: 44 | Active: TRUE
```

---

### 5. `Rank`
| Column | Type | Constraints |
|---|---|---|
| RankID | BigInt | Unique, Not Null |
| RankName | VarChar | Not Null |
| Hierarchy | BigInt | Not Null |
| Active | Boolean | Not Null |

**Seed row:**
```
RankID: 1 | RankName: Inspector | Hierarchy: 4 | Active: TRUE
```

---

### 6. `Designation`
| Column | Type | Constraints |
|---|---|---|
| DesignationID | BigInt | Unique, Not Null |
| DesignationName | VarChar | Not Null |
| SortOrder | BigInt | Not Null |
| Active | Boolean | Not Null |

**Seed row:**
```
DesignationID: 1 | DesignationName: Investigating Officer | SortOrder: 1 | Active: TRUE
```

---

### 7. `CasteMaster`
| Column | Type | Constraints |
|---|---|---|
| caste_master_id | BigInt | Unique, Not Null |
| caste_master_name | VarChar | Not Null |

**Seed row:**
```
caste_master_id: 1 | caste_master_name: General
```
*(Add the actual enumerated list KSP uses — don't invent categories here; this is sensitive reference data.)*

---

### 8. `ReligionMaster`
| Column | Type | Constraints |
|---|---|---|
| ReligionID | BigInt | Unique, Not Null |
| ReligionName | VarChar | Not Null |

**Seed row:**
```
ReligionID: 1 | ReligionName: Hindu
```

---

### 9. `Court`
| Column | Type | Constraints |
|---|---|---|
| CourtID | BigInt | Unique, Not Null |
| CourtName | VarChar | Not Null |
| DistrictID | BigInt | FK → District.DistrictID |
| StateID | BigInt | FK → State.StateID |
| Active | Boolean | Not Null |

**Seed row:**
```
CourtID: 1 | CourtName: ACMM Court, Bengaluru | DistrictID: 44 | StateID: 1 | Active: TRUE
```

---

### 10. `CaseCategory`
| Column | Type | Constraints |
|---|---|---|
| CaseCategoryID | BigInt | Unique, Not Null |
| LookupValue | VarChar | Not Null — FIR / UDR / PAR / Zero FIR |

**Seed row:**
```
CaseCategoryID: 1 | LookupValue: FIR
```

---

### 11. `GravityOffence`
| Column | Type | Constraints |
|---|---|---|
| GravityOffenceID | BigInt | Unique, Not Null |
| LookupValue | VarChar | Not Null — Heinous / Non-Heinous |

**Seed row:**
```
GravityOffenceID: 1 | LookupValue: Heinous
```
*(Confirm exact enum values with KSP — flagged in the migration doc's open questions.)*

---

### 12. `CaseStatusMaster`
| Column | Type | Constraints |
|---|---|---|
| CaseStatusID | BigInt | Unique, Not Null |
| CaseStatusName | VarChar | Not Null |

**Seed rows:**
```
CaseStatusID: 1 | CaseStatusName: Under Investigation
CaseStatusID: 2 | CaseStatusName: Charge Sheeted
CaseStatusID: 3 | CaseStatusName: Closed
```

---

### 13. `CrimeHead`
| Column | Type | Constraints |
|---|---|---|
| CrimeHeadID | BigInt | Unique, Not Null |
| CrimeGroupName | VarChar | Not Null |
| Active | Boolean | Not Null |

**Seed row:**
```
CrimeHeadID: 1 | CrimeGroupName: Crimes Against Property | Active: TRUE
```

---

### 14. `CrimeSubHead`
| Column | Type | Constraints |
|---|---|---|
| CrimeSubHeadID | BigInt | Unique, Not Null |
| CrimeHeadID | BigInt | FK → CrimeHead.CrimeHeadID |
| CrimeHeadName | VarChar | Not Null |
| SeqID | BigInt | Not Null |

**Seed row:**
```
CrimeSubHeadID: 1 | CrimeHeadID: 1 | CrimeHeadName: Housebreaking | SeqID: 1
```

---

### 15. `Act`
| Column | Type | Constraints |
|---|---|---|
| ActCode | VarChar | Unique, Not Null (this IS the primary key per official schema) |
| ActDescription | VarChar | Not Null |
| ShortName | VarChar | Not Null |
| Active | Boolean | Not Null |

**Seed row:**
```
ActCode: BNS | ActDescription: Bharatiya Nyaya Sanhita, 2023 | ShortName: BNS | Active: TRUE
```

---

### 16. `Section`
| Column | Type | Constraints |
|---|---|---|
| ActCode | VarChar | FK → Act.ActCode |
| SectionCode | VarChar | Not Null |
| SectionDescription | VarChar | Not Null |
| Active | Boolean | Not Null |

**Seed row:**
```
ActCode: BNS | SectionCode: 305 | SectionDescription: Lurking house-trespass or house-breaking
Active: TRUE
```

---

### 17. `CrimeHeadActSection`
| Column | Type | Constraints |
|---|---|---|
| CrimeHeadID | BigInt | FK → CrimeHead.CrimeHeadID |
| ActCode | VarChar | FK → Act.ActCode |
| SectionCode | VarChar | FK → Section.SectionCode |

**Seed row:**
```
CrimeHeadID: 1 | ActCode: BNS | SectionCode: 305
```

---

### 18. `Employee`
| Column | Type | Constraints |
|---|---|---|
| EmployeeID | BigInt | Unique, Not Null |
| DistrictID | BigInt | FK → District.DistrictID |
| UnitID | BigInt | FK → Unit.UnitID |
| RankID | BigInt | FK → Rank.RankID |
| DesignationID | BigInt | FK → Designation.DesignationID |
| KGID | VarChar | Not Null, Unique |
| FirstName | VarChar | Not Null |
| EmployeeDOB | DateTime | Nullable |
| GenderID | VarChar | Not Null |
| BloodGroupID | VarChar | Nullable |
| PhysicallyChallenged | Boolean | Not Null |
| AppointmentDate | DateTime | Nullable |

**Seed row:**
```
EmployeeID: 501 | DistrictID: 44 | UnitID: 6 | RankID: 1 | DesignationID: 1
KGID: KGID-88231 | FirstName: Ramesh Kumar | EmployeeDOB: 1985-03-12
GenderID: M | BloodGroupID: O+ | PhysicallyChallenged: FALSE | AppointmentDate: 2009-07-01
```

---

### 19. `CaseMaster` (the anchor table)
| Column | Type | Constraints |
|---|---|---|
| CaseMasterID | BigInt | Unique, Not Null |
| CrimeNo | VarChar | Not Null, Unique — format: 1-digit category + 4-digit district + 4-digit PS + 4-digit year + 5-digit serial |
| CaseNo | VarChar | Not Null — last 9 digits of CrimeNo (YYYY + 5-digit serial) |
| CrimeRegisteredDate | DateTime | Not Null |
| PolicePersonID | BigInt | FK → Employee.EmployeeID |
| PoliceStationID | BigInt | FK → Unit.UnitID |
| CaseCategoryID | BigInt | FK → CaseCategory.CaseCategoryID |
| GravityOffenceID | BigInt | FK → GravityOffence.GravityOffenceID |
| CrimeMajorHeadID | BigInt | FK → CrimeHead.CrimeHeadID |
| CrimeMinorHeadID | BigInt | FK → CrimeSubHead.CrimeSubHeadID |
| CaseStatusID | BigInt | FK → CaseStatusMaster.CaseStatusID |
| CourtID | BigInt | FK → Court.CourtID |
| IncidentFromDate | DateTime | Not Null |
| IncidentToDate | DateTime | Not Null |
| InfoReceivedPSDate | DateTime | Not Null |
| latitude | Double | Not Null |
| longitude | Double | Not Null |
| BriefFacts | Text | Not Null |

**Seed row:**
```
CaseMasterID: 1001
CrimeNo: 104430006202600001
CaseNo: 202600001
CrimeRegisteredDate: 2026-01-14
PolicePersonID: 501
PoliceStationID: 6
CaseCategoryID: 1
GravityOffenceID: 1
CrimeMajorHeadID: 1
CrimeMinorHeadID: 1
CaseStatusID: 1
CourtID: 1
IncidentFromDate: 2026-01-13 23:15:00
IncidentToDate: 2026-01-13 23:45:00
InfoReceivedPSDate: 2026-01-14 00:30:00
latitude: 12.9698
longitude: 77.7499
BriefFacts: Complainant Meera Rao reports that unknown persons forced open the main door
of her residence at Palm Grove Apartments, ITPL Main Road, Whitefield, between 23:15 and
23:45 hrs on 13-01-2026, and stole jewellery and cash. No injuries reported.
```

---

### 20. `ComplainantDetails`
| Column | Type | Constraints |
|---|---|---|
| ComplainantID | BigInt | Unique, Not Null |
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| ComplainantName | VarChar | Not Null |
| AgeYear | BigInt | Nullable |
| OccupationID | BigInt | FK → OccupationMaster.OccupationID |
| ReligionID | BigInt | FK → ReligionMaster.ReligionID |
| CasteID | BigInt | FK → CasteMaster.caste_master_id |
| GenderID | VarChar | Not Null |

**Seed row:**
```
ComplainantID: 1 | CaseMasterID: 1001 | ComplainantName: Meera Rao | AgeYear: 34
OccupationID: 1 | ReligionID: 1 | CasteID: 1 | GenderID: F
```

*(Companion table `OccupationMaster` — same shape as `ReligionMaster`: `OccupationID` BigInt Unique Not Null, `OccupationName` VarChar Not Null. Seed: `OccupationID: 1 | OccupationName: Private Sector Employee`.)*

---

### 21. `Victim`
| Column | Type | Constraints |
|---|---|---|
| VictimMasterID | BigInt | Unique, Not Null |
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| VictimName | VarChar | Not Null |
| AgeYear | BigInt | Nullable |
| GenderID | VarChar | Not Null — M / F / T |
| VictimPolice | Boolean | Not Null |

**Seed row:**
```
VictimMasterID: 1 | CaseMasterID: 1001 | VictimName: Meera Rao | AgeYear: 34
GenderID: F | VictimPolice: FALSE
```

---

### 22. `Accused`
| Column | Type | Constraints |
|---|---|---|
| AccusedMasterID | BigInt | Unique, Not Null |
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| AccusedName | VarChar | Not Null |
| AgeYear | BigInt | Nullable |
| GenderID | VarChar | Not Null — M / F / T |
| PersonID | VarChar | Not Null — display tag e.g. A1, A2 |

**Seed row:**
```
AccusedMasterID: 1 | CaseMasterID: 1001 | AccusedName: Vikram Shetty | AgeYear: 33
GenderID: M | PersonID: A1
```

---

### 23. `ArrestSurrender`
| Column | Type | Constraints |
|---|---|---|
| ArrestSurrenderID | BigInt | Unique, Not Null |
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| ArrestSurrenderTypeID | VarChar | Not Null — ARREST / SURRENDER |
| ArrestSurrenderDate | DateTime | Not Null |
| ArrestSurrenderStateId | BigInt | FK → State.StateID |
| ArrestSurrenderDistrictId | BigInt | FK → District.DistrictID |
| PoliceStationID | BigInt | FK → Unit.UnitID |
| IOID | BigInt | FK → Employee.EmployeeID |
| CourtID | BigInt | FK → Court.CourtID |
| AccusedMasterID | BigInt | FK → Accused.AccusedMasterID |
| IsAccused | Boolean | Not Null |
| IsComplainantAccused | Boolean | Not Null |

**Seed row:**
```
ArrestSurrenderID: 1 | CaseMasterID: 1001 | ArrestSurrenderTypeID: ARREST
ArrestSurrenderDate: 2026-01-20 | ArrestSurrenderStateId: 1 | ArrestSurrenderDistrictId: 44
PoliceStationID: 6 | IOID: 501 | CourtID: 1 | AccusedMasterID: 1
IsAccused: TRUE | IsComplainantAccused: FALSE
```

---

### 24. `ActSectionAssociation`
| Column | Type | Constraints |
|---|---|---|
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| ActID | VarChar | FK → Act.ActCode |
| SectionID | VarChar | FK → Section.SectionCode |
| ActOrderID | BigInt | Not Null |
| SectionOrderID | BigInt | Not Null |

**Seed row:**
```
CaseMasterID: 1001 | ActID: BNS | SectionID: 305 | ActOrderID: 1 | SectionOrderID: 1
```

---

### 25. `ChargesheetDetails`
| Column | Type | Constraints |
|---|---|---|
| CSID | BigInt | Unique, Not Null |
| CaseMasterID | BigInt | FK → CaseMaster.CaseMasterID |
| csdate | DateTime | Not Null |
| cstype | VarChar | Not Null — A = Chargesheet, B = False Case, C = Undetected |
| PolicePersonID | BigInt | FK → Employee.EmployeeID |

**Seed row:**
```
CSID: 1 | CaseMasterID: 1001 | csdate: NULL (still open — leave nullable until filed)
cstype: NULL | PolicePersonID: 501
```
*(Leave this row out entirely until a chargesheet actually exists — don't seed a fake filing date.)*

---

> **Two tables the official ER diagram references in its relationship matrix but never defines
> columns for:** `inv_arrestsurrenderaccused` (junction linking one arrest event to multiple
> accused) and `Inv_OccuranceTime` (one-to-one with CaseMaster for occurrence time/location).
> Take these back to KSP/Catalyst for the actual column list before building them — don't guess
> the schema for tables they haven't fully specified.

---

## LAYER 2 — INTELLIGENCE LAYER (your value-add, re-keyed to real IDs)

### 26. `entity_association_graph`
| Column | Type | Constraints |
|---|---|---|
| edge_uid | VarChar | Unique, Not Null |
| source_entity_type | VarChar | Not Null — ACCUSED / CASE |
| source_entity_id | BigInt | Not Null — real AccusedMasterID or CaseMasterID |
| target_entity_type | VarChar | Not Null |
| target_entity_id | BigInt | Not Null |
| relationship_type | VarChar | Not Null — ACCUSED_IN / CO_ACCUSED / etc. |
| relationship_strength | Double | Not Null |
| first_observed_datetime | DateTime | Not Null |
| last_observed_datetime | DateTime | Not Null |
| case_context_id | BigInt | Nullable, FK → CaseMaster.CaseMasterID |
| is_active | Boolean | Not Null |
| record_created_datetime | DateTime | Not Null |

**Seed row:**
```
edge_uid: EDGE-2026-00001 | source_entity_type: ACCUSED | source_entity_id: 1
target_entity_type: CASE | target_entity_id: 1001 | relationship_type: ACCUSED_IN
relationship_strength: 0.90 | first_observed_datetime: 2026-01-20
last_observed_datetime: 2026-01-20 | case_context_id: 1001 | is_active: TRUE
record_created_datetime: 2026-01-20
```
*(`PHONE`/`BANK` entity types stay out until a real data source exists — see the migration doc §3.)*

---

### 27. `modus_operandi_signature`
| Column | Type | Constraints |
|---|---|---|
| mo_uid | VarChar | Unique, Not Null |
| case_id | BigInt | FK → CaseMaster.CaseMasterID |
| accused_id | BigInt | Nullable, FK → Accused.AccusedMasterID |
| entry_method | VarChar | Nullable — AI-inferred |
| instrument_used | VarChar | Nullable — AI-inferred |
| time_of_operation | VarChar | Nullable — derived from IncidentFromDate/ToDate |
| escape_method | VarChar | Nullable — AI-inferred |
| confidence_score | Double | Not Null — 0.00–1.00, model confidence |
| source_note | VarChar | Not Null — always "Inferred from BriefFacts via NLP" |
| record_created_datetime | DateTime | Not Null |

**Seed row:**
```
mo_uid: MO-2026-00001 | case_id: 1001 | accused_id: 1 | entry_method: DOOR_FORCED
instrument_used: crowbar | time_of_operation: NIGHT | escape_method: UNKNOWN
confidence_score: 0.74 | source_note: Inferred from BriefFacts via NLP
record_created_datetime: 2026-01-14
```

---

### 28. `geospatial_hotspot_indicator`
| Column | Type | Constraints |
|---|---|---|
| cell_uid | VarChar | Unique, Not Null |
| district_id | BigInt | FK → District.DistrictID |
| police_station_id | BigInt | FK → Unit.UnitID |
| cell_center_latitude | Double | Not Null |
| cell_center_longitude | Double | Not Null |
| crime_count_total | BigInt | Not Null |
| crime_count_last_30d | BigInt | Not Null |
| dominant_crime_head_id | BigInt | FK → CrimeHead.CrimeHeadID |
| composite_risk_score | Double | Not Null |
| risk_tier | VarChar | Not Null — RED / ORANGE / YELLOW / GREEN |
| last_refreshed_datetime | DateTime | Not Null |

**Seed row:**
```
cell_uid: CELL-44-0031-0018 | district_id: 44 | police_station_id: 6
cell_center_latitude: 12.9698 | cell_center_longitude: 77.7499
crime_count_total: 1 | crime_count_last_30d: 1 | dominant_crime_head_id: 1
composite_risk_score: 0.55 | risk_tier: YELLOW | last_refreshed_datetime: 2026-01-20
```

---

### 29. `bsa_audit_trail`
| Column | Type | Constraints |
|---|---|---|
| audit_uid | VarChar | Unique, Not Null |
| event_datetime | DateTime | Not Null |
| event_type | VarChar | Not Null — INSERT / SELECT / UPDATE / DELETE |
| target_table_name | VarChar | Not Null |
| target_record_id | BigInt | Not Null |
| actor_employee_id | BigInt | FK → Employee.EmployeeID |
| actor_role | VarChar | Not Null |
| record_created_datetime | DateTime | Not Null |

**Seed row:**
```
audit_uid: AUD-20260114-0000001 | event_datetime: 2026-01-14 00:35:00 | event_type: INSERT
target_table_name: CaseMaster | target_record_id: 1001 | actor_employee_id: 501
actor_role: IO | record_created_datetime: 2026-01-14 00:35:00
```

---

### 30. `bail_custody_status`
| Column | Type | Constraints |
|---|---|---|
| bail_uid | VarChar | Unique, Not Null |
| accused_id | BigInt | FK → Accused.AccusedMasterID |
| case_id | BigInt | FK → CaseMaster.CaseMasterID |
| current_status | VarChar | Not Null — ARRESTED / BAIL / JUDICIAL_CUSTODY / ABSCONDING |
| bail_granted_datetime | DateTime | Nullable — only if you have a real source for this |
| court_id | BigInt | Nullable, FK → Court.CourtID |
| last_status_updated_datetime | DateTime | Not Null |
| updated_by_employee_id | BigInt | FK → Employee.EmployeeID |

**Seed row:**
```
bail_uid: BAIL-2026-00001 | accused_id: 1 | case_id: 1001 | current_status: JUDICIAL_CUSTODY
bail_granted_datetime: NULL | court_id: 1
last_status_updated_datetime: 2026-01-20 | updated_by_employee_id: 501
```

---

## QUICK REFERENCE — WHAT TO PASTE INTO CATALYST FIRST

If you want the fastest path to a working demo: create tables **1–19 in order**, seed just the
rows shown above, and you already have one fully joined case (`CaseMasterID 1001`) touching
State → District → Unit → Employee → CaseCategory → GravityOffence → CrimeHead/SubHead →
CaseStatusMaster → Court → CaseMaster. Add 20–25 next for complainant/victim/accused/arrest/
chargesheet detail, then Layer 2 (26–30) once the base joins are confirmed working in ZCQL.

---

*Prepared for: Cognitive Cops — KSP Police Datathon 2026*
*Companion to: CognitiveCops_Schema_Migration_v2.md*
