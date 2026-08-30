# FINAL MASTER TABLE LIST — COGNITIVE COPS / ARISE
## Every table you need to build. Every column, combined from both H2S's official schema and your old v1 schema. Nothing dropped.

---

**31 tables total.** Read the "Source" column on every row — it tells you whether that column came
from H2S's official schema, your old v1 design, or was newly added to bridge the two. Build in the
order listed (lookups first).

**Legend:**
- `H2S` = from the official KSP schema exactly as given
- `v1` = from your original hackathon design, kept as-is
- `NEW` = added by us to bridge v1's intelligence tables to the real official IDs — not in either original document, but necessary for joins to work

---
---

# SECTION A — 26 OFFICIAL TABLES (100% H2S, build exactly as given)

> **Important:** your old `fir_master` and `offender_profile` are **not rebuilt as tables.** Their old
> columns are split across the tables below (`CaseMaster`, `ComplainantDetails`, `Victim`, `Accused`,
> `ArrestSurrender`, `ChargesheetDetails`, `ActSectionAssociation` + lookup tables). Do not create
> `fir_master` or `offender_profile` fresh — if they already exist in Catalyst from before, leave them
> alone but stop writing new data into them.

## 1. `State`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| StateID | bigint | Yes | Yes | — | H2S |
| StateName | varchar | Yes | No | — | H2S |
| NationalityID | bigint | No | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 2. `District`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| DistrictID | bigint | Yes | Yes | — | H2S |
| DistrictName | varchar | Yes | No | — | H2S |
| StateID | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 3. `UnitType`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| UnitTypeID | bigint | Yes | Yes | — | H2S |
| UnitTypeName | varchar | Yes | No | — | H2S |
| CityDistState | varchar | Yes | No | — | H2S |
| Hierarchy | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 4. `Unit`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| UnitID | bigint | Yes | Yes | — | H2S |
| UnitName | varchar | Yes | No | — | H2S |
| TypeID | bigint | Yes | No | — | H2S |
| ParentUnit | bigint | No | No | — | H2S |
| NationalityID | bigint | No | No | — | H2S |
| StateID | bigint | Yes | No | — | H2S |
| DistrictID | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 5. `Rank`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| RankID | bigint | Yes | Yes | — | H2S |
| RankName | varchar | Yes | No | — | H2S |
| Hierarchy | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 6. `Designation`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| DesignationID | bigint | Yes | Yes | — | H2S |
| DesignationName | varchar | Yes | No | — | H2S |
| SortOrder | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 7. `CasteMaster`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| caste_master_id | bigint | Yes | Yes | — | H2S |
| caste_master_name | varchar | Yes | No | — | H2S |

## 8. `ReligionMaster`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| ReligionID | bigint | Yes | Yes | — | H2S |
| ReligionName | varchar | Yes | No | — | H2S |

## 9. `OccupationMaster`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| OccupationID | bigint | Yes | Yes | — | H2S |
| OccupationName | varchar | Yes | No | — | H2S |

## 10. `Court`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CourtID | bigint | Yes | Yes | — | H2S |
| CourtName | varchar | Yes | No | — | H2S |
| DistrictID | bigint | Yes | No | — | H2S |
| StateID | bigint | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 11. `CaseCategory`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CaseCategoryID | bigint | Yes | Yes | — | H2S |
| LookupValue | varchar | Yes | No | — | H2S |

## 12. `GravityOffence`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| GravityOffenceID | bigint | Yes | Yes | — | H2S |
| LookupValue | varchar | Yes | No | — | H2S |

## 13. `CaseStatusMaster`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CaseStatusID | bigint | Yes | Yes | — | H2S |
| CaseStatusName | varchar | Yes | No | — | H2S |

## 14. `CrimeHead`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CrimeHeadID | bigint | Yes | Yes | — | H2S |
| CrimeGroupName | varchar | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 15. `CrimeSubHead`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CrimeSubHeadID | bigint | Yes | Yes | — | H2S |
| CrimeHeadID | bigint | Yes | No | — | H2S |
| CrimeHeadName | varchar | Yes | No | — | H2S |
| SeqID | bigint | Yes | No | — | H2S |

