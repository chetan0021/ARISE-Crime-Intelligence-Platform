
// ============================================================================
// OFFENDER INTELLIGENCE ENDPOINTS (Mapped to new Accused table)
// ============================================================================

app.get('/api/offenders/summary/stats', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    
    // We fetch from Accused, ArrestSurrender, modus_operandi_signature
    const [qAccused, qArrest, qMo] = await Promise.all([
      zcql.executeZCQLQuery("SELECT Accused.AccusedMasterID, Accused.GenderID FROM Accused").catch(()=>[]),
      zcql.executeZCQLQuery("SELECT ArrestSurrender.AccusedMasterID, ArrestSurrender.ArrestSurrenderTypeID FROM ArrestSurrender WHERE ArrestSurrender.IsAccused = true").catch(()=>[]),
      zcql.executeZCQLQuery("SELECT modus_operandi_signature.crime_category, modus_operandi_signature.time_of_operation, modus_operandi_signature.accused_id FROM modus_operandi_signature").catch(()=>[])
    ]);

    const accusedRows = qAccused.map(r => r.Accused || r);
    const arrestRows = qArrest.map(r => r.ArrestSurrender || r);
    const moRows = qMo.map(r => r.modus_operandi_signature || r);

    const totalOffenders = accusedRows.length;
    // mock ML stats
    const repeatOffenders = Math.floor(totalOffenders * 0.4);
    const rowdySheeters = Math.floor(totalOffenders * 0.1);
    const criticalRisk = Math.floor(totalOffenders * 0.05);
    const highRisk = Math.floor(totalOffenders * 0.15);

    const onBail = arrestRows.filter(r => r.ArrestSurrenderTypeID === 'BAIL').length;
    const inCustody = arrestRows.filter(r => ['JUDICIAL_CUSTODY', 'POLICE_CUSTODY', 'ARREST'].includes(r.ArrestSurrenderTypeID)).length;
    const absconding = arrestRows.filter(r => r.ArrestSurrenderTypeID === 'ABSCONDING').length;

    const maleCount = accusedRows.filter(a => (a.GenderID || '').toUpperCase().startsWith('M')).length;
    const femaleCount = accusedRows.filter(a => (a.GenderID || '').toUpperCase().startsWith('F')).length;

    const crimeCats = {};
    const timeSlots = {};
    moRows.forEach(mo => {
      if (mo.crime_category) crimeCats[mo.crime_category] = (crimeCats[mo.crime_category] || 0) + 1;
      if (mo.time_of_operation) timeSlots[mo.time_of_operation] = (timeSlots[mo.time_of_operation] || 0) + 1;
    });

    const topCrimeCategories = Object.keys(crimeCats).map(k => ({ category: k, count: crimeCats[k] })).sort((a,b)=>b.count-a.count).slice(0, 5);
    const peakOperationTime = Object.keys(timeSlots).sort((a,b)=>timeSlots[b]-timeSlots[a])[0] || 'Unknown';

    res.status(200).json({
      success: true,
      data: {
        totalOffenders, repeatOffenders, rowdySheeters, criticalRisk, highRisk,
        onBail, inCustody, absconding, genderBreakdown: { M: maleCount, F: femaleCount }, 
        topCrimeCategories, peakOperationTime, stateOriginBreakdown: [{state: 'Karnataka', count: totalOffenders}]
      }
    });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/offenders', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const { status, search } = req.query;

    const [qAccused, qArrest] = await Promise.all([
      zcql.executeZCQLQuery("SELECT Accused.AccusedMasterID, Accused.AccusedName, Accused.AgeYear, Accused.GenderID, Accused.PersonID FROM Accused LIMIT 100").catch(()=>[]),
      zcql.executeZCQLQuery("SELECT ArrestSurrender.AccusedMasterID, ArrestSurrender.ArrestSurrenderTypeID FROM ArrestSurrender WHERE ArrestSurrender.IsAccused = true").catch(()=>[])
    ]);

    const accusedRows = qAccused.map(r => r.Accused || r);
    const arrestRows = qArrest.map(r => r.ArrestSurrender || r);

    const arrestMap = {};
    arrestRows.forEach(a => { arrestMap[a.AccusedMasterID] = a.ArrestSurrenderTypeID; });

    let offenders = accusedRows.map(o => {
      // Mock some ML fields
      const score = Math.random();
      const threatLevel = score >= 0.9 ? 'CRITICAL' : score >= 0.7 ? 'HIGH' : score >= 0.5 ? 'MEDIUM' : 'LOW';
      return {
        offender_uid: o.AccusedMasterID,
        full_name: o.AccusedName,
        age: o.AgeYear,
        gender: o.GenderID,
        threatLevel,
        recidivism_risk_score: score,
        current_status: arrestMap[o.AccusedMasterID] || 'UNKNOWN',
        is_repeat_offender: score > 0.6,
        is_rowdy_sheeter: score > 0.8
      };
    });

    if (search) {
      const s = search.toLowerCase();
      offenders = offenders.filter(o => (o.full_name || '').toLowerCase().includes(s));
    }
    if (status) {
      offenders = offenders.filter(o => o.current_status === status);
    }

    const summary = {
      total: offenders.length,
      repeatOffenders: offenders.filter(o => o.is_repeat_offender).length,
      rowdySheeters: offenders.filter(o => o.is_rowdy_sheeter).length,
      onBail: offenders.filter(o => o.current_status === 'BAIL').length,
      absconding: offenders.filter(o => o.current_status === 'ABSCONDING').length,
      critical: offenders.filter(o => o.recidivism_risk_score >= 0.9).length,
      high: offenders.filter(o => o.recidivism_risk_score >= 0.7).length
    };

    res.status(200).json({ success: true, data: { offenders, summary } });
  } catch(error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/offenders/:uid', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const uid = req.params.uid;

    const [qAccused, qArrest, qMo] = await Promise.all([
      zcql.executeZCQLQuery(\SELECT Accused.AccusedMasterID, Accused.AccusedName, Accused.AgeYear, Accused.GenderID, Accused.PersonID FROM Accused WHERE Accused.AccusedMasterID = \).catch(()=>[]),
      zcql.executeZCQLQuery(\SELECT ArrestSurrender.ArrestSurrenderID, ArrestSurrender.CaseMasterID, ArrestSurrender.ArrestSurrenderDate, ArrestSurrender.ArrestSurrenderTypeID, ArrestSurrender.PoliceStationID FROM ArrestSurrender WHERE ArrestSurrender.AccusedMasterID = \).catch(()=>[]),
      zcql.executeZCQLQuery(\SELECT modus_operandi_signature.case_id, modus_operandi_signature.crime_category, modus_operandi_signature.time_of_operation, modus_operandi_signature.instrument_used, modus_operandi_signature.mo_narrative_text FROM modus_operandi_signature WHERE modus_operandi_signature.accused_id = \).catch(()=>[])
    ]);

    const accused = qAccused.length > 0 ? (qAccused[0].Accused || qAccused[0]) : null;
    if (!accused) return res.status(404).json({ success: false, error: 'Offender not found' });

    const arrestRows = qArrest.map(r => r.ArrestSurrender || r);
    const moRows = qMo.map(r => r.modus_operandi_signature || r);

    // Fetch cases associated with this offender (either via ArrestSurrender or MO)
    const caseIds = new Set([
      ...arrestRows.map(a => a.CaseMasterID).filter(Boolean),
      ...moRows.map(m => m.case_id).filter(Boolean)
    ]);
    
    let firRows = [];
    if (caseIds.size > 0) {
      const caseIdList = Array.from(caseIds).join(',');
      const qCases = await zcql.executeZCQLQuery(\SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.CrimeRegisteredDate, CaseMaster.BriefFacts, CaseMaster.latitude, CaseMaster.longitude FROM CaseMaster WHERE CaseMaster.CaseMasterID IN (\)\).catch(()=>[]);
      firRows = qCases.map(r => r.CaseMaster || r);
    }

    const cases = moRows.map(mo => {
      const fir = firRows.find(f => f.CaseMasterID == mo.case_id) || {};
      return { 
        ...mo, 
        fir_uid: fir.CrimeNo || mo.case_id,
        fir_registration_datetime: fir.CrimeRegisteredDate,
        incident_latitude: fir.latitude,
        incident_longitude: fir.longitude
      };
    });

    const custody = arrestRows.map(a => ({
      current_status: a.ArrestSurrenderTypeID,
      arrest_datetime: a.ArrestSurrenderDate,
      fir_uid: a.CaseMasterID
    }));

    const profile = {
      offender_uid: accused.AccusedMasterID,
      full_name: accused.AccusedName,
      age: accused.AgeYear,
      gender: accused.GenderID,
      recidivism_risk_score: 0.85
    };

    res.status(200).json({
      success: true,
      data: {
        profile, cases, custody,
        behavioralProfile: { operationalPattern: 'Data inferred from new schema' },
        escalationPattern: { escalating: false },
        crossJurisdictionCount: 1
      }
    });
  } catch(error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/offenders/:uid/analyze-photo', async (req, res) => {
  res.json({ success: true, data: { faceAnalysis: { faceCount: 0 }, profileComparison: { verificationStatus: 'UNVERIFIABLE' } } });
});

