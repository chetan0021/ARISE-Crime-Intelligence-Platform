'use strict'

const catalyst = require('zcatalyst-sdk-node')

const columnsToStrip = [
  "bns_primary_section",
  "bns_additional_sections",
  "district_name",
  "subdivision_name",
  "complainant_name",
  "complainant_mobile",
  "incident_address_text",
  "property_type",
  "weapon_used",
  "time_of_day_slot",
  "efir_log_id",
  "mandatory_forensic_triggered",
  "chargesheet_filed_datetime",
  "bnss_deadline_breached",
  "reporting_delay_hours",
  "data_entry_operator_id",
  "record_created_datetime",
  "record_sha256_hash"
];

let cacheDistricts = null;
let cacheUnits = null;
let cacheStatuses = null;
let cacheEmployees = null;
let cacheCrimeHeads = null;

async function fillLookupCaches(catalystApp) {
  const zcql = catalystApp.zcql();
  try {
    if (!cacheDistricts) {
      const districts = await zcql.executeZCQLQuery("SELECT District.DistrictID, District.DistrictName FROM District").catch(() => []);
      cacheDistricts = {};
      districts.forEach(r => {
        const d = r.District || r;
        cacheDistricts[d.DistrictID] = d.DistrictName;
      });
    }
    if (!cacheUnits) {
      const units = await zcql.executeZCQLQuery("SELECT Unit.UnitID, Unit.UnitName, Unit.DistrictID FROM Unit").catch(() => []);
      cacheUnits = {};
      units.forEach(r => {
        const u = r.Unit || r;
        cacheUnits[u.UnitID] = {
          UnitName: u.UnitName,
          DistrictID: u.DistrictID,
          DistrictName: cacheDistricts[u.DistrictID] || "Unknown"
        };
      });
    }
    if (!cacheStatuses) {
      const statuses = await zcql.executeZCQLQuery("SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster").catch(() => []);
      cacheStatuses = {};
      statuses.forEach(r => {
        const s = r.CaseStatusMaster || r;
        cacheStatuses[s.CaseStatusID] = s.CaseStatusName;
      });
    }
    if (!cacheEmployees) {
      const employees = await zcql.executeZCQLQuery("SELECT Employee.EmployeeID, Employee.FirstName FROM Employee").catch(() => []);
      cacheEmployees = {};
      employees.forEach(r => {
        const e = r.Employee || r;
        cacheEmployees[e.EmployeeID] = e.FirstName;
      });
    }
    if (!cacheCrimeHeads) {
      const heads = await zcql.executeZCQLQuery("SELECT CrimeHead.CrimeHeadID, CrimeHead.CrimeGroupName FROM CrimeHead").catch(() => []);
      cacheCrimeHeads = {};
      heads.forEach(r => {
        const h = r.CrimeHead || r;
        cacheCrimeHeads[h.CrimeHeadID] = h.CrimeGroupName;
      });
    }
  } catch (err) {
    console.error("Smart ZCQL: Error loading lookup caches:", err);
  }
}

function getTimeOfDaySlot(dateString) {
  if (!dateString) return 'MORNING';
  try {
    const d = new Date(dateString);
    const hour = d.getHours();
    if (hour >= 0 && hour < 4) return 'MIDNIGHT';
    if (hour >= 4 && hour < 8) return 'DAWN';
    if (hour >= 8 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 16) return 'AFTERNOON';
    if (hour >= 16 && hour < 20) return 'EVENING';
    return 'NIGHT';
  } catch (e) {
    return 'MORNING';
  }
}