## 16. `Act`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| ActCode | varchar | Yes | Yes | — | H2S |
| ActDescription | varchar | Yes | No | — | H2S |
| ShortName | varchar | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 17. `Section`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| ActCode | varchar | Yes | No | — | H2S |
| SectionCode | varchar | Yes | No | — | H2S |
| SectionDescription | varchar | Yes | No | — | H2S |
| Active | boolean | Yes | No | true | H2S |

## 18. `CrimeHeadActSection`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CrimeHeadID | bigint | Yes | No | — | H2S |
| ActCode | varchar | Yes | No | — | H2S |
| SectionCode | varchar | Yes | No | — | H2S |

## 19. `Employee`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| EmployeeID | bigint | Yes | Yes | — | H2S |
| DistrictID | bigint | Yes | No | — | H2S |
| UnitID | bigint | Yes | No | — | H2S |
| RankID | bigint | Yes | No | — | H2S |
| DesignationID | bigint | Yes | No | — | H2S |
| KGID | varchar | Yes | Yes | — | H2S |
| FirstName | varchar | Yes | No | — | H2S |
| EmployeeDOB | datetime | No | No | — | H2S |
| GenderID | varchar | Yes | No | — | H2S |
| BloodGroupID | varchar | No | No | — | H2S |
| PhysicallyChallenged | boolean | Yes | No | false | H2S |
| AppointmentDate | datetime | No | No | — | H2S |

## 20. `CaseMaster` (the anchor table — replaces `fir_master`)
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CaseMasterID | bigint | Yes | Yes | — | H2S |
| CrimeNo | varchar | Yes | Yes | — | H2S |
| CaseNo | varchar | Yes | No | — | H2S |
| CrimeRegisteredDate | datetime | Yes | No | — | H2S |
| PolicePersonID | bigint | Yes | No | — | H2S |
| PoliceStationID | bigint | Yes | No | — | H2S |
| CaseCategoryID | bigint | Yes | No | — | H2S |
| GravityOffenceID | bigint | Yes | No | — | H2S |
| CrimeMajorHeadID | bigint | Yes | No | — | H2S |
| CrimeMinorHeadID | bigint | Yes | No | — | H2S |
| CaseStatusID | bigint | Yes | No | — | H2S |
| CourtID | bigint | No | No | — | H2S |
| IncidentFromDate | datetime | Yes | No | — | H2S |
| IncidentToDate | datetime | Yes | No | — | H2S |
| InfoReceivedPSDate | datetime | Yes | No | — | H2S |
| latitude | double | Yes | No | — | H2S |
| longitude | double | Yes | No | — | H2S |
| BriefFacts | text | Yes | No | — | H2S |

*v1 fields with NO home here (not carried forward — no source data exists):
`subdivision_name`, `bns_additional_sections` (now via ActSectionAssociation), `legacy_ipc_section`,
`property_type`, `weapon_used` (moved to Layer 2 `modus_operandi_signature`), `efir_log_id`.*

## 21. `ComplainantDetails`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| ComplainantID | bigint | Yes | Yes | — | H2S |
| CaseMasterID | bigint | Yes | No | — | H2S |
| ComplainantName | varchar | Yes | No | — | H2S |
| AgeYear | bigint | No | No | — | H2S |
| OccupationID | bigint | No | No | — | H2S |
| ReligionID | bigint | No | No | — | H2S |
| CasteID | bigint | No | No | — | H2S |
| GenderID | varchar | Yes | No | — | H2S |

*v1's `complainant_mobile` has no home here — no phone column in the official complainant table.*

## 22. `Victim`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| VictimMasterID | bigint | Yes | Yes | — | H2S |
| CaseMasterID | bigint | Yes | No | — | H2S |
| VictimName | varchar | Yes | No | — | H2S |
| AgeYear | bigint | No | No | — | H2S |
| GenderID | varchar | Yes | No | — | H2S |
| VictimPolice | boolean | Yes | No | false | H2S |

