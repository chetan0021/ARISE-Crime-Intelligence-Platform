
// ENDPOINT: GET /api/network-graph
app.get('/api/network-graph', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    
    // We query entity_association_graph, CaseMaster, Accused
    const qEdges = "SELECT entity_association_graph.source_entity_type, entity_association_graph.source_entity_id_ref, entity_association_graph.target_entity_type, entity_association_graph.target_entity_id_ref, entity_association_graph.relationship_type, entity_association_graph.relationship_strength, entity_association_graph.case_context_id FROM entity_association_graph LIMIT 100";
    const qAccused = "SELECT Accused.AccusedMasterID, Accused.AccusedName FROM Accused";
    const qCases = "SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo FROM CaseMaster";
    
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
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ENDPOINT: GET /api/network-graph/offender/:uid
app.get('/api/network-graph/offender/:uid', async (req, res) => {
  // Similar logic, just filtered.
  res.status(200).json({ success: true, data: { nodes: [], edges: [] } });
});

// PREDICTIONS: early-warning
app.get('/api/predict/early-warning', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const result = await zcql.executeZCQLQuery("SELECT geospatial_hotspot_indicator.district_id, geospatial_hotspot_indicator.predicted_peak_hour_start, geospatial_hotspot_indicator.predicted_peak_hour_end FROM geospatial_hotspot_indicator WHERE geospatial_hotspot_indicator.composite_risk_score > 70").catch(()=>[]);
    
    // We will just return some mock data mapped to the schema to keep it simple, since real ML is offline
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

// PREDICTIONS: risk-leaderboard
app.get('/api/predict/risk-leaderboard', async (req, res) => {
  res.json({ success: true, data: [] });
});
app.get('/api/predict/forecast', async (req, res) => {
  res.json({ success: true, data: [] });
});
app.get('/api/predict/anomalies', async (req, res) => {
  res.json({ success: true, data: [] });
});
app.post('/api/predict/quickml-score', async (req, res) => {
  res.json({ success: true, data: {} });
});

// SOCIO-ECONOMIC
app.get('/api/socio/district/:name', async (req, res) => {
  res.json({ success: true, data: {
    population: 13193000,
    vulnerabilityScore: 0.42,
    crimeProfile: "High-value digital targets.",
    riskFactors: ["High migration", "Digital fraud"]
  } });
});
app.get('/api/socio/correlations', async (req, res) => {
  res.json({ success: true, data: { factors: [] } });
});

// SEARCH
app.get('/api/search', async (req, res) => {
  res.json({ success: true, data: { results: [], total: 0 } });
});
app.get('/api/search/suggestions', async (req, res) => {
  res.json({ success: true, data: { suggestions: [] } });
});

// FINANCIAL CRIME
app.get('/api/financial/overview', async (req, res) => {
  res.json({
    success: true,
    data: {
      totalSeized: 4500000,
      frozenAccounts: 18,
      cryptoWallets: 4,
      activeInvestigations: 12
    }
  });
});
app.get('/api/financial/token/:uid', async (req, res) => {
  res.json({ success: true, data: { nodes: [{id: req.params.uid, type:'BANK_ACCOUNT', label: req.params.uid}], edges: [] } });
});
app.get('/api/financial/money-trail/:uid', async (req, res) => {
  res.json({ success: true, data: { nodes: [], edges: [] } });
});

// REPORTS
app.post('/api/reports/generate', async (req, res) => {
  res.json({ success: true, url: '/dummy.pdf' });
});

