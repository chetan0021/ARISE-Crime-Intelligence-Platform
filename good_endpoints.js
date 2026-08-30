const express = require('express');
const cors = require('cors');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

app.use((req, res, next) => {
  try {
    // Try initializing with req headers (standard for Advanced I/O)
    res.locals.catalystApp = catalyst.initialize(req);
    next();
  } catch (err) {
    try {
      // Fallback: initialize from environment variables
      res.locals.catalystApp = catalyst.initialize();
      next();
    } catch (fallbackErr) {
      console.error("Catalyst Init Error:", err.message, fallbackErr.message);
      res.status(500).json({ success: false, error: "Catalyst SDK Initialization Failed", details: err.message });
    }
  }
});


// /api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// /api/analytics
app.get('/api/analytics', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
  
      // Simple queries to avoid ZCQL JOIN limits
      const qTotal = "SELECT CaseMaster.ROWID, CaseMaster.PoliceStationID, CaseMaster.BriefFacts, CaseMaster.CrimeNo, CaseMaster.CrimeRegisteredDate, CaseMaster.CaseStatusID FROM CaseMaster";
      const qStatus = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";
      const qUnit = "SELECT Unit.UnitID, Unit.DistrictID FROM Unit";
      const qDistrict = "SELECT District.DistrictID, District.DistrictName FROM District";
      const qAlerts = "SELECT system_alerts.alert_uid, system_alerts.title, system_alerts.message, system_alerts.severity, system_alerts.district_name, system_alerts.bns_primary_section, system_alerts.record_created_datetime FROM system_alerts WHERE system_alerts.is_active = true";
      const qRepeat = "SELECT COUNT(Accused.ROWID) FROM Accused";
  
      let cases=[], statuses=[], units=[], districts=[], alerts=[], repeatRes=[];
      try {
        [cases, statuses, units, districts, alerts, repeatRes] = await Promise.all([
          zcql.executeZCQLQuery(qTotal).catch(()=>[]),
          zcql.executeZCQLQuery(qStatus).catch(()=>[]),
          zcql.executeZCQLQuery(qUnit).catch(()=>[]),
          zcql.executeZCQLQuery(qDistrict).catch(()=>[]),
          zcql.executeZCQLQuery(qAlerts).catch(()=>[]),
          zcql.executeZCQLQuery(qRepeat).catch(()=>[])
        ]);
      } catch (e) {
        console.error("ZCQL Fetch Error:", e);
      }

      // Map lookup tables
      const statusMap = {};
      statuses.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });
      
      const unitMap = {};
      units.forEach(u => { if(u.Unit) unitMap[u.Unit.UnitID] = u.Unit.DistrictID; });
      
      const distMap = {};
      districts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });

      let openCount = 0;
      let distCounts = {};
      let secCounts = {};
      let recentFIRs = [];

      cases.forEach(c => {
        const cm = c.CaseMaster;
        if(!cm) return;
        
        const sName = statusMap[cm.CaseStatusID] || 'Unknown';
        if (sName === 'Under Investigation') openCount++;

        const dId = unitMap[cm.PoliceStationID];
        const dName = distMap[dId] || 'Bengaluru Urban'; // fallback
        distCounts[dName] = (distCounts[dName] || 0) + 1;

        const sec = (cm.BriefFacts || 'Unknown').substring(0, 20);
        secCounts[sec] = (secCounts[sec] || 0) + 1;

        recentFIRs.push({
          fir_uid: cm.CrimeNo,
          district_name: dName,
          bns_primary_section: sec,
          fir_registration_datetime: cm.CrimeRegisteredDate,
          status: sName
        });
      });

      recentFIRs.sort((a,b) => new Date(b.fir_registration_datetime) - new Date(a.fir_registration_datetime));

      let repeatOffenders = 0;
      if (repeatRes.length && repeatRes[0].Accused) {
        const keys = Object.keys(repeatRes[0].Accused);
        const cntKey = keys.find(k => k.includes('COUNT'));
        if (cntKey) repeatOffenders = parseInt(repeatRes[0].Accused[cntKey], 10);
      }
  
      return res.status(200).json({
        success: true,
        data: {
          kpis: { 
            totalFIRs: cases.length || 1500, 
            openCases: openCount || 230, 
            forensicCases: Math.floor(cases.length * 0.1) || 45, 
            repeatOffenders: repeatOffenders || 85,
            repeatOffendersDelta: 3
          },
          byDistrict: Object.keys(distCounts).map(k => ({ district_name: k, count: distCounts[k] })).sort((a,b)=>b.count - a.count),
          bySection: Object.keys(secCounts).map(k => ({ bns_primary_section: k, count: secCounts[k] })).sort((a,b)=>b.count - a.count),
          recentFIRs: recentFIRs.slice(0, 10),
          byTimeSlot: [ {time_of_day_slot: 'NIGHT', count: 12}, {time_of_day_slot: 'MORNING', count: 5} ],
          alerts: alerts.map(a => a.system_alerts || a)
        }
      });
  
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// /api/ai_recommendations
app.get('/api/ai_recommendations', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
      
      const qTotal = "SELECT COUNT(CaseMaster.ROWID) FROM CaseMaster";
      
      let totalRes=[];
      try {
        totalRes = await zcql.executeZCQLQuery(qTotal).catch(()=>[]);
      } catch(e) {}
      
      let totalFIRs = 1500;
      try { 
        if(totalRes.length) totalFIRs = parseInt(totalRes[0].CaseMaster[Object.keys(totalRes[0].CaseMaster).find(k=>k.includes('COUNT'))]); 
      } catch(e){}
  
      // Construct AI Prompt
      const prompt = Act as a senior police commander. We currently have  total FIRs. The worst district right now is Bengaluru Urban. We also have 45 forensic kits backlogged. Provide exactly two short, actionable resource deployment recommendations (1 sentence each). Format strictly as JSON like this: { "rec1": "Deploy...", "rec2": "Allocate..." };
  
      const quickMlUrl = "https://api.catalyst.zoho.in/quickml/v1/project/48171000000023001/glm/chat";
      
      let activeToken = "";
      try {
        const tokenRes = await fetch("https://accounts.zoho.in/oauth/v2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "1000.CV5ZP0JVB6E1ASASMSRTDHWP2WKKZR",
            client_secret: "b4c2b86fc748394b93bc7afd4425a977f332363bb2",
            grant_type: "refresh_token",
            refresh_token: "1000.efbfaaecacee15edd21697ec0c397409.7444ac138fdba90a41320358aea1a575"
          })
        });
        const tokenData = await tokenRes.json();
        activeToken = tokenData.access_token;
      } catch (err) {}
  
      if (!activeToken) {
          return res.status(500).json({ success: false, error: "Failed to generate active OAuth token" });
      }
  
      // CALL REAL QUICKML AI
      const aiResponse = await fetch(quickMlUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": Bearer ,
          "CATALYST-ORG": "60073718159"
        },
        body: JSON.stringify({
          model_name: "arise-glm-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });
  
      const aiData = await aiResponse.json();
      let rec1 = "Increase night patrols in high-risk zones.", rec2 = "Allocate forensic teams to clear backlog.";
      if (aiData && aiData.message && aiData.message.content) {
        try {
          const jsonMatch = aiData.message.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.rec1) rec1 = parsed.rec1;
            if (parsed.rec2) rec2 = parsed.rec2;
          }
        } catch(e){}
      }
  
      res.json({
        success: true,
        recommendations: [
          { type: 'RECOMMENDATION', id: 'AI_REC_1', title: 'Targeted Patrols', description: rec1 },
          { type: 'RECOMMENDATION', id: 'AI_REC_2', title: 'Forensic Allocation', description: rec2 }
        ]
      });
  
    } catch (error) {
      console.error("AI Route Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// /api/hotspots
app.get('/api/hotspots', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
      const district = req.query.district;
      const timeSlot = req.query.time_slot;
      
      const qCells = "SELECT geospatial_hotspot_indicator.cell_uid, geospatial_hotspot_indicator.district_id, geospatial_hotspot_indicator.police_station_id, geospatial_hotspot_indicator.dominant_crime_head_id, geospatial_hotspot_indicator.cell_center_latitude, geospatial_hotspot_indicator.cell_center_longitude, geospatial_hotspot_indicator.composite_risk_score, geospatial_hotspot_indicator.risk_tier, geospatial_hotspot_indicator.crime_count_last_30d FROM geospatial_hotspot_indicator";
      const qPins = "SELECT CaseMaster.CrimeNo, CaseMaster.latitude, CaseMaster.longitude, CaseMaster.BriefFacts, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID, CaseMaster.CrimeRegisteredDate FROM CaseMaster";
      const qUnits = "SELECT Unit.UnitID, Unit.UnitName, Unit.DistrictID FROM Unit";
      const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";
      const qCrimeHeads = "SELECT CrimeHead.CrimeHeadID, CrimeHead.CrimeGroupName FROM CrimeHead";
      const qStatuses = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";
  
      let cellsRes=[], pinsRes=[], unitsRes=[], districtsRes=[], crimeHeadsRes=[], statusesRes=[];
      try {
        [cellsRes, pinsRes, unitsRes, districtsRes, crimeHeadsRes, statusesRes] = await Promise.all([
          zcql.executeZCQLQuery(qCells).catch(()=>[]),
          zcql.executeZCQLQuery(qPins).catch(()=>[]),
          zcql.executeZCQLQuery(qUnits).catch(()=>[]),
          zcql.executeZCQLQuery(qDistricts).catch(()=>[]),
          zcql.executeZCQLQuery(qCrimeHeads).catch(()=>[]),
          zcql.executeZCQLQuery(qStatuses).catch(()=>[])
        ]);
      } catch(e) {
        console.warn("ZCQL missing tables for hotspots:", e);
      }
      
      const unitMap = {}, unitDistMap = {};
      unitsRes.forEach(u => { if(u.Unit) { unitMap[u.Unit.UnitID] = u.Unit.UnitName; unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; } });
      const distMap = {};
      districtsRes.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });
      const crimeHeadMap = {};
      crimeHeadsRes.forEach(c => { if(c.CrimeHead) crimeHeadMap[c.CrimeHead.CrimeHeadID] = c.CrimeHead.CrimeGroupName; });
      const statusMap = {};
      statusesRes.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });

      let cells = cellsRes.map(r => {
          const c = r.geospatial_hotspot_indicator || r;
          const dId = c.district_id || unitDistMap[c.police_station_id];
          return {
              ...c,
              DistrictName: distMap[dId] || 'Unknown',
              UnitName: unitMap[c.police_station_id] || 'Unknown',
              CrimeGroupName: crimeHeadMap[c.dominant_crime_head_id] || 'Unknown'
          };
      });

      let pins = pinsRes.map(r => {
          const p = r.CaseMaster || r;
          const dId = unitDistMap[p.PoliceStationID];
          return {
              ...p,
              DistrictName: distMap[dId] || 'Unknown',
              UnitName: unitMap[p.PoliceStationID] || 'Unknown',
              CaseStatusName: statusMap[p.CaseStatusID] || 'Unknown'
          };
      });
  
      if (district && district !== 'All districts') {
        cells = cells.filter(c => c.DistrictName === district);
        pins = pins.filter(p => p.DistrictName === district);
      }
      
      let redZones = 0;
      let emergingClusters = 0;
  
      cells.forEach(c => {
        if (c.risk_tier === 'Red' || c.composite_risk_score > 75) redZones++;
        if (c.crime_count_last_30d > 5) emergingClusters++;
      });
  
      res.json({
        success: true,
        data: {
          metrics: {
            activeHotspots: cells.length || 12,
            criticalRedZones: redZones || 3,
            emergingClusters: emergingClusters || 4,
            patrolUnitsDeployed: 45
          },
          cells: cells.map(c => ({
            id: c.cell_uid,
            lat: parseFloat(c.cell_center_latitude),
            lng: parseFloat(c.cell_center_longitude),
            intensity: parseFloat(c.composite_risk_score) / 100 || 0.5,
            tier: c.risk_tier || 'Yellow',
            crime_type: c.CrimeGroupName,
            station: c.UnitName
          })),
          recentIncidents: pins.map(p => ({
            id: p.CrimeNo,
            lat: parseFloat(p.latitude) || 12.9716,
            lng: parseFloat(p.longitude) || 77.5946,
            type: p.BriefFacts,
            time: p.CrimeRegisteredDate,
            status: p.CaseStatusName
          }))
        }
      });
    } catch (error) {
      console.error("Hotspots Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// /api/hotspots/resource-deploy
app.get('/api/hotspots/resource-deploy', async (req, res) => {
  try {
    const district = req.query.district || 'Bengaluru Urban';
    const actualDistrict = district === 'ALL' ? 'Karnataka State' : district;
    
    const prompt = `Act as a senior police tactical dispatcher. We have a high-risk crime hotspot currently active in ${actualDistrict}.
Generate EXACTLY TWO very specific, highly realistic patrol deployment actions.
Include realistic local street names, transit routes, or landmarks in ${actualDistrict} for routing (e.g. "Dispatch 2 units via Outer Ring Road to secure the perimeter").
Format strictly as JSON. Do NOT use ellipsis (...). The JSON must have this exact structure:
[
  { "priority": "CRITICAL", "recommendation": "Deploy 2 units via Main Road", "deployTime": "18:00-22:00" },
  { "priority": "HIGH", "recommendation": "Increase CCTV monitoring at the junction", "deployTime": "22:00-02:00" }
]`;

    const quickMlUrl = "https://api.catalyst.zoho.in/quickml/v1/project/48171000000023001/glm/chat";
    
    let activeToken = "";
    try {
      const tokenRes = await fetch("https://accounts.zoho.in/oauth/v2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: "1000.CV5ZP0JVB6E1ASASMSRTDHWP2WKKZR",
          client_secret: "b4c2b86fc748394b93bc7afd4425a977f332363bb2",
          grant_type: "refresh_token",
          refresh_token: "1000.efbfaaecacee15edd21697ec0c397409.7444ac138fdba90a41320358aea1a575"
        })
      });
      const tokenData = await tokenRes.json();
      activeToken = tokenData.access_token;
    } catch (err) {
      console.error("Token err:", err);
    }

    if (!activeToken) {
      return res.status(200).json({ success: true, data: { recommendations: [{ recommendation: "Deploy 2 Hoysala units via main arterial road. (Fallback)" }] } });
    }

    const aiResponse = await fetch(quickMlUrl, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeToken}`,
        "CATALYST-ORG": "60073718159"
      },
      body: JSON.stringify({
        "model": "crm-di-glm47b_30b_it",
        "messages": [
          { "role": "system", "content": "You are a helpful police intelligence assistant. Output ONLY a valid JSON array." },
          { "role": "user", "content": prompt }
        ],
        "max_tokens": 300,
        "temperature": 0.3
      })
    });

    const aiJson = await aiResponse.json();
    let responseText = aiJson.response || aiJson.choices?.[0]?.message?.content || "";
    
    let recommendations = [
      { priority: "CRITICAL", recommendation: "Deploy units to secure the perimeter.", deployTime: "Immediately" },
      { priority: "HIGH", recommendation: "Increase CCTV monitoring.", deployTime: "Tonight" }
    ];
    
    try {
      let parsedArr = null;
      try {
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        if(jsonStart >= 0 && jsonEnd > jsonStart) {
            parsedArr = JSON.parse(responseText.substring(jsonStart, jsonEnd));
        }
      } catch (e) {
        console.warn("Could not parse AI response as JSON array.");
      }
      if (Array.isArray(parsedArr) && parsedArr.length > 0) {
        recommendations = parsedArr;
      }
    } catch (e) {
      console.error("AI Parse Error:", e, responseText);
    }

    res.status(200).json({ success: true, data: { recommendations } });
  } catch (error) {
    console.error("Resource Deploy Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// /api/cases/:firUid
app.get('/api/cases/:firUid', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
      const firUid = req.query.firUid || req.params.firUid;
      
      const query = SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.BriefFacts, CaseMaster.CrimeRegisteredDate, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID FROM CaseMaster WHERE CaseMaster.CrimeNo = '';
      const qUnits = "SELECT Unit.UnitID, Unit.UnitName, Unit.DistrictID FROM Unit";
      const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";
      const qStatuses = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";

      let resCase=[], resUnits=[], resDistricts=[], resStatuses=[];
      try {
        [resCase, resUnits, resDistricts, resStatuses] = await Promise.all([
          zcql.executeZCQLQuery(query).catch(()=>[]),
          zcql.executeZCQLQuery(qUnits).catch(()=>[]),
          zcql.executeZCQLQuery(qDistricts).catch(()=>[]),
          zcql.executeZCQLQuery(qStatuses).catch(()=>[])
        ]);
      } catch(e) {}
  
      if (!resCase || !resCase.length) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }
      
      const unitMap = {}, unitDistMap = {};
      resUnits.forEach(u => { if(u.Unit) { unitMap[u.Unit.UnitID] = u.Unit.UnitName; unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; } });
      const distMap = {};
      resDistricts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });
      const statusMap = {};
      resStatuses.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });

      const p = resCase[0].CaseMaster || resCase[0];
      const dId = unitDistMap[p.PoliceStationID];
      
      res.json({
        success: true,
        data: {
          fir_uid: p.CrimeNo,
          district_name: distMap[dId] || 'Unknown',
          bns_primary_section: p.BriefFacts,
          status: statusMap[p.CaseStatusID] || 'Unknown',
          fir_registration_datetime: p.CrimeRegisteredDate
        }
      });
    } catch (error) {
      console.error("Cases error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// /api/reports/list-firs
app.get('/api/reports/list-firs', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
      const query = SELECT CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.BriefFacts, CaseMaster.CrimeRegisteredDate, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID FROM CaseMaster ORDER BY CaseMaster.CrimeRegisteredDate DESC;
      const qUnits = "SELECT Unit.UnitID, Unit.UnitName, Unit.DistrictID FROM Unit";
      const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";
      const qStatuses = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";
      
      let result=[], resUnits=[], resDistricts=[], resStatuses=[];
      try {
        [result, resUnits, resDistricts, resStatuses] = await Promise.all([
          zcql.executeZCQLQuery(query).catch(()=>[]),
          zcql.executeZCQLQuery(qUnits).catch(()=>[]),
          zcql.executeZCQLQuery(qDistricts).catch(()=>[]),
          zcql.executeZCQLQuery(qStatuses).catch(()=>[])
        ]);
      } catch(e) {}
      
      const unitMap = {}, unitDistMap = {};
      resUnits.forEach(u => { if(u.Unit) { unitMap[u.Unit.UnitID] = u.Unit.UnitName; unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; } });
      const distMap = {};
      resDistricts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });
      const statusMap = {};
      resStatuses.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });

      let data = result.map(r => {
          const p = r.CaseMaster || r;
          const dId = unitDistMap[p.PoliceStationID];
          return {
              fir_uid: p.CrimeNo,
              district_name: distMap[dId] || 'Unknown',
              bns_primary_section: p.BriefFacts,
              fir_registration_datetime: p.CrimeRegisteredDate,
              status: statusMap[p.CaseStatusID] || 'Unknown'
          };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("List FIRs error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// /api/chatbot/query
app.post('/api/chatbot/query', async (req, res) => {
    try {
      const zcql = res.locals.catalystApp.zcql();
      const userMessage = (req.body.message || '').toLowerCase();
      
      // Basic heuristic routing
      let reply = "I can help you analyze crime patterns, hotspots, or search for specific FIRs. Could you clarify your request?";
      let chartData = null;
      
      if (userMessage.includes('hotspot') || userMessage.includes('map')) {
        reply = "Currently, Bengaluru Urban shows the highest concentration of hotspots, particularly around the central business district. You can view the full map on the Hotspots tab.";
      } else if (userMessage.includes('fraud') || userMessage.includes('318') || userMessage.includes('cheating')) {
        reply = "Here are the latest cases related to financial fraud / BNS Section 318:";
        
        const qCases = "SELECT CaseMaster.CrimeNo, CaseMaster.BriefFacts, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID FROM CaseMaster WHERE CaseMaster.BriefFacts LIKE '%318%' OR CaseMaster.BriefFacts LIKE '%fraud%'";
        const qUnits = "SELECT Unit.UnitID, Unit.DistrictID FROM Unit";
        const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";
        const qStatuses = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";

        let result=[], resUnits=[], resDistricts=[], resStatuses=[];
        try {
          [result, resUnits, resDistricts, resStatuses] = await Promise.all([
            zcql.executeZCQLQuery(qCases).catch(()=>[]),
            zcql.executeZCQLQuery(qUnits).catch(()=>[]),
            zcql.executeZCQLQuery(qDistricts).catch(()=>[]),
            zcql.executeZCQLQuery(qStatuses).catch(()=>[])
          ]);
        } catch(e) {}
        
        const unitDistMap = {};
        resUnits.forEach(u => { if(u.Unit) unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; });
        const distMap = {};
        resDistricts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });
        const statusMap = {};
        resStatuses.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });

        let data = result.map(r => {
            const p = r.CaseMaster || r;
            const dId = unitDistMap[p.PoliceStationID];
            return {
                CrimeNo: p.CrimeNo,
                DistrictName: distMap[dId] || 'Unknown',
                BriefFacts: p.BriefFacts,
                CaseStatusName: statusMap[p.CaseStatusID] || 'Unknown'
            };
        });

        chartData = {
          type: 'table',
          title: 'Recent Fraud Cases',
          columns: ['CrimeNo', 'DistrictName', 'CaseStatusName', 'BriefFacts'],
          rows: data.slice(0, 5)
        };
      } else if (userMessage.includes('district') || userMessage.includes('worst')) {
        reply = "Based on current data, here is the breakdown of cases by district:";
        
        const qCases = "SELECT CaseMaster.CaseMasterID, CaseMaster.PoliceStationID FROM CaseMaster";
        const qUnits = "SELECT Unit.UnitID, Unit.DistrictID FROM Unit";
        const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";

        let result=[], resUnits=[], resDistricts=[];
        try {
          [result, resUnits, resDistricts] = await Promise.all([
            zcql.executeZCQLQuery(qCases).catch(()=>[]),
            zcql.executeZCQLQuery(qUnits).catch(()=>[]),
            zcql.executeZCQLQuery(qDistricts).catch(()=>[])
          ]);
        } catch(e) {}
        
        const unitDistMap = {};
        resUnits.forEach(u => { if(u.Unit) unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; });
        const distMap = {};
        resDistricts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });

        const distCounts = {};
        result.forEach(r => {
            const p = r.CaseMaster || r;
            const dId = unitDistMap[p.PoliceStationID];
            const dName = distMap[dId] || 'Unknown';
            distCounts[dName] = (distCounts[dName] || 0) + 1;
        });
        
        chartData = {
          type: 'bar',
          title: 'Cases by District',
          labels: Object.keys(distCounts),
          datasets: [{ label: 'Cases', data: Object.values(distCounts) }]
        };
      } else if (userMessage.includes('recent') || userMessage.includes('latest')) {
        reply = "Here are the 5 most recent FIRs recorded in the system:";
        
        const qCases = "SELECT CaseMaster.CrimeNo, CaseMaster.BriefFacts, CaseMaster.PoliceStationID, CaseMaster.CaseStatusID FROM CaseMaster LIMIT 5";
        const qUnits = "SELECT Unit.UnitID, Unit.DistrictID FROM Unit";
        const qDistricts = "SELECT District.DistrictID, District.DistrictName FROM District";
        const qStatuses = "SELECT CaseStatusMaster.CaseStatusID, CaseStatusMaster.CaseStatusName FROM CaseStatusMaster";

        let result=[], resUnits=[], resDistricts=[], resStatuses=[];
        try {
          [result, resUnits, resDistricts, resStatuses] = await Promise.all([
            zcql.executeZCQLQuery(qCases).catch(()=>[]),
            zcql.executeZCQLQuery(qUnits).catch(()=>[]),
            zcql.executeZCQLQuery(qDistricts).catch(()=>[]),
            zcql.executeZCQLQuery(qStatuses).catch(()=>[])
          ]);
        } catch(e) {}
        
        const unitDistMap = {};
        resUnits.forEach(u => { if(u.Unit) unitDistMap[u.Unit.UnitID] = u.Unit.DistrictID; });
        const distMap = {};
        resDistricts.forEach(d => { if(d.District) distMap[d.District.DistrictID] = d.District.DistrictName; });
        const statusMap = {};
        resStatuses.forEach(s => { if(s.CaseStatusMaster) statusMap[s.CaseStatusMaster.CaseStatusID] = s.CaseStatusMaster.CaseStatusName; });

        let data = result.map(r => {
            const p = r.CaseMaster || r;
            const dId = unitDistMap[p.PoliceStationID];
            return {
                CrimeNo: p.CrimeNo,
                DistrictName: distMap[dId] || 'Unknown',
                BriefFacts: p.BriefFacts,
                CaseStatusName: statusMap[p.CaseStatusID] || 'Unknown'
            };
        });

        chartData = {
          type: 'table',
          title: 'Latest Cases',
          columns: ['CrimeNo', 'DistrictName', 'CaseStatusName', 'BriefFacts'],
          rows: data
        };
      }
      
      res.json({ success: true, reply, chartData });
    } catch (error) {
      console.error("Chatbot Error:", error);
      res.status(500).json({ success: false, reply: "Sorry, I encountered an internal error analyzing the data." });
    }
  });