## 23. `Accused` (replaces `offender_profile`)
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| AccusedMasterID | bigint | Yes | Yes | — | H2S |
| CaseMasterID | bigint | Yes | No | — | H2S |
| AccusedName | varchar | Yes | No | — | H2S |
| AgeYear | bigint | No | No | — | H2S |
| GenderID | varchar | Yes | No | — | H2S |
| PersonID | varchar | Yes | No | — | H2S |

*v1 fields with NO home here: `alias_names`, `fathers_name`, `date_of_birth`, `aadhaar_hash`,
`mobile_primary/secondary`, addresses, `nationality`, `occupation`, `photo_url`. ML-derived fields
(`total_prior_arrests`, `recidivism_risk_score`, `is_rowdy_sheeter`, `gang_affiliation_text` etc.)
belong in Layer 2, not here.*

## 24. `ArrestSurrender` (covers most of what `bail_custody_status` was reaching for)
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| ArrestSurrenderID | bigint | Yes | Yes | — | H2S |
| CaseMasterID | bigint | Yes | No | — | H2S |
| ArrestSurrenderTypeID | varchar | Yes | No | — | H2S |
| ArrestSurrenderDate | datetime | Yes | No | — | H2S |
| ArrestSurrenderStateId | bigint | Yes | No | — | H2S |
| ArrestSurrenderDistrictId | bigint | Yes | No | — | H2S |
| PoliceStationID | bigint | Yes | No | — | H2S |
| IOID | bigint | Yes | No | — | H2S |
| CourtID | bigint | No | No | — | H2S |
| AccusedMasterID | bigint | Yes | No | — | H2S |
| IsAccused | boolean | Yes | No | false | H2S |
| IsComplainantAccused | boolean | Yes | No | false | H2S |

## 25. `ActSectionAssociation`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CaseMasterID | bigint | Yes | No | — | H2S |
| ActID | varchar | Yes | No | — | H2S |
| SectionID | varchar | Yes | No | — | H2S |
| ActOrderID | bigint | Yes | No | — | H2S |
| SectionOrderID | bigint | Yes | No | — | H2S |

## 26. `ChargesheetDetails`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| CSID | bigint | Yes | Yes | — | H2S |
| CaseMasterID | bigint | Yes | No | — | H2S |
| csdate | datetime | No | No | — | H2S |
| cstype | varchar | No | No | — | H2S |
| PolicePersonID | bigint | Yes | No | — | H2S |

---
---

# SECTION B — 5 INTELLIGENCE-LAYER TABLES (v1 columns kept in full + new official-ID columns added)

## 27. `entity_association_graph`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| edge_uid | varchar | Yes | Yes | — | v1 |
| source_entity_type | varchar | Yes | No | — | v1 |
| source_entity_id | varchar | Yes | No | — | v1 (old string UID, e.g. `ACC-2024-00441`) |
| **source_entity_id_ref** | **bigint** | **No** | **No** | **—** | **NEW — real AccusedMasterID/CaseMasterID for joins** |
| target_entity_type | varchar | Yes | No | — | v1 |
| target_entity_id | varchar | Yes | No | — | v1 (old string UID) |
| **target_entity_id_ref** | **bigint** | **No** | **No** | **—** | **NEW — real ID for joins** |
| relationship_type | varchar | Yes | No | — | v1 |
| relationship_strength | double | Yes | No | — | v1 |
| first_observed_datetime | datetime | Yes | No | — | v1 |
| last_observed_datetime | datetime | Yes | No | — | v1 |
| fir_uid_context | varchar | No | No | — | v1 (old string FIR UID) |
| **case_context_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → CaseMaster.CaseMasterID** |
| association_evidence_text | text | No | No | — | v1 |
| is_active | boolean | Yes | No | true | v1 |
| record_sha256_hash | varchar | Yes | No | — | v1 |
| record_created_datetime | datetime | Yes | No | — | v1 |

