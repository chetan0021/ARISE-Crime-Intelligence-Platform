const fs = require('fs');
let code = fs.readFileSync('functions/get_crime_analytics/index.js', 'utf8');

// 1. Fix Bug 7: Reports list-firs
code = code.replace(
  'SELECT fir_master.fir_uid, fir_master.bns_primary_section, fir_master.district_name, fir_master.case_status, fir_master.fir_registration_datetime, fir_master.bnss_deadline_breached FROM fir_master ORDER BY fir_master.fir_registration_datetime DESC',
  "SELECT CaseMaster.CrimeNo, ActSectionAssociation.SectionID, District.DistrictName, CaseStatusMaster.CaseStatusName, CaseMaster.CrimeRegisteredDate FROM CaseMaster, District, CaseStatusMaster, ActSectionAssociation WHERE CaseMaster.DistrictID = District.DistrictID AND CaseMaster.CaseStatusID = CaseStatusMaster.CaseStatusID AND CaseMaster.CaseMasterID = ActSectionAssociation.CaseMasterID ORDER BY CaseMaster.CrimeRegisteredDate DESC"
);
code = code.replace(
  /firUid: r\.fir_uid,[\s\S]*?section: r\.bns_primary_section,[\s\S]*?district: r\.district_name,[\s\S]*?status: r\.case_status,[\s\S]*?date: r\.fir_registration_datetime,[\s\S]*?deadlineBreached: r\.bnss_deadline_breached/g,
  "firUid: r.CrimeNo, section: r.SectionID, district: r.DistrictName, status: r.CaseStatusName, date: r.CrimeRegisteredDate, deadlineBreached: false"
);

// 2. Fix Bug 1: /api/cases/:firUid
code = code.replace(
  /SELECT fir_master\.fir_uid, fir_master\.bns_primary_section, fir_master\.bns_additional_sections, fir_master\.district_name, fir_master\.police_station_code, fir_master\.fir_registration_datetime, fir_master\.incident_reported_datetime, fir_master\.reporting_delay_hours, fir_master\.offence_description_text, fir_master\.complainant_name, fir_master\.incident_address_text, fir_master\.property_type, fir_master\.weapon_used, fir_master\.time_of_day_slot, fir_master\.io_name, fir_master\.case_status, fir_master\.bnss_deadline_breached, fir_master\.mandatory_forensic_triggered, fir_master\.chargesheet_filed_datetime, fir_master\.record_sha256_hash FROM fir_master WHERE fir_master\.fir_uid = '\$\{firUid\}'/g,
  "SELECT CaseMaster.CrimeNo, District.DistrictName, Unit.UnitName, CaseMaster.CrimeRegisteredDate, CaseMaster.BriefFacts, ComplainantDetails.ComplainantName, CaseStatusMaster.CaseStatusName FROM CaseMaster, District, Unit, ComplainantDetails, CaseStatusMaster WHERE CaseMaster.CrimeNo = '' AND CaseMaster.DistrictID = District.DistrictID AND CaseMaster.PoliceStationID = Unit.UnitID AND CaseMaster.CaseMasterID = ComplainantDetails.CaseMasterID AND CaseMaster.CaseStatusID = CaseStatusMaster.CaseStatusID"
);

// Fix field mappings in /api/cases/:firUid
code = code.replace(
  /fir_uid: f\.fir_uid,[\s\S]*?bns_primary_section: f\.bns_primary_section,[\s\S]*?bns_additional_sections: f\.bns_additional_sections,[\s\S]*?district_name: f\.district_name,[\s\S]*?police_station_code: f\.police_station_code,[\s\S]*?fir_registration_datetime: f\.fir_registration_datetime,[\s\S]*?case_status: f\.case_status,[\s\S]*?complainant_name: f\.complainant_name,[\s\S]*?io_name: f\.io_name,[\s\S]*?offence_description_text: f\.offence_description_text/g,
  "fir_uid: f.CrimeNo, district_name: f.DistrictName, police_station_code: f.UnitName, fir_registration_datetime: f.CrimeRegisteredDate, case_status: f.CaseStatusName, complainant_name: f.ComplainantName, io_name: 'IO', offence_description_text: f.BriefFacts"
);