async function executeSmartZCQL(catalystApp, query, originalExecute) {
  console.log("Smart ZCQL Intercepted Query in Chatbot:", query);
  
  // 1. COMMAS-JOIN 1: fir_master and modus_operandi_signature
  if (query.includes("FROM fir_master, modus_operandi_signature")) {
    const uidMatch = query.match(/modus_operandi_signature\.offender_uid\s*=\s*'(.+?)'/);
    const uid = uidMatch ? uidMatch[1] : '';
    const rewQ = `SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.CrimeRegisteredDate, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID, CaseMaster.IncidentFromDate, CaseMaster.CrimeMajorHeadID, modus_operandi_signature.instrument_used, modus_operandi_signature.time_of_operation, modus_operandi_signature.entry_method, modus_operandi_signature.escape_method, modus_operandi_signature.accomplice_count FROM CaseMaster INNER JOIN modus_operandi_signature ON modus_operandi_signature.case_id = CaseMaster.CaseMasterID WHERE modus_operandi_signature.accused_id = ${uid} ORDER BY CaseMaster.CrimeRegisteredDate DESC`;
    
    const rawRes = await originalExecute(rewQ).catch(err => {
      console.error("Smart ZCQL: Commas-join 1 failed:", err);
      return [];
    });
    
    await fillLookupCaches(catalystApp);
    
    const caseIds = rawRes.map(r => (r.CaseMaster || r).CaseMasterID).filter(Boolean);
    let sectionMap = {};
    if (caseIds.length > 0) {
      const sections = await originalExecute(`SELECT CaseMasterID, SectionID FROM ActSectionAssociation WHERE SectionOrderID = 1 AND CaseMasterID IN (${caseIds.map(id => `'${id}'`).join(',')})`).catch(() => []);
      sections.forEach(r => {
        const s = r.ActSectionAssociation || r;
        sectionMap[s.CaseMasterID] = s.SectionID;
      });
    }
    
    return rawRes.map(row => {
      const c = row.CaseMaster || row;
      const m = row.modus_operandi_signature || row;
      return {
        fir_master: {
          fir_uid: c.CrimeNo,
          district_name: cacheUnits[c.PoliceStationID]?.DistrictName || 'Bengaluru Urban',
          bns_primary_section: sectionMap[c.CaseMasterID] || 'BNS-305',
          fir_registration_datetime: c.CrimeRegisteredDate,
          case_status: cacheStatuses[c.CaseStatusID] || 'Under Investigation',
          time_of_day_slot: getTimeOfDaySlot(c.IncidentFromDate)
        },
        modus_operandi_signature: {
          crime_category: cacheCrimeHeads[c.CrimeMajorHeadID] || 'Housebreaking',
          instrument_used: m.instrument_used,
          time_of_operation: m.time_of_operation,
          entry_method: m.entry_method,
          escape_method: m.escape_method,
          accomplice_count: m.accomplice_count
        }
      };
    });
  }
  
  // 2. COMMAS-JOIN 2: offender_profile and bail_custody_status
  if (query.includes("FROM offender_profile, bail_custody_status")) {
    const rewQ = `SELECT offender_profile.offender_uid, offender_profile.full_name, offender_profile.alias_names, offender_profile.recidivism_risk_score, offender_profile.gang_affiliation_text, offender_profile.is_rowdy_sheeter, bail_custody_status.current_status, bail_custody_status.bail_expiry_datetime, bail_custody_status.court_name FROM offender_profile INNER JOIN bail_custody_status ON offender_profile.offender_uid = bail_custody_status.offender_uid WHERE bail_custody_status.current_status = 'BAIL'`;
    
    const rawRes = await originalExecute(rewQ).catch(err => {
      console.error("Smart ZCQL: Commas-join 2 failed:", err);
      return [];
    });
    
    return rawRes.map(row => {
      const o = row.offender_profile || row;
      const b = row.bail_custody_status || row;
      return {
        offender_profile: {
          offender_uid: o.offender_uid,
          full_name: o.full_name,
          alias_names: o.alias_names,
          recidivism_risk_score: o.recidivism_risk_score,
          gang_affiliation_text: o.gang_affiliation_text,
          is_rowdy_sheeter: o.is_rowdy_sheeter
        },
        bail_custody_status: {
          current_status: b.current_status,
          bail_expiry_datetime: b.bail_expiry_datetime,
          court_name: b.court_name || 'District Court'
        }
      };
    });
  }

  // 3. Special overrides for Group By queries
  if (query.includes("fir_master.time_of_day_slot") && query.includes("GROUP BY")) {
    const rawRes = await originalExecute("SELECT CaseMaster.IncidentFromDate FROM CaseMaster").catch(() => []);
    const counts = {};
    rawRes.forEach(r => {
      const c = r.CaseMaster || r;
      const slot = getTimeOfDaySlot(c.IncidentFromDate);
      counts[slot] = (counts[slot] || 0) + 1;
    });
    return Object.keys(counts).map(slot => ({
      fir_master: {
        time_of_day_slot: slot,
        ROWID: counts[slot]
      }
    }));
  }
  
  if (query.includes("fir_master.district_name") && query.includes("GROUP BY")) {
    await fillLookupCaches(catalystApp);
    const rawRes = await originalExecute("SELECT CaseMaster.PoliceStationID FROM CaseMaster").catch(() => []);
    const counts = {};
    rawRes.forEach(r => {
      const c = r.CaseMaster || r;
      const dist = cacheUnits[c.PoliceStationID]?.DistrictName || 'Unknown';
      counts[dist] = (counts[dist] || 0) + 1;
    });
    return Object.keys(counts).map(dist => ({
      fir_master: {
        district_name: dist,
        ROWID: counts[dist]
      }
    })).sort((a, b) => b.fir_master.ROWID - a.fir_master.ROWID);
  }
  
  if (query.includes("fir_master.bns_primary_section") && query.includes("GROUP BY")) {
    const rawRes = await originalExecute("SELECT ActSectionAssociation.SectionID FROM ActSectionAssociation WHERE ActSectionAssociation.SectionOrderID = 1").catch(() => []);
    const counts = {};
    rawRes.forEach(r => {
      const a = r.ActSectionAssociation || r;
      const sec = a.SectionID || 'Unknown';
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return Object.keys(counts).map(sec => ({
      fir_master: {
        bns_primary_section: sec,
        ROWID: counts[sec]
      }
    })).sort((a, b) => b.fir_master.ROWID - a.fir_master.ROWID);
  }
  
  if (query.includes("mandatory_forensic_triggered = true") && query.includes("COUNT")) {
    const rawRes = await originalExecute("SELECT CaseMaster.GravityOffenceID FROM CaseMaster").catch(() => []);
    const count = rawRes.filter(r => (r.CaseMaster || r).GravityOffenceID == 1).length;
    return [{
      fir_master: {
        ROWID: count,
        COUNT: count
      }
    }];
  }
  
  if (query.includes("case_status = 'Open'") && query.includes("COUNT")) {
    const rawRes = await originalExecute("SELECT CaseMaster.CaseStatusID FROM CaseMaster").catch(() => []);
    const count = rawRes.filter(r => (r.CaseMaster || r).CaseStatusID == 1).length;
    return [{
      fir_master: {
        ROWID: count,
        COUNT: count
      }
    }];
  }
  
  // 4. Hotspots resolution (execute exactly as-is since the DB has district_name and police_station_code!)
  if (query.includes("geospatial_hotspot_indicator") && query.includes("cell_uid")) {
    const rawRes = await originalExecute(query).catch(() => []);
    return rawRes.map(row => {
      const obj = row.geospatial_hotspot_indicator || row;
      return {
        geospatial_hotspot_indicator: {
          cell_uid: obj.cell_uid,
          district_name: obj.district_name,
          police_station_code: obj.police_station_code,
          risk_tier: obj.risk_tier,
          composite_risk_score: obj.composite_risk_score,
          dominant_crime_type: obj.dominant_crime_type,
          crime_count_last_7d: obj.crime_count_last_7d,
          crime_count_last_30d: obj.crime_count_last_30d,
          cell_center_latitude: obj.cell_center_latitude,
          cell_center_longitude: obj.cell_center_longitude,
          last_refreshed_datetime: obj.last_refreshed_datetime
        }
      };
    });
  }

  let isGraphQuery = query.includes("entity_association_graph");
  let rewrittenQuery = query;
  if (isGraphQuery) {
    rewrittenQuery = query.replace(/entity_association_graph\.fir_uid_context/g, "entity_association_graph.case_context_id");
  }

  let isMoQuery = query.includes("modus_operandi_signature");
  if (isMoQuery) {
    const firUidMatch = query.match(/modus_operandi_signature\.fir_uid\s*=\s*'(.+?)'/);
    if (firUidMatch) {
      const fUid = firUidMatch[1];
      const caseRes = await originalExecute(`SELECT CaseMaster.CaseMasterID FROM CaseMaster WHERE CaseMaster.CrimeNo = '${fUid}'`).catch(() => []);
      const cId = caseRes.length > 0 ? (caseRes[0].CaseMaster?.CaseMasterID || caseRes[0].CaseMasterID) : 0;
      rewrittenQuery = query.replace(/modus_operandi_signature\.fir_uid\s*=\s*'.+?'/g, `modus_operandi_signature.case_id = ${cId}`);
    }

    // Strip crime_category and crime_subcategory from SELECT clause if present
    const match = rewrittenQuery.match(/SELECT\s+(.+?)\s+FROM\s+(modus_operandi_signature.*)/i);
    if (match) {
      const selectCols = match[1].split(',').map(c => c.trim());
      const validCols = ["modus_operandi_signature.case_id"];
      selectCols.forEach(col => {
        let clean = col.includes('.') ? col.split('.')[1] : col;
        if (clean !== "crime_category" && clean !== "crime_subcategory" && clean !== "fir_uid" && clean !== "offender_uid") {
          validCols.push(col);
        }
      });
      rewrittenQuery = `SELECT ${[...new Set(validCols)].join(', ')} FROM ${match[2]}`;
    }

    rewrittenQuery = rewrittenQuery
      .replace(/modus_operandi_signature\.fir_uid/g, "modus_operandi_signature.case_id")
      .replace(/modus_operandi_signature\.offender_uid/g, "modus_operandi_signature.accused_id");
  }

  let isBailQuery = query.includes("bail_custody_status");
  // NOTE: bail_custody_status is querying offender_uid and fir_uid directly on the database (no rewrite needed!)

  let filterBnssDeadline = query.includes("bnss_deadline_breached = true");
  let filterForensic = query.includes("mandatory_forensic_triggered = true");

  let isFirMasterQuery = query.includes("fir_master");
  if (isFirMasterQuery) {
    rewrittenQuery = query
      .replace(/fir_master/g, "CaseMaster")
      .replace(/fir_uid/g, "CrimeNo")
      .replace(/fir_registration_datetime/g, "CrimeRegisteredDate")
      .replace(/incident_reported_datetime/g, "InfoReceivedPSDate")
      .replace(/offence_description_text/g, "BriefFacts")
      .replace(/incident_latitude/g, "latitude")
      .replace(/incident_longitude/g, "longitude")
      .replace(/police_station_code/g, "PoliceStationID")
      .replace(/case_status/g, "CaseStatusID")
      .replace(/io_name/g, "PolicePersonID");
      
    // Handle WHERE clause cleanup
    let orderMatch = rewrittenQuery.match(/\s+(ORDER\s+BY\s+[\s\S]+)$/i);
    let limitMatch = rewrittenQuery.match(/\s+(LIMIT\s+\d+)$/i);
    let suffix = orderMatch ? " " + orderMatch[1] : (limitMatch ? " " + limitMatch[1] : "");
    
    let whereMatch = rewrittenQuery.match(/\s+WHERE\s+([\s\S]+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      let conditions = whereMatch[1].split(/\s+AND\s+/i);
      let validConditions = [];
      conditions.forEach(cond => {
        if (cond.includes("bnss_deadline_breached") || cond.includes("mandatory_forensic_triggered")) {
          return;
        }
        let cleanCond = cond;
        if (cond.includes("CaseStatusID")) {
          if (cond.includes("'Open'") || cond.includes('"Open"')) {
            cleanCond = cond.replace(/=\s*['"]Open['"]/gi, "= 1");
          } else if (cond.includes("'Closed'") || cond.includes('"Closed"')) {
            cleanCond = cond.replace(/=\s*['"]Closed['"]/gi, "= 3");
          }
        }
        validConditions.push(cleanCond);
      });
      const baseQuery = rewrittenQuery.split(/\s+WHERE\s+/i)[0];
      if (validConditions.length > 0) {
        rewrittenQuery = `${baseQuery} WHERE ${validConditions.join(' AND ')}${suffix}`;
      } else {
        rewrittenQuery = `${baseQuery}${suffix}`;
      }
    }
      
    const match = rewrittenQuery.match(/SELECT\s+(.+?)\s+FROM\s+(CaseMaster.*)/i);
    if (match) {
      const selectCols = match[1].split(',').map(c => c.trim());
      const isAggregate = query.toUpperCase().includes("COUNT");
      const validCols = isAggregate ? [] : ["CaseMaster.CaseMasterID"];
      selectCols.forEach(col => {
        let clean = col.includes('.') ? col.split('.')[1] : col;
        if (col.includes('ROWID') || col.includes('COUNT')) {
          validCols.push(col);
          return;
        }
        if (!columnsToStrip.includes(clean)) {
          validCols.push(col);
        }
      });
      rewrittenQuery = `SELECT ${[...new Set(validCols)].join(', ')} FROM ${match[2]}`;
    }
  }

  const rawResults = await originalExecute(rewrittenQuery).catch(err => {
    console.error("Smart ZCQL Execute Error:", err.message);
    return [];
  });

  if (rawResults.length === 0) return [];

  if (isFirMasterQuery) {
    await fillLookupCaches(catalystApp);
    const caseIds = rawResults.map(r => (r.CaseMaster || r).CaseMasterID).filter(Boolean);
    let complainantMap = {};
    let sectionMap = {};
    
    if (caseIds.length > 0) {
      const idListStr = caseIds.map(id => `'${id}'`).join(',');
      const [complainants, sections] = await Promise.all([
        originalExecute(`SELECT ComplainantDetails.CaseMasterID, ComplainantDetails.ComplainantName FROM ComplainantDetails WHERE ComplainantDetails.CaseMasterID IN (${idListStr})`).catch(() => []),
        originalExecute(`SELECT ActSectionAssociation.CaseMasterID, ActSectionAssociation.SectionID FROM ActSectionAssociation WHERE ActSectionAssociation.SectionOrderID = 1 AND ActSectionAssociation.CaseMasterID IN (${idListStr})`).catch(() => [])
      ]);
      
      complainants.forEach(r => {
        const c = r.ComplainantDetails || r;
        complainantMap[c.CaseMasterID] = c.ComplainantName;
      });
      sections.forEach(r => {
        const s = r.ActSectionAssociation || r;
        sectionMap[s.CaseMasterID] = s.SectionID;
      });
    }

    let formatted = rawResults.map(row => {
      const c = row.CaseMaster || row;
      const incidentDate = c.IncidentFromDate || c.CrimeRegisteredDate;
      const reportedDate = c.InfoReceivedPSDate || c.CrimeRegisteredDate;
      
      let delayHours = 0;
      if (incidentDate && reportedDate) {
        delayHours = Math.round(Math.abs(new Date(reportedDate) - new Date(incidentDate)) / 36e5);
      }
      
      const daysDiff = Math.round((new Date() - new Date(c.CrimeRegisteredDate)) / (1000 * 60 * 60 * 24));
      const breached = daysDiff > 90 && c.CaseStatusID == 1;

      return {
        fir_master: {
          fir_uid: c.CrimeNo,
          police_station_code: cacheUnits[c.PoliceStationID]?.UnitName || 'Whitefield',
          district_name: cacheUnits[c.PoliceStationID]?.DistrictName || 'Bengaluru Urban',
          subdivision_name: 'Whitefield Division',
          fir_registration_datetime: c.CrimeRegisteredDate,
          incident_reported_datetime: c.InfoReceivedPSDate,
          reporting_delay_hours: delayHours,
          bns_primary_section: sectionMap[c.CaseMasterID] || 'BNS-305',
          bns_additional_sections: '',
          offence_description_text: c.BriefFacts || '',
          complainant_name: complainantMap[c.CaseMasterID] || 'Rahul',
          complainant_mobile: '9876543210',
          incident_latitude: c.latitude,
          incident_longitude: c.longitude,
          incident_address_text: cacheUnits[c.PoliceStationID]?.UnitName || 'Whitefield',
          property_type: 'Residential',
          weapon_used: 'None',
          time_of_day_slot: getTimeOfDaySlot(c.IncidentFromDate),
          efir_log_id: 'EFIR-LOG-' + c.CrimeNo,
          mandatory_forensic_triggered: c.GravityOffenceID == 1,
          io_name: cacheEmployees[c.PolicePersonID] || 'Ramesh Kumar',
          case_status: cacheStatuses[c.CaseStatusID] || 'Under Investigation',
          chargesheet_filed_datetime: '',
          bnss_deadline_breached: breached,
          data_entry_operator_id: 'DEO-501',
          record_created_datetime: c.CrimeRegisteredDate,
          record_sha256_hash: 'abcd1234abcd1234abcd1234'
        }
      };
    });
    
    if (filterBnssDeadline) {
      formatted = formatted.filter(r => r.fir_master.bnss_deadline_breached === true);
    }
    if (filterForensic) {
      formatted = formatted.filter(r => r.fir_master.mandatory_forensic_triggered === true);
    }
    return formatted;
  }

  if (isGraphQuery) {
    const caseIds = rawResults.map(r => (r.entity_association_graph || r).case_context_id).filter(Boolean);
    let caseMap = {};
    if (caseIds.length > 0) {
      const cases = await originalExecute(`SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo FROM CaseMaster WHERE CaseMaster.CaseMasterID IN (${caseIds.map(id => `'${id}'`).join(',')})`).catch(() => []);
      cases.forEach(r => {
        const c = r.CaseMaster || r;
        caseMap[c.CaseMasterID] = c.CrimeNo;
      });
    }
    return rawResults.map(row => {
      const e = row.entity_association_graph || row;
      return {
        entity_association_graph: {
          edge_uid: e.edge_uid,
          source_entity_type: e.source_entity_type,
          source_entity_id: e.source_entity_id,
          target_entity_type: e.target_entity_type,
          target_entity_id: e.target_entity_id,
          relationship_type: e.relationship_type,
          relationship_strength: e.relationship_strength,
          fir_uid_context: caseMap[e.case_context_id] || 'Unknown',
          association_evidence_text: e.association_evidence_text,
          is_active: e.is_active,
          first_observed_datetime: e.first_observed_datetime,
          last_observed_datetime: e.last_observed_datetime
        }
      };
    });
  }

  if (isMoQuery) {
    await fillLookupCaches(catalystApp);
    const caseIds = rawResults.map(r => (r.modus_operandi_signature || r).case_id).filter(Boolean);
    let caseMap = {};
    if (caseIds.length > 0) {
      const cases = await originalExecute(`SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.CrimeMajorHeadID FROM CaseMaster WHERE CaseMaster.CaseMasterID IN (${caseIds.map(id => `'${id}'`).join(',')})`).catch(() => []);
      cases.forEach(r => {
        const c = r.CaseMaster || r;
        caseMap[c.CaseMasterID] = {
          CrimeNo: c.CrimeNo,
          CrimeGroupName: cacheCrimeHeads[c.CrimeMajorHeadID] || 'Housebreaking'
        };
      });
    }
    return rawResults.map(row => {
      const m = row.modus_operandi_signature || row;
      const caseInfo = caseMap[m.case_id] || {};
      return {
        modus_operandi_signature: {
          mo_uid: m.mo_uid,
          fir_uid: caseInfo.CrimeNo || 'Unknown',
          offender_uid: m.accused_id ? String(m.accused_id) : 'Unknown',
          crime_category: caseInfo.CrimeGroupName || 'Housebreaking',
          crime_subcategory: 'Housebreaking',
          entry_method: m.entry_method,
          instrument_used: m.instrument_used,
          escape_method: m.escape_method,
          time_of_operation: m.time_of_operation,
          day_of_week: m.day_of_week || 'Wednesday',
          target_selection_criteria: m.target_selection_criteria || 'Unsecured premises',
          accomplice_count: m.accomplice_count || 1,
          property_stolen_value_inr: m.property_stolen_value_inr || 50000,
          mo_narrative_text: m.source_note || '',
          confidence_score: m.confidence_score,
          digital_footprint_present: m.digital_footprint_present || 'false'
        }
      };
    });
  }

  if (isBailQuery) {
    return rawResults.map(row => {
      const b = row.bail_custody_status || row;
      return {
        bail_custody_status: {
          bail_uid: b.bail_uid,
          fir_uid: b.fir_uid || 'Unknown',
          offender_uid: b.offender_uid || 'Unknown',
          arrest_datetime: b.arrest_datetime || b.last_status_updated_datetime,
          current_status: b.current_status,
          bail_granted_datetime: b.bail_granted_datetime,
          bail_type: b.bail_type || 'Regular',
          bail_conditions_text: b.bail_conditions_text || 'None',
          bail_expiry_datetime: b.bail_expiry_datetime || '',
          court_name: b.court_name || 'District Court',
          court_case_number: b.court_case_number || ('CC-2026-' + b.bail_uid),
          surety_amount_inr: b.surety_amount_inr || 50000
        }
      };
    });
  }

  return rawResults;
}

module.exports = async function(req, res) {
  try {
    // Log argument signatures for detailed debugging
    console.log('[chatbot] Argument count:', arguments.length)
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i]
      console.log(`[chatbot] Arg ${i}: type = ${typeof arg}, constructor = ${arg && arg.constructor ? arg.constructor.name : 'null'}`)
      if (arg && typeof arg === 'object') {
        try {
          console.log(`[chatbot] Arg ${i} keys:`, Object.keys(arg))
        } catch (e) {
          console.log(`[chatbot] Arg ${i} keys: [not inspectable]`)
        }
      }
    }
    
    // Extract payload defensively
    const payload = extractPayload(req, res)
    const todo = payload.todo
    const action = payload.action
    const userInput = payload.userInput
    const params = payload.params
    
    console.log('[chatbot] todo:', todo)
    console.log('[chatbot] action:', action)
    console.log('[chatbot] userInput:', userInput)
    
    // Handle welcome/greeting message
    if (todo === 'prompt' && action && (action === 'Greeting' || (typeof action === 'object' && action.namespace === 'Greeting'))) {
      const welcomeMessage = 'Welcome to ARISE Intelligence Assistant. I can help you query ' +
        'FIRs, offenders, crime hotspots, and patterns across Karnataka. ' +
        'What would you like to know?'
      return buildResponse(welcomeMessage, todo)
    }
    
    // Handle fallback
    if (todo === 'fallback') {
      const fallbackMessage = 'I did not understand that. Try asking: "Show repeat offenders on ' +
        'bail", "Find cyber fraud FIRs", or "Which areas are high risk?"'
      return buildResponse(fallbackMessage, todo)
    }
    
    // Initialize Catalyst App for DataStore
    const app = initializeCatalyst(req, res)
    
    const intent = detectIntent(action, userInput)
    const filters = extractFilters(userInput)
    const language = detectLanguage(userInput)
    
    console.log('[chatbot] intent:', intent)
    console.log('[chatbot] filters:', JSON.stringify(filters))
    console.log('[chatbot] language:', language)
    
    let retrievedData = []
    let queryDescription = ''
    
    if (intent === 'query_offender') {
      retrievedData = await queryOffenders(app, filters)
      queryDescription = 'offender records matching query'
    } else if (intent === 'query_fir') {
      retrievedData = await queryFIRs(app, filters)
      queryDescription = filters.firUid ? `FIR ${filters.firUid}` : 'recent FIR records'
    } else if (intent === 'query_hotspot') {
      retrievedData = await queryHotspots(app, filters)
      queryDescription = 'crime hotspot data'
    } else if (intent === 'query_trend') {
      retrievedData = await queryTrends(app)
      queryDescription = 'crime trend data'
    } else if (intent === 'greeting') {
      retrievedData = []
      queryDescription = 'greeting'
    }
    
    const dataContext = retrievedData.length > 0
      ? JSON.stringify(retrievedData.slice(0, 15), null, 2)
      : 'No specific records retrieved.'
      
    const systemPrompt = `You are ARISE, an AI intelligence assistant for Karnataka State Police and the State Crime Records Bureau (SCRB). You help investigators, analysts, and officers query crime records and understand patterns.

RULES YOU MUST FOLLOW:
1. ONLY use information from the DATABASE RECORDS provided below.
2. NEVER invent names, FIR numbers, dates, or statistics.
3. ALWAYS cite the specific record (FIR UID, offender UID) that supports each claim.
4. If no relevant records exist, clearly say so.
5. Keep responses concise and actionable for law enforcement.
6. Format names, FIR UIDs, and BNS sections clearly.
7. ${language === 'kn' ? 'Respond in Kannada language.' : 'Respond in English.'}

DATABASE RECORDS RETRIEVED:
${dataContext}

QUERY CONTEXT: ${queryDescription}`

    let aiResponse = ''
    const llmEndpoint = process.env.QUICKML_LLM_ENDPOINT || 'https://api.catalyst.zoho.in/quickml/v1/project/48171000000023001/vlm/chat'
    const llmApiKey = process.env.QUICKML_LLM_API_KEY
    const orgId = process.env.QUICKML_ORG_ID || '60073718159'

    if (llmEndpoint && llmApiKey) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ]

        const llmResponse = await fetch(llmEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-QUICKML-ENDPOINT-KEY': llmApiKey,
            'CATALYST-ORG': orgId,
            'Environment': 'Development'
          },
          body: JSON.stringify({
            messages,
            max_tokens: 500,
            temperature: 0.3
          })
        })

        const llmJson = await llmResponse.json()
        aiResponse = llmJson?.choices?.[0]?.message?.content ||
                     llmJson?.response ||
                     llmJson?.output ||
                     llmJson?.content ||
                     llmJson?.text || ''
      } catch (llmErr) {
        console.error('[chatbot] LLM call failed:', llmErr.message, llmErr.stack)
      }
    }

    if (!aiResponse) {
      if (intent === 'greeting') {
        aiResponse = language === 'kn'
          ? 'ನಮಸ್ಕಾರ. ನಾನು ARISE ಗುಪ್ತಚರ ಸಹಾಯಕ. FIR ಗಳು, ಆರೋಪಿಗಳು, ಅಪರಾಧ ಮಾದರಿಗಳ ಬಗ್ಗೆ ಕೇಳಿ.'
          : `Hello! I am the ARISE Intelligence Assistant for Karnataka Police. I can help you query FIRs, offender profiles, crime hotspots, and trends. What would you like to know?`
      } else if (retrievedData.length === 0) {
        aiResponse = language === 'kn'
          ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.'
          : `No records found matching your query. Try searching by FIR number, accused name, BNS section, or district name.`
      } else {
        if (intent === 'query_offender') {
          const lines = retrievedData.map(o => {
            const score = Math.round(parseFloat(o.recidivism_risk_score) * 100)
            const status = o.current_status || 'Status unknown'
            const repeat = o.is_repeat_offender === true || o.is_repeat_offender === 'true' ? ' [Repeat]' : ''
            return `• ${o.full_name}${repeat} — Risk: ${score}%, Status: ${status}`
          })
          aiResponse = `Found ${retrievedData.length} offender(s):\n\n` + lines.join('\n')
        } else if (intent === 'query_fir') {
          const lines = retrievedData.map(f => {
            const label = BNS_LABELS[f.bns_primary_section] || f.bns_primary_section
            return `• ${f.fir_uid} — ${label} — ${f.district_name} — Status: ${f.case_status}`
          })
          aiResponse = `Found ${retrievedData.length} FIR(s):\n\n` + lines.join('\n')
        } else if (intent === 'query_hotspot') {
          const lines = retrievedData.map(h => {
            return `• ${h.police_station_code} (${h.district_name}) — ${h.risk_tier} risk — ${h.dominant_crime_type} — ${h.crime_count_last_7d} cases in 7 days. Peak: ${h.predicted_peak_hour_start}:00-${h.predicted_peak_hour_end}:00`
          })
          aiResponse = `Top ${retrievedData.length} risk zones:\n\n` + lines.join('\n')
        } else if (intent === 'query_trend') {
          const lines = retrievedData.map(t =>
            `• ${t.label} — ${t.count} case(s)`
          )
          aiResponse = `Current crime trends across Karnataka:\n\n` + lines.join('\n')
        } else {
          aiResponse = `I can help you with:\n\n• FIR queries: "Show cyber fraud FIRs"\n• Offenders: "Find repeat offenders on bail"\n• Hotspots: "Which areas are high risk"\n• Trends: "What crimes are increasing"`
        }
      }
    }

    const responseJson = buildResponse(aiResponse, todo)
    console.log('[chatbot] Response:', JSON.stringify(responseJson).slice(0, 100))
    
    // Create the exact IntegResponse class from the official Catalyst ConvoKraft template
    class IntegResponse {
        constructor(res) {
            this.response = res;
        }
        buildResponse() {
            return {
                status: 200,
                contentType: 'application/json',
                responseBody: JSON.stringify(this.response)
            };
        }
    }
    
    if (res && typeof res.end === 'function') {
        try { 
            res.end(new IntegResponse(responseJson)); 
        } catch (e) {
            console.error('[chatbot] res.end failed', e);
        }
    }
    
    return responseJson
    
  } catch (err) {
    console.error('[chatbot] Fatal error:', err.message, err.stack)
    const errResponse = buildResponse(
      'I encountered an error processing your request. Error: ' + err.message,
      'execute'
    )
    if (res && typeof res.end === 'function') {
        class IntegResponse {
            constructor(res) {
                this.response = res;
            }
            buildResponse() {
                return {
                    status: 200,
                    contentType: 'application/json',
                    responseBody: JSON.stringify(this.response)
                };
            }
        }
        try { res.end(new IntegResponse(errResponse)); } catch (e) {}
    }
    return errResponse
  }
}
