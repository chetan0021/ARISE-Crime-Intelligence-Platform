
const WEBHOOK_URL = 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics/api/webhook/seed';

async function seedTable(table, records) {
  console.log(`Pushing ${records.length} records to ${table}...`);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, records })
    });
    const data = await res.json();
    if (!data.success) console.error(`Error in ${table}:`, data);
    else console.log(`Success ${table}: ${data.inserted_count} inserted`);
  } catch (err) {
    console.error(`Fetch error ${table}:`, err.message);
  }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function randElement(arr) { return arr[randInt(0, arr.length - 1)]; }
function randDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

const districts = ['Bengaluru Urban', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi'];
const unitTypes = ['Police Station', 'Outpost', 'Traffic Station'];
const caseStatuses = ['Open', 'Under Investigation', 'Chargesheet Filed', 'Closed', 'Pending Trial'];

async function run() {
  // Seeding State
  let StateData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['StateID'] = i;
    row['StateName'] = 'State Name ' + i;
    row['NationalityID'] = i;
    row['Active'] = Math.random() > 0.5;
    StateData.push(row);
  }
  await seedTable('State', StateData);

  // Seeding District
  let DistrictData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['DistrictID'] = i;
    row['DistrictName'] = 'District Name ' + i;
    row['StateID'] = i;
    row['Active'] = Math.random() > 0.5;
    DistrictData.push(row);
  }
  await seedTable('District', DistrictData);

  // Seeding UnitType
  let UnitTypeData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['UnitTypeID'] = i;
    row['UnitTypeName'] = 'UnitType Name ' + i;
    row['CityDistState'] = 'UnitType Name ' + i;
    row['Hierarchy'] = randInt(1, 100);
    row['Active'] = Math.random() > 0.5;
    UnitTypeData.push(row);
  }
  await seedTable('UnitType', UnitTypeData);

  // Seeding Unit
  let UnitData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['UnitID'] = i;
    row['UnitName'] = 'Unit Name ' + i;
    row['TypeID'] = i;
    row['ParentUnit'] = randInt(1, 100);
    row['NationalityID'] = i;
    row['StateID'] = i;
    row['DistrictID'] = i;
    row['Active'] = Math.random() > 0.5;
    UnitData.push(row);
  }
  await seedTable('Unit', UnitData);

  // Seeding Rank
  let RankData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['RankID'] = i;
    row['RankName'] = 'Rank Name ' + i;
    row['Hierarchy'] = randInt(1, 100);
    row['Active'] = Math.random() > 0.5;
    RankData.push(row);
  }
  await seedTable('Rank', RankData);

  // Seeding Designation
  let DesignationData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['DesignationID'] = i;
    row['DesignationName'] = 'Designation Name ' + i;
    row['SortOrder'] = randInt(1, 100);
    row['Active'] = Math.random() > 0.5;
    DesignationData.push(row);
  }
  await seedTable('Designation', DesignationData);

  // Seeding CasteMaster
  let CasteMasterData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['caste_master_id'] = i;
    row['caste_master_name'] = 'CasteMaster Name ' + i;
    CasteMasterData.push(row);
  }
  await seedTable('CasteMaster', CasteMasterData);

  // Seeding ReligionMaster
  let ReligionMasterData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['ReligionID'] = i;
    row['ReligionName'] = 'ReligionMaster Name ' + i;
    ReligionMasterData.push(row);
  }
  await seedTable('ReligionMaster', ReligionMasterData);

  // Seeding OccupationMaster
  let OccupationMasterData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['OccupationID'] = i;
    row['OccupationName'] = 'OccupationMaster Name ' + i;
    OccupationMasterData.push(row);
  }
  await seedTable('OccupationMaster', OccupationMasterData);

  // Seeding Court
  let CourtData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['CourtID'] = i;
    row['CourtName'] = 'Court Name ' + i;
    row['DistrictID'] = i;
    row['StateID'] = i;
    row['Active'] = Math.random() > 0.5;
    CourtData.push(row);
  }
  await seedTable('Court', CourtData);

  // Seeding CaseCategory
  let CaseCategoryData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['CaseCategoryID'] = i;
    row['LookupValue'] = 'CaseCategory Name ' + i;
    CaseCategoryData.push(row);
  }
  await seedTable('CaseCategory', CaseCategoryData);

  // Seeding GravityOffence
  let GravityOffenceData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['GravityOffenceID'] = i;
    row['LookupValue'] = 'GravityOffence Name ' + i;
    GravityOffenceData.push(row);
  }
  await seedTable('GravityOffence', GravityOffenceData);

  // Seeding CaseStatusMaster
  let CaseStatusMasterData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['CaseStatusID'] = i;
    row['CaseStatusName'] = 'CaseStatusMaster Name ' + i;
    CaseStatusMasterData.push(row);
  }
  await seedTable('CaseStatusMaster', CaseStatusMasterData);

  // Seeding CrimeHead
  let CrimeHeadData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['CrimeHeadID'] = i;
    row['CrimeGroupName'] = 'CrimeHead Name ' + i;
    row['Active'] = Math.random() > 0.5;
    CrimeHeadData.push(row);
  }
  await seedTable('CrimeHead', CrimeHeadData);

  // Seeding CrimeSubHead
  let CrimeSubHeadData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['CrimeSubHeadID'] = i;
    row['CrimeHeadID'] = i;
    row['CrimeHeadName'] = 'CrimeSubHead Name ' + i;
    row['SeqID'] = i;
    CrimeSubHeadData.push(row);
  }
  await seedTable('CrimeSubHead', CrimeSubHeadData);

  // Seeding Act
  let ActData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['ActCode'] = 'Act Name ' + i;
    row['ActDescription'] = 'Act Name ' + i;
    row['ShortName'] = 'Act Name ' + i;
    row['Active'] = Math.random() > 0.5;
    ActData.push(row);
  }
  await seedTable('Act', ActData);

  // Seeding Section
  let SectionData = [];
  for (let i = 1; i <= 5; i++) {
    let row = {};
    row['ActCode'] = 'Section Name ' + i;
    row['SectionCode'] = 'Section Name ' + i;
    row['SectionDescription'] = 'Section Name ' + i;
    row['Active'] = Math.random() > 0.5;
    SectionData.push(row);
  }
  await seedTable('Section', SectionData);

  // Seeding CrimeHeadActSection
  let CrimeHeadActSectionData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['CrimeHeadID'] = randInt(1, 5); // Mock FK
    row['ActCode'] = 'Sample ' + 'ActCode ' + i;
    row['SectionCode'] = 'Sample ' + 'SectionCode ' + i;
    CrimeHeadActSectionData.push(row);
  }
  await seedTable('CrimeHeadActSection', CrimeHeadActSectionData);

  // Seeding Employee
  let EmployeeData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['EmployeeID'] = randInt(1, 5); // Mock FK
    row['DistrictID'] = randInt(1, 5); // Mock FK
    row['UnitID'] = randInt(1, 5); // Mock FK
    row['RankID'] = randInt(1, 5); // Mock FK
    row['DesignationID'] = randInt(1, 5); // Mock FK
    row['KGID'] = randInt(1, 5); // Mock FK
    row['FirstName'] = 'Sample ' + 'FirstName ' + i;
    row['EmployeeDOB'] = randDate(new Date(2024, 0, 1), new Date());
    row['GenderID'] = randInt(1, 5); // Mock FK
    row['BloodGroupID'] = randInt(1, 5); // Mock FK
    row['PhysicallyChallenged'] = Math.random() > 0.5;
    row['AppointmentDate'] = randDate(new Date(2024, 0, 1), new Date());
    EmployeeData.push(row);
  }
  await seedTable('Employee', EmployeeData);

  // Core Cases (40-60)
  let CaseMasterData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['CaseMasterID'] = randInt(1, 5);
    row['CrimeNo'] = 'FIR/2026/' + String(i).padStart(4, '0');
    row['CaseNo'] = 'Sample ' + 'CaseNo ' + i;
    row['CrimeRegisteredDate'] = randDate(new Date(2024, 0, 1), new Date());
    row['PolicePersonID'] = randInt(1, 5);
    row['PoliceStationID'] = randInt(1, 5);
    row['CaseCategoryID'] = randInt(1, 5);
    row['GravityOffenceID'] = randInt(1, 5);
    row['CrimeMajorHeadID'] = randInt(1, 5);
    row['CrimeMinorHeadID'] = randInt(1, 5);
    row['CaseStatusID'] = randInt(1, 5);
    row['CourtID'] = randInt(1, 5);
    row['IncidentFromDate'] = randDate(new Date(2024, 0, 1), new Date());
    row['IncidentToDate'] = randDate(new Date(2024, 0, 1), new Date());
    row['InfoReceivedPSDate'] = randDate(new Date(2024, 0, 1), new Date());
    row['latitude'] = randFloat(1, 100);
    row['longitude'] = randFloat(1, 100);
    row['BriefFacts'] = 'Sample ' + 'BriefFacts ' + i;
    CaseMasterData.push(row);
  }
  await seedTable('CaseMaster', CaseMasterData);

  // Seeding ComplainantDetails
  let ComplainantDetailsData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['ComplainantID'] = randInt(1, 5); // Mock FK
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['ComplainantName'] = 'Sample ' + 'ComplainantName ' + i;
    row['AgeYear'] = randInt(1, 100);
    row['OccupationID'] = randInt(1, 5); // Mock FK
    row['ReligionID'] = randInt(1, 5); // Mock FK
    row['CasteID'] = randInt(1, 5); // Mock FK
    row['GenderID'] = randInt(1, 5); // Mock FK
    ComplainantDetailsData.push(row);
  }
  await seedTable('ComplainantDetails', ComplainantDetailsData);

  // Seeding Victim
  let VictimData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['VictimMasterID'] = randInt(1, 5); // Mock FK
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['VictimName'] = 'Sample ' + 'VictimName ' + i;
    row['AgeYear'] = randInt(1, 100);
    row['GenderID'] = randInt(1, 5); // Mock FK
    row['VictimPolice'] = Math.random() > 0.5;
    VictimData.push(row);
  }
  await seedTable('Victim', VictimData);

  // Seeding Accused
  let AccusedData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['AccusedMasterID'] = randInt(1, 5); // Mock FK
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['AccusedName'] = 'Sample ' + 'AccusedName ' + i;
    row['AgeYear'] = randInt(1, 100);
    row['GenderID'] = randInt(1, 5); // Mock FK
    row['PersonID'] = randInt(1, 5); // Mock FK
    AccusedData.push(row);
  }
  await seedTable('Accused', AccusedData);

  // Seeding ArrestSurrender
  let ArrestSurrenderData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['ArrestSurrenderID'] = randInt(1, 5); // Mock FK
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['ArrestSurrenderTypeID'] = randInt(1, 5); // Mock FK
    row['ArrestSurrenderDate'] = randDate(new Date(2024, 0, 1), new Date());
    row['ArrestSurrenderStateId'] = randInt(1, 5); // Mock FK
    row['ArrestSurrenderDistrictId'] = randInt(1, 5); // Mock FK
    row['PoliceStationID'] = randInt(1, 5); // Mock FK
    row['IOID'] = randInt(1, 5); // Mock FK
    row['CourtID'] = randInt(1, 5); // Mock FK
    row['AccusedMasterID'] = randInt(1, 5); // Mock FK
    row['IsAccused'] = Math.random() > 0.5;
    row['IsComplainantAccused'] = Math.random() > 0.5;
    ArrestSurrenderData.push(row);
  }
  await seedTable('ArrestSurrender', ArrestSurrenderData);

  // Seeding ActSectionAssociation
  let ActSectionAssociationData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['ActID'] = randInt(1, 5); // Mock FK
    row['SectionID'] = randInt(1, 5); // Mock FK
    row['ActOrderID'] = randInt(1, 5); // Mock FK
    row['SectionOrderID'] = randInt(1, 5); // Mock FK
    ActSectionAssociationData.push(row);
  }
  await seedTable('ActSectionAssociation', ActSectionAssociationData);

  // Seeding ChargesheetDetails
  let ChargesheetDetailsData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['CSID'] = randInt(1, 5); // Mock FK
    row['CaseMasterID'] = randInt(1, 5); // Mock FK
    row['csdate'] = randDate(new Date(2024, 0, 1), new Date());
    row['cstype'] = 'Sample ' + 'cstype ' + i;
    row['PolicePersonID'] = randInt(1, 5); // Mock FK
    ChargesheetDetailsData.push(row);
  }
  await seedTable('ChargesheetDetails', ChargesheetDetailsData);

  // Seeding entity_association_graph
  let entity_association_graphData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['edge_uid'] = 'UID-' + 'entity_association_graph' + '-' + i;
    row['source_entity_type'] = 'Sample ' + 'source_entity_type ' + i;
    row['source_entity_id'] = randInt(1, 5); // Mock FK
    row['source_entity_id_ref'] = randInt(1, 5); // Mock FK
    row['target_entity_type'] = 'Sample ' + 'target_entity_type ' + i;
    row['target_entity_id'] = randInt(1, 5); // Mock FK
    row['target_entity_id_ref'] = randInt(1, 5); // Mock FK
    row['relationship_type'] = 'Sample ' + 'relationship_type ' + i;
    row['relationship_strength'] = randFloat(1, 100);
    row['first_observed_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['last_observed_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['fir_uid_context'] = 'UID-' + 'entity_association_graph' + '-' + i;
    row['case_context_id'] = randInt(1, 5); // Mock FK
    row['association_evidence_text'] = randInt(1, 5); // Mock FK
    row['is_active'] = Math.random() > 0.5;
    row['record_sha256_hash'] = 'Sample ' + 'record_sha256_hash ' + i;
    row['record_created_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    entity_association_graphData.push(row);
  }
  await seedTable('entity_association_graph', entity_association_graphData);

  // Seeding modus_operandi_signature
  let modus_operandi_signatureData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['mo_uid'] = 'UID-' + 'modus_operandi_signature' + '-' + i;
    row['fir_uid'] = 'UID-' + 'modus_operandi_signature' + '-' + i;
    row['case_id'] = randInt(1, 5); // Mock FK
    row['offender_uid'] = 'UID-' + 'modus_operandi_signature' + '-' + i;
    row['accused_id'] = randInt(1, 5); // Mock FK
    row['crime_category'] = 'Sample ' + 'crime_category ' + i;
    row['crime_subcategory'] = 'Sample ' + 'crime_subcategory ' + i;
    row['entry_method'] = 'Sample ' + 'entry_method ' + i;
    row['instrument_used'] = 'Sample ' + 'instrument_used ' + i;
    row['target_selection_criteria'] = 'Sample ' + 'target_selection_criteria ' + i;
    row['time_of_operation'] = 'Sample ' + 'time_of_operation ' + i;
    row['day_of_week'] = 'Sample ' + 'day_of_week ' + i;
    row['escape_method'] = 'Sample ' + 'escape_method ' + i;
    row['vehicle_used_number'] = 'Sample ' + 'vehicle_used_number ' + i;
    row['disguise_used'] = Math.random() > 0.5;
    row['accomplice_count'] = randInt(1, 100);
    row['language_spoken_at_scene'] = 'Sample ' + 'language_spoken_at_scene ' + i;
    row['property_stolen_value_inr'] = randFloat(1, 100);
    row['digital_footprint_present'] = Math.random() > 0.5;
    row['mo_narrative_text'] = 'Sample ' + 'mo_narrative_text ' + i;
    row['confidence_score'] = randInt(1, 5); // Mock FK
    row['source_note'] = 'Sample ' + 'source_note ' + i;
    row['record_sha256_hash'] = 'Sample ' + 'record_sha256_hash ' + i;
    row['record_created_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    modus_operandi_signatureData.push(row);
  }
  await seedTable('modus_operandi_signature', modus_operandi_signatureData);

  // Seeding geospatial_hotspot_indicator
  let geospatial_hotspot_indicatorData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['cell_uid'] = 'UID-' + 'geospatial_hotspot_indicator' + '-' + i;
    row['district_name'] = 'Sample ' + 'district_name ' + i;
    row['district_id'] = randInt(1, 5); // Mock FK
    row['police_station_code'] = 'Sample ' + 'police_station_code ' + i;
    row['police_station_id'] = randInt(1, 5); // Mock FK
    row['cell_center_latitude'] = randFloat(1, 100);
    row['cell_center_longitude'] = randFloat(1, 100);
    row['cell_radius_meters'] = randFloat(1, 100);
    row['crime_count_total'] = randInt(1, 100);
    row['crime_count_last_30d'] = randInt(1, 100);
    row['crime_count_last_7d'] = randInt(1, 100);
    row['dominant_crime_type'] = 'Sample ' + 'dominant_crime_type ' + i;
    row['housebreaking_count'] = randInt(1, 100);
    row['cyber_crime_count'] = randInt(1, 100);
    row['assault_count'] = randInt(1, 100);
    row['night_crime_ratio'] = randFloat(1, 100);
    row['weekend_crime_ratio'] = randFloat(1, 100);
    row['repeat_offender_density'] = randFloat(1, 100);
    row['socioeconomic_vulnerability_score'] = randFloat(1, 100);
    row['unemployment_rate_proxy'] = randFloat(1, 100);
    row['slum_proximity_flag'] = Math.random() > 0.5;
    row['composite_risk_score'] = randFloat(1, 100);
    row['risk_tier'] = 'Sample ' + 'risk_tier ' + i;
    row['predicted_peak_hour_start'] = randInt(1, 100);
    row['predicted_peak_hour_end'] = randInt(1, 100);
    row['last_refreshed_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['record_sha256_hash'] = 'Sample ' + 'record_sha256_hash ' + i;
    row['record_created_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    geospatial_hotspot_indicatorData.push(row);
  }
  await seedTable('geospatial_hotspot_indicator', geospatial_hotspot_indicatorData);

  // Seeding bsa_audit_trail
  let bsa_audit_trailData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['audit_uid'] = 'UID-' + 'bsa_audit_trail' + '-' + i;
    row['event_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['event_type'] = 'Sample ' + 'event_type ' + i;
    row['target_table_name'] = 'Sample ' + 'target_table_name ' + i;
    row['target_record_uid'] = 'UID-' + 'bsa_audit_trail' + '-' + i;
    row['actor_officer_id'] = randInt(1, 5); // Mock FK
    row['actor_employee_id'] = randInt(1, 5); // Mock FK
    row['actor_role'] = 'Sample ' + 'actor_role ' + i;
    row['actor_ip_address'] = 'Sample ' + 'actor_ip_address ' + i;
    row['actor_device_id'] = randInt(1, 5); // Mock FK
    row['session_token_hash'] = 'Sample ' + 'session_token_hash ' + i;
    row['query_executed'] = 'Sample ' + 'query_executed ' + i;
    row['data_before_hash'] = 'Sample ' + 'data_before_hash ' + i;
    row['data_after_hash'] = 'Sample ' + 'data_after_hash ' + i;
    row['catalyst_server_timestamp'] = randDate(new Date(2024, 0, 1), new Date());
    row['is_anomalous'] = Math.random() > 0.5;
    row['anomaly_reason_text'] = 'Sample ' + 'anomaly_reason_text ' + i;
    row['record_created_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    bsa_audit_trailData.push(row);
  }
  await seedTable('bsa_audit_trail', bsa_audit_trailData);

  // Seeding bail_custody_status
  let bail_custody_statusData = [];
  for (let i = 1; i <= 60; i++) {
    let row = {};
    row['bail_uid'] = 'UID-' + 'bail_custody_status' + '-' + i;
    row['offender_uid'] = 'UID-' + 'bail_custody_status' + '-' + i;
    row['accused_id'] = randInt(1, 5); // Mock FK
    row['fir_uid'] = 'UID-' + 'bail_custody_status' + '-' + i;
    row['case_id'] = randInt(1, 5); // Mock FK
    row['arrest_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['current_status'] = 'Sample ' + 'current_status ' + i;
    row['bail_granted_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['bail_type'] = 'Sample ' + 'bail_type ' + i;
    row['bail_conditions_text'] = 'Sample ' + 'bail_conditions_text ' + i;
    row['bail_expiry_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['court_name'] = 'Sample ' + 'court_name ' + i;
    row['court_id'] = randInt(1, 5); // Mock FK
    row['court_case_number'] = 'Sample ' + 'court_case_number ' + i;
    row['surety_amount_inr'] = randFloat(1, 100);
    row['last_status_updated_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    row['updated_by_officer_id'] = randInt(1, 5); // Mock FK
    row['updated_by_employee_id'] = randInt(1, 5); // Mock FK
    row['record_sha256_hash'] = 'Sample ' + 'record_sha256_hash ' + i;
    row['record_created_datetime'] = randDate(new Date(2024, 0, 1), new Date());
    bail_custody_statusData.push(row);
  }
  await seedTable('bail_custody_status', bail_custody_statusData);


  

  console.log('Seeding complete.');
}
run();