// 3. Fix Bug 6: AI Assistant /api/predict/early-warning
code = code.replace(
  /SELECT offender_profile\.offender_uid, offender_profile\.full_name, offender_profile\.alias_names, offender_profile\.recidivism_risk_score, offender_profile\.gang_affiliation_text, offender_profile\.is_rowdy_sheeter, bail_custody_status\.current_status, bail_custody_status\.bail_expiry_datetime, bail_custody_status\.court_name FROM offender_profile, bail_custody_status WHERE offender_profile\.offender_uid = bail_custody_status\.offender_uid AND bail_custody_status\.current_status = 'BAIL'/g,
  "SELECT offender_intelligence.offender_intel_uid, Accused.AccusedName, offender_intelligence.alias_names, offender_intelligence.recidivism_risk_score, offender_intelligence.gang_affiliation_text, offender_intelligence.is_rowdy_sheeter, bail_custody_status.current_status, bail_custody_status.bail_expiry_datetime FROM offender_intelligence, Accused, bail_custody_status WHERE offender_intelligence.accused_id = Accused.AccusedMasterID AND bail_custody_status.accused_id = Accused.AccusedMasterID AND bail_custody_status.current_status = 'BAIL'"
);
code = code.replace(
  /const bailOffenders = q1\.map\(r => \(\{ \.\.\.\(r\.offender_profile \|\| \{\}\), \.\.\.\(r\.bail_custody_status \|\| \{\}\) \}\)\);/g,
  "const bailOffenders = q1.map(r => ({ ...(r.offender_intelligence || {}), ...(r.Accused || {}), ...(r.bail_custody_status || {}) }));"
);
// In the map function:
code = code.replace(
  /id: 'BAIL-' \+ o\.offender_uid,/g,
  "id: 'BAIL-' + o.offender_intel_uid,"
);
code = code.replace(
  /entityName: o\.full_name/g,
  "entityName: o.AccusedName"
);

// We must also fix q3 in /api/predict/early-warning
code = code.replace(
  /SELECT fir_master\.fir_uid, fir_master\.district_name, fir_master\.bns_primary_section, fir_master\.fir_registration_datetime, fir_master\.io_name, fir_master\.case_status, fir_master\.bnss_deadline_breached FROM fir_master WHERE fir_master\.bnss_deadline_breached = true AND fir_master\.case_status = 'Open'/g,
  "SELECT CaseMaster.CrimeNo, District.DistrictName, CaseMaster.CrimeRegisteredDate, CaseStatusMaster.CaseStatusName FROM CaseMaster, District, CaseStatusMaster WHERE CaseMaster.DistrictID = District.DistrictID AND CaseMaster.CaseStatusID = CaseStatusMaster.CaseStatusID AND CaseStatusMaster.CaseStatusName = 'Under Investigation'"
);

// We must replace r.fir_master || r to r.CaseMaster || r
code = code.replace(
  /const bnssBreaches = q3\.map\(r => r\.fir_master \|\| r\);/g,
  "const bnssBreaches = q3.map(r => r.CaseMaster || r);"
);

// 4. Fix Bug 4: Socio-Demographic details 
code = code.replace(
  /SELECT offender_profile\.gender, offender_profile\.state_of_origin, offender_profile\.education_level, offender_profile\.occupation, offender_profile\.date_of_birth FROM offender_profile/g,
  "SELECT Accused.GenderID, Accused.AgeYear FROM Accused"
);
// Bug 4 also implies joining ComplainantDetails, ReligionMaster, CasteMaster, OccupationMaster
// Since the query originally fetched from offender_profile, let's change it.
// The code fetches offenderRows and maps them to demographics.ageGroups etc.
// We will change the mapping to use AgeYear from Accused instead of date_of_birth.
code = code.replace(
  /const age = Math\.floor\(\(Date\.now\(\) - new Date\(o\.date_of_birth\)\) \/ \(365\.25 \* 24 \* 3600 \* 1000\)\);/g,
  "const age = parseInt(o.AgeYear) || 30;"
);

fs.writeFileSync('functions/get_crime_analytics/index.js', code);
console.log('Done refactoring some queries.');