// ============================================================================
// NETWORK GRAPH ENDPOINTS
// ============================================================================

app.get('/api/network-graph', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    
    // We query entity_association_graph, CaseMaster, Accused
    const qEdges = "SELECT entity_association_graph.source_entity_type, entity_association_graph.source_entity_id_ref, entity_association_graph.target_entity_type, entity_association_graph.target_entity_id_ref, entity_association_graph.relationship_type, entity_association_graph.relationship_strength, entity_association_graph.case_context_id FROM entity_association_graph LIMIT 100";
    const qAccused = "SELECT Accused.AccusedMasterID, Accused.AccusedName FROM Accused LIMIT 200";
    const qCases = "SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo FROM CaseMaster LIMIT 200";
    
    const [resEdges, resAccused, resCases] = await Promise.all([
      zcql.executeZCQLQuery(qEdges).catch(()=>[]),
      zcql.executeZCQLQuery(qAccused).catch(()=>[]),
      zcql.executeZCQLQuery(qCases).catch(()=>[])
    ]);

    const accMap = {};
    resAccused.forEach(r => { if(r.Accused) accMap[r.Accused.AccusedMasterID] = r.Accused.AccusedName; });
    
    const caseMap = {};
    resCases.forEach(r => { if(r.CaseMaster) caseMap[r.CaseMaster.CaseMasterID] = r.CaseMaster.CrimeNo; });

    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    resEdges.forEach(r => {
      const e = r.entity_association_graph || r;
      const sId = e.source_entity_id_ref;
      const tId = e.target_entity_id_ref;
      const sType = e.source_entity_type;
      const tType = e.target_entity_type;
      
      if (!sId || !tId) return;

      let sLabel = sId;
      if (sType === 'OFFENDER') sLabel = accMap[sId] || \Offender \;
      
      let tLabel = tId;
      if (tType === 'OFFENDER') tLabel = accMap[tId] || \Offender \;
      if (tType === 'INCIDENT') tLabel = caseMap[tId] || \Case \;
      
      const sNodeId = \_\;
      const tNodeId = \_\;

      if (!nodeSet.has(sNodeId)) {
        nodes.push({ id: sNodeId, label: sLabel, type: sType });
        nodeSet.add(sNodeId);
      }
      if (!nodeSet.has(tNodeId)) {
        nodes.push({ id: tNodeId, label: tLabel, type: tType });
        nodeSet.add(tNodeId);
      }

      edges.push({
        source: sNodeId,
        target: tNodeId,
        relationship: e.relationship_type,
        strength: parseFloat(e.relationship_strength) || 0.5,
        context: caseMap[e.case_context_id]
      });
    });

    res.status(200).json({ success: true, data: { nodes, edges } });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/network-graph/offender/:uid', async (req, res) => {
  res.status(200).json({ success: true, data: { nodes: [], edges: [] } });
});

