# ARISE / COGNITIVE COPS — STEP-BY-STEP ZCQL TABLE CREATION GUIDE
## Exactly matches the Catalyst Console: New Table → New Column

---

**How to read every table below:**
1. Go to **Data Store → Tables → + New Table** → type the table name shown in the heading → Create.
2. Open the table → **Schema View → + New Column** → for each row in that table's list, fill in:
   - **Column Name** (type exactly as shown)
   - **Data Type** (pick from the dropdown — value shown matches Catalyst's own naming)
   - **Mandatory** — Yes/No as shown
   - **Is Unique** — Yes/No as shown
   - **Default Value** — leave blank unless a value is shown
3. Skip `ROWID`, `CREATORID`, `CREATEDTIME`, `MODIFIEDTIME` — Catalyst adds these to every table automatically, you'll see them already there.
4. A `Notes` line under some tables tells you which other table a column is meant to reference — Catalyst doesn't enforce this for you, it's just so you remember when writing ZCQL joins later.

**Build order:** create tables top to bottom — later tables reference IDs from earlier ones.

---
---

# LAYER 1 — OFFICIAL KSP TABLES

## Table: `State`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| StateID | bigint | Yes | Yes | — |
| StateName | varchar | Yes | No | — |
| NationalityID | bigint | No | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `District`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| DistrictID | bigint | Yes | Yes | — |
| DistrictName | varchar | Yes | No | — |
| StateID | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

*Notes: StateID → references State.StateID*

---

## Table: `UnitType`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| UnitTypeID | bigint | Yes | Yes | — |
| UnitTypeName | varchar | Yes | No | — |
| CityDistState | varchar | Yes | No | — |
| Hierarchy | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `Unit`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| UnitID | bigint | Yes | Yes | — |
| UnitName | varchar | Yes | No | — |
| TypeID | bigint | Yes | No | — |
| ParentUnit | bigint | No | No | — |
| NationalityID | bigint | No | No | — |
| StateID | bigint | Yes | No | — |
| DistrictID | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

*Notes: TypeID → UnitType.UnitTypeID · StateID → State.StateID · DistrictID → District.DistrictID · ParentUnit → Unit.UnitID (self-reference)*

---

## Table: `Rank`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| RankID | bigint | Yes | Yes | — |
| RankName | varchar | Yes | No | — |
| Hierarchy | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `Designation`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| DesignationID | bigint | Yes | Yes | — |
| DesignationName | varchar | Yes | No | — |
| SortOrder | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `CasteMaster`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| caste_master_id | bigint | Yes | Yes | — |
| caste_master_name | varchar | Yes | No | — |

---

## Table: `ReligionMaster`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| ReligionID | bigint | Yes | Yes | — |
| ReligionName | varchar | Yes | No | — |

---

## Table: `OccupationMaster`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| OccupationID | bigint | Yes | Yes | — |
| OccupationName | varchar | Yes | No | — |

---

## Table: `Court`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CourtID | bigint | Yes | Yes | — |
| CourtName | varchar | Yes | No | — |
| DistrictID | bigint | Yes | No | — |
| StateID | bigint | Yes | No | — |
| Active | boolean | Yes | No | true |

*Notes: DistrictID → District.DistrictID · StateID → State.StateID*

---

## Table: `CaseCategory`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CaseCategoryID | bigint | Yes | Yes | — |
| LookupValue | varchar | Yes | No | — |

---

## Table: `GravityOffence`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| GravityOffenceID | bigint | Yes | Yes | — |
| LookupValue | varchar | Yes | No | — |

---

## Table: `CaseStatusMaster`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CaseStatusID | bigint | Yes | Yes | — |
| CaseStatusName | varchar | Yes | No | — |

---

## Table: `CrimeHead`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CrimeHeadID | bigint | Yes | Yes | — |
| CrimeGroupName | varchar | Yes | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `CrimeSubHead`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CrimeSubHeadID | bigint | Yes | Yes | — |
| CrimeHeadID | bigint | Yes | No | — |
| CrimeHeadName | varchar | Yes | No | — |
| SeqID | bigint | Yes | No | — |

*Notes: CrimeHeadID → CrimeHead.CrimeHeadID*

---

## Table: `Act`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| ActCode | varchar | Yes | Yes | — |
| ActDescription | varchar | Yes | No | — |
| ShortName | varchar | Yes | No | — |
| Active | boolean | Yes | No | true |

---

## Table: `Section`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| ActCode | varchar | Yes | No | — |
| SectionCode | varchar | Yes | No | — |
| SectionDescription | varchar | Yes | No | — |
| Active | boolean | Yes | No | true |

*Notes: ActCode → Act.ActCode*

---

## Table: `CrimeHeadActSection`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CrimeHeadID | bigint | Yes | No | — |
| ActCode | varchar | Yes | No | — |
| SectionCode | varchar | Yes | No | — |

*Notes: CrimeHeadID → CrimeHead.CrimeHeadID · ActCode → Act.ActCode · SectionCode → Section.SectionCode*

---

## Table: `Employee`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| EmployeeID | bigint | Yes | Yes | — |
| DistrictID | bigint | Yes | No | — |
| UnitID | bigint | Yes | No | — |
| RankID | bigint | Yes | No | — |
| DesignationID | bigint | Yes | No | — |
| KGID | varchar | Yes | Yes | — |
| FirstName | varchar | Yes | No | — |
| EmployeeDOB | datetime | No | No | — |
| GenderID | varchar | Yes | No | — |
| BloodGroupID | varchar | No | No | — |
| PhysicallyChallenged | boolean | Yes | No | false |
| AppointmentDate | datetime | No | No | — |

*Notes: DistrictID → District.DistrictID · UnitID → Unit.UnitID · RankID → Rank.RankID · DesignationID → Designation.DesignationID*

---

## Table: `CaseMaster`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CaseMasterID | bigint | Yes | Yes | — |
| CrimeNo | varchar | Yes | Yes | — |
| CaseNo | varchar | Yes | No | — |
| CrimeRegisteredDate | datetime | Yes | No | — |
| PolicePersonID | bigint | Yes | No | — |
| PoliceStationID | bigint | Yes | No | — |
| CaseCategoryID | bigint | Yes | No | — |
| GravityOffenceID | bigint | Yes | No | — |
| CrimeMajorHeadID | bigint | Yes | No | — |
| CrimeMinorHeadID | bigint | Yes | No | — |
| CaseStatusID | bigint | Yes | No | — |
| CourtID | bigint | No | No | — |
| IncidentFromDate | datetime | Yes | No | — |
| IncidentToDate | datetime | Yes | No | — |
| InfoReceivedPSDate | datetime | Yes | No | — |
| latitude | double | Yes | No | — |
| longitude | double | Yes | No | — |
| BriefFacts | text | Yes | No | — |

*Notes: PolicePersonID → Employee.EmployeeID · PoliceStationID → Unit.UnitID · CaseCategoryID → CaseCategory.CaseCategoryID · GravityOffenceID → GravityOffence.GravityOffenceID · CrimeMajorHeadID → CrimeHead.CrimeHeadID · CrimeMinorHeadID → CrimeSubHead.CrimeSubHeadID · CaseStatusID → CaseStatusMaster.CaseStatusID · CourtID → Court.CourtID*

---

## Table: `ComplainantDetails`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| ComplainantID | bigint | Yes | Yes | — |
| CaseMasterID | bigint | Yes | No | — |
| ComplainantName | varchar | Yes | No | — |
| AgeYear | bigint | No | No | — |
| OccupationID | bigint | No | No | — |
| ReligionID | bigint | No | No | — |
| CasteID | bigint | No | No | — |
| GenderID | varchar | Yes | No | — |

*Notes: CaseMasterID → CaseMaster.CaseMasterID · OccupationID → OccupationMaster.OccupationID · ReligionID → ReligionMaster.ReligionID · CasteID → CasteMaster.caste_master_id*

---

## Table: `Victim`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| VictimMasterID | bigint | Yes | Yes | — |
| CaseMasterID | bigint | Yes | No | — |
| VictimName | varchar | Yes | No | — |
| AgeYear | bigint | No | No | — |
| GenderID | varchar | Yes | No | — |
| VictimPolice | boolean | Yes | No | false |

*Notes: CaseMasterID → CaseMaster.CaseMasterID*

---

## Table: `Accused`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| AccusedMasterID | bigint | Yes | Yes | — |
| CaseMasterID | bigint | Yes | No | — |
| AccusedName | varchar | Yes | No | — |
| AgeYear | bigint | No | No | — |
| GenderID | varchar | Yes | No | — |
| PersonID | varchar | Yes | No | — |

*Notes: CaseMasterID → CaseMaster.CaseMasterID*

---

## Table: `ArrestSurrender`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| ArrestSurrenderID | bigint | Yes | Yes | — |
| CaseMasterID | bigint | Yes | No | — |
| ArrestSurrenderTypeID | varchar | Yes | No | — |
| ArrestSurrenderDate | datetime | Yes | No | — |
| ArrestSurrenderStateId | bigint | Yes | No | — |
| ArrestSurrenderDistrictId | bigint | Yes | No | — |
| PoliceStationID | bigint | Yes | No | — |
| IOID | bigint | Yes | No | — |
| CourtID | bigint | No | No | — |
| AccusedMasterID | bigint | Yes | No | — |
| IsAccused | boolean | Yes | No | false |
| IsComplainantAccused | boolean | Yes | No | false |

*Notes: CaseMasterID → CaseMaster.CaseMasterID · ArrestSurrenderStateId → State.StateID · ArrestSurrenderDistrictId → District.DistrictID · PoliceStationID → Unit.UnitID · IOID → Employee.EmployeeID · CourtID → Court.CourtID · AccusedMasterID → Accused.AccusedMasterID*

---

## Table: `ActSectionAssociation`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CaseMasterID | bigint | Yes | No | — |
| ActID | varchar | Yes | No | — |
| SectionID | varchar | Yes | No | — |
| ActOrderID | bigint | Yes | No | — |
| SectionOrderID | bigint | Yes | No | — |

*Notes: CaseMasterID → CaseMaster.CaseMasterID · ActID → Act.ActCode · SectionID → Section.SectionCode*

---

## Table: `ChargesheetDetails`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| CSID | bigint | Yes | Yes | — |
| CaseMasterID | bigint | Yes | No | — |
| csdate | datetime | No | No | — |
| cstype | varchar | No | No | — |
| PolicePersonID | bigint | Yes | No | — |

*Notes: CaseMasterID → CaseMaster.CaseMasterID · PolicePersonID → Employee.EmployeeID · Leave csdate/cstype blank until a chargesheet is actually filed*

---
---

# LAYER 2 — YOUR INTELLIGENCE / ML TABLES

## Table: `entity_association_graph`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| edge_uid | varchar | Yes | Yes | — |
| source_entity_type | varchar | Yes | No | — |
| source_entity_id | bigint | Yes | No | — |
| target_entity_type | varchar | Yes | No | — |
| target_entity_id | bigint | Yes | No | — |
| relationship_type | varchar | Yes | No | — |
| relationship_strength | double | Yes | No | — |
| first_observed_datetime | datetime | Yes | No | — |
| last_observed_datetime | datetime | Yes | No | — |
| case_context_id | bigint | No | No | — |
| is_active | boolean | Yes | No | true |

*Notes: source/target_entity_id hold a real AccusedMasterID or CaseMasterID depending on entity_type · case_context_id → CaseMaster.CaseMasterID*

---

## Table: `modus_operandi_signature`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| mo_uid | varchar | Yes | Yes | — |
| case_id | bigint | Yes | No | — |
| accused_id | bigint | No | No | — |
| entry_method | varchar | No | No | — |
| instrument_used | varchar | No | No | — |
| time_of_operation | varchar | No | No | — |
| escape_method | varchar | No | No | — |
| confidence_score | double | Yes | No | — |
| source_note | varchar | Yes | No | Inferred from BriefFacts via NLP |
| record_created_datetime | datetime | Yes | No | — |

*Notes: case_id → CaseMaster.CaseMasterID · accused_id → Accused.AccusedMasterID*

---

## Table: `geospatial_hotspot_indicator`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| cell_uid | varchar | Yes | Yes | — |
| district_id | bigint | Yes | No | — |
| police_station_id | bigint | No | No | — |
| cell_center_latitude | double | Yes | No | — |
| cell_center_longitude | double | Yes | No | — |
| crime_count_total | bigint | Yes | No | 0 |
| crime_count_last_30d | bigint | Yes | No | 0 |
| dominant_crime_head_id | bigint | No | No | — |
| composite_risk_score | double | Yes | No | — |
| risk_tier | varchar | Yes | No | — |
| last_refreshed_datetime | datetime | Yes | No | — |

*Notes: district_id → District.DistrictID · police_station_id → Unit.UnitID · dominant_crime_head_id → CrimeHead.CrimeHeadID*

---

## Table: `bsa_audit_trail`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| audit_uid | varchar | Yes | Yes | — |
| event_datetime | datetime | Yes | No | — |
| event_type | varchar | Yes | No | — |
| target_table_name | varchar | Yes | No | — |
| target_record_id | bigint | Yes | No | — |
| actor_employee_id | bigint | Yes | No | — |
| actor_role | varchar | Yes | No | — |
| record_created_datetime | datetime | Yes | No | — |

*Notes: actor_employee_id → Employee.EmployeeID*

---

## Table: `bail_custody_status`
| Column Name | Data Type | Mandatory | Is Unique | Default Value |
|---|---|---|---|---|
| bail_uid | varchar | Yes | Yes | — |
| accused_id | bigint | Yes | No | — |
| case_id | bigint | Yes | No | — |
| current_status | varchar | Yes | No | — |
| bail_granted_datetime | datetime | No | No | — |
| court_id | bigint | No | No | — |
| last_status_updated_datetime | datetime | Yes | No | — |
| updated_by_employee_id | bigint | Yes | No | — |

*Notes: accused_id → Accused.AccusedMasterID · case_id → CaseMaster.CaseMasterID · court_id → Court.CourtID · updated_by_employee_id → Employee.EmployeeID*

---
---

# TABLES ON HOLD — DON'T BUILD YET
Referenced in KSP's relationship matrix but never given a column list:
- `inv_arrestsurrenderaccused`
- `Inv_OccuranceTime`

Also on hold — no real data source exists for these yet, keep empty or off the live demo:
- `biometric_record`
- `phone_financial_token`
- `forensic_evidence_log` (most fields have no source)

---

## BUILD CHECKLIST
```
□ State                □ CaseCategory          □ Employee
□ District             □ GravityOffence        □ CaseMaster
□ UnitType             □ CaseStatusMaster      □ ComplainantDetails
□ Unit                 □ CrimeHead             □ Victim
□ Rank                 □ CrimeSubHead          □ Accused
□ Designation          □ Act                   □ ArrestSurrender
□ CasteMaster          □ Section               □ ActSectionAssociation
□ ReligionMaster       □ CrimeHeadActSection   □ ChargesheetDetails
□ OccupationMaster     □ Court

--- Layer 2 (after all of the above) ---
□ entity_association_graph   □ bsa_audit_trail
□ modus_operandi_signature   □ bail_custody_status
□ geospatial_hotspot_indicator
```

---

*Prepared for: Cognitive Cops — KSP Police Datathon 2026*
*Format: matches Zoho Catalyst Console → Data Store → New Table / New Column dialog exactly*