## 28. `modus_operandi_signature`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| mo_uid | varchar | Yes | Yes | — | v1 |
| fir_uid | varchar | Yes | No | — | v1 (old string FK) |
| **case_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → CaseMaster.CaseMasterID** |
| offender_uid | varchar | Yes | No | — | v1 (old string FK) |
| **accused_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → Accused.AccusedMasterID** |
| crime_category | varchar | Yes | No | — | v1 |
| crime_subcategory | varchar | No | No | — | v1 |
| entry_method | varchar | No | No | — | v1 |
| instrument_used | varchar | No | No | — | v1 |
| target_selection_criteria | varchar | No | No | — | v1 |
| time_of_operation | varchar | Yes | No | — | v1 |
| day_of_week | varchar | Yes | No | — | v1 |
| escape_method | varchar | No | No | — | v1 |
| vehicle_used_number | varchar | No | No | — | v1 |
| disguise_used | boolean | Yes | No | false | v1 |
| accomplice_count | bigint | Yes | No | 0 | v1 |
| language_spoken_at_scene | varchar | No | No | — | v1 |
| property_stolen_value_inr | double | No | No | — | v1 |
| digital_footprint_present | boolean | Yes | No | false | v1 |
| mo_narrative_text | text | Yes | No | — | v1 |
| **confidence_score** | **double** | **No** | **No** | **—** | **NEW — 0.00–1.00, since this data is NLP-inferred, not officially recorded** |
| **source_note** | **varchar** | **No** | **No** | **Inferred from BriefFacts via NLP** | **NEW — flags this table as AI-inferred, not source data** |
| record_sha256_hash | varchar | Yes | No | — | v1 |
| record_created_datetime | datetime | Yes | No | — | v1 |

## 29. `geospatial_hotspot_indicator`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| cell_uid | varchar | Yes | Yes | — | v1 |
| district_name | varchar | Yes | No | — | v1 |
| **district_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → District.DistrictID** |
| police_station_code | varchar | Yes | No | — | v1 |
| **police_station_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → Unit.UnitID** |
| cell_center_latitude | double | Yes | No | — | v1 |
| cell_center_longitude | double | Yes | No | — | v1 |
| cell_radius_meters | double | Yes | No | — | v1 |
| crime_count_total | bigint | Yes | No | 0 | v1 |
| crime_count_last_30d | bigint | Yes | No | 0 | v1 |
| crime_count_last_7d | bigint | Yes | No | 0 | v1 |
| dominant_crime_type | varchar | Yes | No | — | v1 |
| housebreaking_count | bigint | Yes | No | 0 | v1 |
| cyber_crime_count | bigint | Yes | No | 0 | v1 |
| assault_count | bigint | Yes | No | 0 | v1 |
| night_crime_ratio | double | Yes | No | — | v1 |
| weekend_crime_ratio | double | Yes | No | — | v1 |
| repeat_offender_density | double | Yes | No | — | v1 |
| socioeconomic_vulnerability_score | double | No | No | — | v1 |
| unemployment_rate_proxy | double | No | No | — | v1 |
| slum_proximity_flag | boolean | No | No | — | v1 |
| composite_risk_score | double | Yes | No | — | v1 |
| risk_tier | varchar | Yes | No | — | v1 |
| predicted_peak_hour_start | bigint | No | No | — | v1 |
| predicted_peak_hour_end | bigint | No | No | — | v1 |
| last_refreshed_datetime | datetime | Yes | No | — | v1 |
| record_sha256_hash | varchar | Yes | No | — | v1 |
| record_created_datetime | datetime | Yes | No | — | v1 |

## 30. `bsa_audit_trail`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| audit_uid | varchar | Yes | Yes | — | v1 |
| event_datetime | datetime | Yes | No | — | v1 |
| event_type | varchar | Yes | No | — | v1 |
| target_table_name | varchar | Yes | No | — | v1 |
| target_record_uid | varchar | Yes | No | — | v1 |
| actor_officer_id | varchar | Yes | No | — | v1 |
| **actor_employee_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → Employee.EmployeeID** |
| actor_role | varchar | Yes | No | — | v1 |
| actor_ip_address | varchar | Yes | No | — | v1 |
| actor_device_id | varchar | Yes | No | — | v1 |
| session_token_hash | varchar | Yes | No | — | v1 |
| query_executed | text | No | No | — | v1 |
| data_before_hash | varchar | No | No | — | v1 |
| data_after_hash | varchar | No | No | — | v1 |
| catalyst_server_timestamp | datetime | Yes | No | — | v1 |
| is_anomalous | boolean | Yes | No | false | v1 |
| anomaly_reason_text | text | No | No | — | v1 |