// ============================================================================
// PREDICTIONS ENDPOINTS
// ============================================================================
app.get('/api/predict/early-warning', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const result = await zcql.executeZCQLQuery("SELECT geospatial_hotspot_indicator.district_id, geospatial_hotspot_indicator.predicted_peak_hour_start, geospatial_hotspot_indicator.predicted_peak_hour_end FROM geospatial_hotspot_indicator WHERE geospatial_hotspot_indicator.composite_risk_score > 70 LIMIT 10").catch(()=>[]);
    
    res.json({
      success: true,
      data: {
        criticalAlerts: result.length,
        emergingThreats: 2,
        activeDeployments: 5,
        nextPeakHour: '18:00',
        alerts: [
          {
            id: 'WARN-001', severity: 'CRITICAL', title: 'High Risk Cluster Detected',
            message: 'Concentrated night-time activity in commercial zone', time: '18:00-22:00',
            location: 'Bengaluru Urban', recommendedAction: 'Deploy QRT'
          }
        ]
      }
    });
  } catch(e) { res.status(500).json({success:false, error:e.message}); }
});

app.get('/api/predict/risk-leaderboard', async (req, res) => { res.json({ success: true, data: [] }); });
app.get('/api/predict/forecast', async (req, res) => { res.json({ success: true, data: [] }); });
app.get('/api/predict/anomalies', async (req, res) => { res.json({ success: true, data: [] }); });
app.post('/api/predict/quickml-score', async (req, res) => { res.json({ success: true, data: {} }); });

// ============================================================================
// SOCIO-ECONOMIC ENDPOINTS
// ============================================================================
app.get('/api/socio/district/:name', async (req, res) => {
  res.json({ success: true, data: { population: 13193000, vulnerabilityScore: 0.42, crimeProfile: "High-value digital targets.", riskFactors: ["High migration", "Digital fraud"] } });
});
app.get('/api/socio/correlations', async (req, res) => {
  res.json({ success: true, data: { factors: [] } });
});

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================
app.get('/api/search', async (req, res) => { res.json({ success: true, data: { results: [], total: 0 } }); });
app.get('/api/search/suggestions', async (req, res) => { res.json({ success: true, data: { suggestions: [] } }); });

// ============================================================================
// FINANCIAL CRIME ENDPOINTS (Mocked due to ON-HOLD table)
// ============================================================================
app.get('/api/financial/overview', async (req, res) => {
  res.json({
    success: true,
    data: { totalSeized: 4500000, frozenAccounts: 18, cryptoWallets: 4, activeInvestigations: 12 }
  });
});
app.get('/api/financial/token/:uid', async (req, res) => {
  res.json({ success: true, data: { nodes: [{id: req.params.uid, type:'BANK_ACCOUNT', label: req.params.uid}], edges: [] } });
});
app.get('/api/financial/money-trail/:uid', async (req, res) => {
  res.json({ success: true, data: { nodes: [], edges: [] } });
});

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================
app.post('/api/reports/generate', async (req, res) => {
  res.json({ success: true, url: '/dummy.pdf' });
});
app.get('/api/reports/audit-trail/:firUid', async (req, res) => {
  res.json({ success: true, data: [] });
});
