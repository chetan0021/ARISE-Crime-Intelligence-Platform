const fs = require('fs');
let code = fs.readFileSync('functions/get_crime_analytics/index.js', 'utf8');

// Helper to replace full route blocks
function replaceRoute(routePath, newBody) {
  const startIdx = code.indexOf(routePath);
  if (startIdx === -1) return;
  
  // Find the next route or the end of the file
  const regex = /app\.(get|post)\('/g;
  regex.lastIndex = startIdx + 1;
  const match = regex.exec(code);
  const endIdx = match ? match.index : code.length;
  
  const original = code.substring(startIdx, endIdx);
  code = code.substring(0, startIdx) + newBody + '\n\n' + code.substring(endIdx);
}

// 1. Rewrite /api/search
const searchRoute = pp.get('/api/search', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const query = req.query.q || '';
    
    // Search CaseMaster
    let caseRows = [];
    if (query) {
      const q = \\\SELECT CaseMaster.CrimeNo, CaseMaster.BriefFacts, CaseMaster.CrimeRegisteredDate, District.DistrictName FROM CaseMaster, District WHERE CaseMaster.DistrictID = District.DistrictID AND CaseMaster.BriefFacts LIKE '%\%'\\\;
      const res = await zcql.executeZCQLQuery(q).catch(()=>[]);
      caseRows = res.map(r => r.CaseMaster || r);
    }
    
    // Search Accused
    let accusedRows = [];
    if (query) {
      const q = \\\SELECT Accused.AccusedName, Accused.PersonID, Accused.GenderID FROM Accused WHERE Accused.AccusedName LIKE '%\%'\\\;
      const res = await zcql.executeZCQLQuery(q).catch(()=>[]);
      accusedRows = res.map(r => r.Accused || r);
    }
    
    res.status(200).json({
      success: true,
      data: {
        results: [
          ...caseRows.map(c => ({ id: c.CrimeNo, type: 'FIR', title: c.CrimeNo, description: c.BriefFacts })),
          ...accusedRows.map(a => ({ id: a.PersonID, type: 'OFFENDER', title: a.AccusedName, description: 'Accused Profile' }))
        ],
        // dynamic recommendations (same logic can be added later)
        recommendations: [
          { title: 'Recent High Gravity Cases', type: 'RECOMMENDATION', id: 'REC1' }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});;
replaceRoute("app.get('/api/search'", searchRoute);

// Write changes
fs.writeFileSync('functions/get_crime_analytics/index.js', code);
console.log('Done refactoring search');