## 31. `bail_custody_status`
| Column Name | Data Type | Mandatory | Unique | Default | Source |
|---|---|---|---|---|---|
| bail_uid | varchar | Yes | Yes | — | v1 |
| offender_uid | varchar | Yes | No | — | v1 (old string FK) |
| **accused_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → Accused.AccusedMasterID** |
| fir_uid | varchar | Yes | No | — | v1 (old string FK) |
| **case_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → CaseMaster.CaseMasterID** |
| arrest_datetime | datetime | No | No | — | v1 |
| current_status | varchar | Yes | No | — | v1 |
| bail_granted_datetime | datetime | No | No | — | v1 |
| bail_type | varchar | No | No | — | v1 |
| bail_conditions_text | text | No | No | — | v1 |
| bail_expiry_datetime | datetime | No | No | — | v1 |
| court_name | varchar | No | No | — | v1 |
| **court_id** | **bigint** | **No** | **No** | **—** | **NEW — real FK → Court.CourtID** |
| court_case_number | varchar | No | No | — | v1 |
| surety_amount_inr | double | No | No | — | v1 |
| last_status_updated_datetime | datetime | Yes | No | — | v1 |
| updated_by_officer_id | varchar | Yes | No | — | v1 |
| record_sha256_hash | varchar | Yes | No | — | v1 |
| record_created_datetime | datetime | Yes | No | — | v1 |

---
---

# TABLES NOT IN THE 31 — STILL DOCUMENTED, ON HOLD

These exist in your v1 file but have **no real data source** in the H2S schema at all — no column
in any official table maps to fingerprints, phone numbers, bank accounts, or seizure records. Their
original v1 structure is preserved below exactly as designed, in case you decide to build them later
once a real data feed exists. **Do not build or populate these for now.**

- `biometric_record` — 17 columns (fingerprint hashes, height/weight, face/voice encoding hashes, DNA reference)
- `phone_financial_token` — 15 columns (UPI/bank/crypto token registry)
- `forensic_evidence_log` — 14 columns (seizure/chain-of-custody tracking)

*(Full column lists for these three are unchanged from `CognitiveCops_DB_Blueprint.md` §6, §10, §11 — reference that file directly if/when you build them.)*

Also on hold — referenced in H2S's relationship matrix but never given column definitions:
- `inv_arrestsurrenderaccused`
- `Inv_OccuranceTime`

---

## FINAL BUILD CHECKLIST — ALL 31 TABLES, IN ORDER

```
SECTION A (H2S official, build 1→26):
□ 1. State              □ 10. Court                □ 19. Employee
□ 2. District            □ 11. CaseCategory          □ 20. CaseMaster
□ 3. UnitType            □ 12. GravityOffence        □ 21. ComplainantDetails
□ 4. Unit                □ 13. CaseStatusMaster      □ 22. Victim
□ 5. Rank                □ 14. CrimeHead             □ 23. Accused
□ 6. Designation         □ 15. CrimeSubHead          □ 24. ArrestSurrender
□ 7. CasteMaster         □ 16. Act                   □ 25. ActSectionAssociation
□ 8. ReligionMaster      □ 17. Section               □ 26. ChargesheetDetails
□ 9. OccupationMaster    □ 18. CrimeHeadActSection

SECTION B (v1 + new ID columns, build 27→31, AFTER Section A is fully populated):
□ 27. entity_association_graph    □ 30. bsa_audit_trail
□ 28. modus_operandi_signature    □ 31. bail_custody_status
□ 29. geospatial_hotspot_indicator
```

---

*This is the final, single source of truth. Older documents (`ARISE_Catalyst_Schema_Build_Guide.md`,
`ARISE_ZCQL_StepByStep_TableCreation.md`, `CognitiveCops_Schema_Migration_v2.md`) are now superseded
by this file for table/column structure — refer to them only for the seed-data example and the
reasoning behind each decision, not for the column list itself.*
