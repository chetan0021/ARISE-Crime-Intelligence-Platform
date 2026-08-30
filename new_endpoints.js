// ENDPOINT 5: GET /api/offenders/summary/stats
app.get('/api/offenders/summary/stats', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    
    const [q1, q2, q3] = await Promise.all([
      zcql.executeZCQLQuery(`SELECT offender_profile.recidivism_risk_score, offender_profile.is_repeat_offender, offender_profile.is_rowdy_sheeter, offender_profile.gender, offender_profile.state_of_origin FROM offender_profile`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT bail_custody_status.current_status, bail_custody_status.offender_uid FROM bail_custody_status`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT modus_operandi_signature.crime_category, modus_operandi_signature.time_of_operation, modus_operandi_signature.offender_uid FROM modus_operandi_signature`).catch(()=>[])
    ]);

    const offenderRows = q1.map(r => r.offender_profile || r);
    const totalOffenders = offenderRows.length;
    
    const repeatOffenders = offenderRows.filter(o => o.is_repeat_offender === true || o.is_repeat_offender === 'true').length;
    const rowdySheeters = offenderRows.filter(o => o.is_rowdy_sheeter === true || o.is_rowdy_sheeter === 'true').length;
    const criticalRisk = offenderRows.filter(o => parseFloat(o.recidivism_risk_score) >= 0.9).length;
    const highRisk = offenderRows.filter(o => {
      const s = parseFloat(o.recidivism_risk_score);
      return s >= 0.7 && s < 0.9;
    }).length;

    const bailRows = q2.map(r => r.bail_custody_status || r);
    const onBail = bailRows.filter(r => r.current_status === 'BAIL').length;
    const inCustody = bailRows.filter(r => r.current_status === 'JUDICIAL_CUSTODY' || r.current_status === 'POLICE_CUSTODY').length;
    const absconding = bailRows.filter(r => r.current_status === 'ABSCONDING').length;

    const maleCount = offenderRows.filter(o => {
      const g = (o.gender || '').toUpperCase();
      return g === 'MALE' || g === 'M';
    }).length;

    const femaleCount = offenderRows.filter(o => {
      const g = (o.gender || '').toUpperCase();
      return g === 'FEMALE' || g === 'F';
    }).length;

    const genderBreakdown = { M: maleCount, F: femaleCount };

    const stateOriginBreakdown = {};
    offenderRows.forEach(o => {
      const st = o.state_of_origin;
      if (st) {
        stateOriginBreakdown[st] = (stateOriginBreakdown[st] || 0) + 1;
      }
    });

    const soList = Object.keys(stateOriginBreakdown).map(k => ({ state: k, count: stateOriginBreakdown[k] })).sort((a,b)=>b.count-a.count);

    const crimeCats = {};
    const timeSlots = {};
    q3.forEach(r => {
      const mo = r.modus_operandi_signature || r;
      const c = mo.crime_category;
      if (c) crimeCats[c] = (crimeCats[c] || 0) + 1;
      
      const t = mo.time_of_operation;
      if (t) timeSlots[t] = (timeSlots[t] || 0) + 1;
    });

    const topCrimeCategories = Object.keys(crimeCats).map(k => ({ category: k, count: crimeCats[k] })).sort((a,b)=>b.count-a.count).slice(0, 5);
    const peakOperationTime = Object.keys(timeSlots).sort((a,b)=>timeSlots[b]-timeSlots[a])[0] || 'Unknown';

    res.status(200).json({
      success: true,
      data: {
        totalOffenders, repeatOffenders, rowdySheeters, criticalRisk, highRisk,
        onBail, inCustody, absconding, genderBreakdown, topCrimeCategories, peakOperationTime,
        stateOriginBreakdown: soList
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENDPOINT 6: GET /api/offenders
app.get('/api/offenders', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();

    const [offenderRowsUnflattened, bailRowsUnflattened] = await Promise.all([
      zcql.executeZCQLQuery(`SELECT offender_profile.offender_uid, offender_profile.full_name, offender_profile.alias_names, offender_profile.fathers_name, offender_profile.date_of_birth, offender_profile.gender, offender_profile.mobile_primary, offender_profile.occupation, offender_profile.nationality, offender_profile.state_of_origin, offender_profile.total_prior_arrests, offender_profile.total_convictions, offender_profile.is_repeat_offender, offender_profile.is_rowdy_sheeter, offender_profile.rowdy_sheet_number, offender_profile.gang_affiliation_text, offender_profile.recidivism_risk_score, offender_profile.risk_score_updated_datetime, offender_profile.photo_url, offender_profile.current_latitude, offender_profile.current_longitude FROM offender_profile ORDER BY offender_profile.recidivism_risk_score DESC`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT bail_custody_status.offender_uid, bail_custody_status.current_status, bail_custody_status.bail_granted_datetime, bail_custody_status.bail_expiry_datetime, bail_custody_status.court_name, bail_custody_status.bail_type, bail_custody_status.surety_amount_inr FROM bail_custody_status`).catch(()=>[])
    ]);

    const offenderRows = offenderRowsUnflattened.map(r => r.offender_profile || r);
    const bailRows = bailRowsUnflattened.map(r => r.bail_custody_status || r);

    console.log('[offenders] Query 1 rows:', offenderRows.length);
    console.log('[offenders] Query 2 rows:', bailRows.length);

    const bailMap = {}
    bailRows.forEach(b => {
      bailMap[b.offender_uid] = b
    })

    let offenders = offenderRows.map(o => {
      const bail = bailMap[o.offender_uid] || {}
      const age = o.date_of_birth
        ? Math.floor((Date.now() - new Date(o.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
        : null
      
      const score = parseFloat(o.recidivism_risk_score) || 0
      
      const threatLevel = 
        score >= 0.9 ? 'CRITICAL' :
        score >= 0.7 ? 'HIGH' :
        score >= 0.5 ? 'MEDIUM' : 'LOW'
      
      return {
        ...o,
        age,
        threatLevel,
        current_status: bail.current_status || 'UNKNOWN',
        bail_granted_datetime: bail.bail_granted_datetime || null,
        bail_expiry_datetime: bail.bail_expiry_datetime || null,
        court_name: bail.court_name || null,
        bail_type: bail.bail_type || null,
        surety_amount_inr: bail.surety_amount_inr || null
      }
    })

    console.log('[offenders] After join:', offenders.length);
    if(offenders.length > 0) console.log('[offenders] Sample offender:', JSON.stringify(offenders[0]));

    const { repeat_only, rowdy_only, min_risk, status, search } = req.query;

    if (repeat_only === 'true') {
      offenders = offenders.filter(o => o.is_repeat_offender === true || o.is_repeat_offender === 'true');
    }
    if (rowdy_only === 'true') {
      offenders = offenders.filter(o => o.is_rowdy_sheeter === true || o.is_rowdy_sheeter === 'true');
    }
    if (min_risk) {
      offenders = offenders.filter(o => (parseFloat(o.recidivism_risk_score) || 0) >= parseFloat(min_risk));
    }
    if (status) {
      offenders = offenders.filter(o => o.current_status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      offenders = offenders.filter(o => 
        (o.full_name || '').toLowerCase().includes(s) || 
        (o.alias_names || '').toLowerCase().includes(s) ||
        (o.gang_affiliation_text || '').toLowerCase().includes(s)
      );
    }

    const summary = {
      total: offenders.length,
      repeatOffenders: offenders.filter(o => o.is_repeat_offender === true || o.is_repeat_offender === 'true').length,
      rowdySheeters: offenders.filter(o => o.is_rowdy_sheeter === true || o.is_rowdy_sheeter === 'true').length,
      onBail: offenders.filter(o => o.current_status === 'BAIL').length,
      absconding: offenders.filter(o => o.current_status === 'ABSCONDING').length,
      critical: offenders.filter(o => (parseFloat(o.recidivism_risk_score)||0) >= 0.9).length,
      high: offenders.filter(o => (parseFloat(o.recidivism_risk_score)||0) >= 0.7).length
    };

    console.log('[offenders] Summary:', JSON.stringify(summary));

    res.status(200).json({ success: true, data: { offenders, summary } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENDPOINT 7: GET /api/offenders/:uid
app.get('/api/offenders/:uid', async (req, res) => {
  try {
    const zcql = res.locals.catalystApp.zcql();
    const uid = req.params.uid;

    console.log('[offender detail] uid:', uid);

    const [q1, q2, q3, q4] = await Promise.all([
      zcql.executeZCQLQuery(`SELECT offender_profile.offender_uid, offender_profile.full_name, offender_profile.alias_names, offender_profile.fathers_name, offender_profile.date_of_birth, offender_profile.gender, offender_profile.mobile_primary, offender_profile.mobile_secondary, offender_profile.permanent_address_text, offender_profile.current_address_text, offender_profile.nationality, offender_profile.state_of_origin, offender_profile.education_level, offender_profile.occupation, offender_profile.total_prior_arrests, offender_profile.total_convictions, offender_profile.is_repeat_offender, offender_profile.is_rowdy_sheeter, offender_profile.rowdy_sheet_number, offender_profile.gang_affiliation_text, offender_profile.recidivism_risk_score, offender_profile.photo_url, offender_profile.current_latitude, offender_profile.current_longitude FROM offender_profile WHERE offender_profile.offender_uid = '${uid}'`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT modus_operandi_signature.fir_uid, modus_operandi_signature.crime_category, modus_operandi_signature.crime_subcategory, modus_operandi_signature.instrument_used, modus_operandi_signature.entry_method, modus_operandi_signature.escape_method, modus_operandi_signature.time_of_operation, modus_operandi_signature.target_selection_criteria, modus_operandi_signature.accomplice_count, modus_operandi_signature.property_stolen_value_inr, modus_operandi_signature.mo_narrative_text, modus_operandi_signature.day_of_week FROM modus_operandi_signature WHERE modus_operandi_signature.offender_uid = '${uid}'`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT bail_custody_status.bail_uid, bail_custody_status.fir_uid, bail_custody_status.arrest_datetime, bail_custody_status.current_status, bail_custody_status.bail_granted_datetime, bail_custody_status.bail_type, bail_custody_status.bail_conditions_text, bail_custody_status.bail_expiry_datetime, bail_custody_status.court_name, bail_custody_status.court_case_number, bail_custody_status.surety_amount_inr FROM bail_custody_status WHERE bail_custody_status.offender_uid = '${uid}' ORDER BY bail_custody_status.arrest_datetime DESC`).catch(()=>[]),
      zcql.executeZCQLQuery(`SELECT biometric_record.height_cm, biometric_record.weight_kg, biometric_record.complexion, biometric_record.build, biometric_record.identifying_marks_text, biometric_record.blood_group, biometric_record.dna_profile_reference FROM biometric_record WHERE biometric_record.offender_uid = '${uid}'`).catch(()=>[])
    ]);

    const profileRows = q1.map(r => r.offender_profile || r);
    const moRows = q2.map(r => r.modus_operandi_signature || r);
    const bailRows = q3.map(r => r.bail_custody_status || r);
    const biometricRows = q4.map(r => r.biometric_record || r);

    console.log('[offender detail] profile rows:', profileRows.length);
    console.log('[offender detail] MO rows:', moRows.length);
    console.log('[offender detail] bail rows:', bailRows.length);

    const profile = profileRows.length > 0 ? profileRows[0] : null;
    if (!profile) return res.status(404).json({ success: false, error: 'Offender not found' });
    
    if (profile.date_of_birth) {
      profile.age = Math.floor((Date.now() - new Date(profile.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
    }

    const flattenZcqlRow = (row) => row.fir_master || row;

    const firQueries = moRows.map(mo =>
      zcql.executeZCQLQuery(`
        SELECT 
          fir_master.fir_uid,
          fir_master.bns_primary_section,
          fir_master.district_name,
          fir_master.police_station_code,
          fir_master.subdivision_name,
          fir_master.case_status,
          fir_master.fir_registration_datetime,
          fir_master.incident_address_text,
          fir_master.incident_latitude,
          fir_master.incident_longitude,
          fir_master.time_of_day_slot,
          fir_master.weapon_used,
          fir_master.property_type,
          fir_master.complainant_name
        FROM fir_master
        WHERE fir_master.fir_uid = '${mo.fir_uid}'
      `).catch(()=>[])
    );
    const firResults = await Promise.all(firQueries);
    const firRows = firResults.flat().map(flattenZcqlRow);

    console.log('[offender detail] FIR rows:', firRows.length);

    const cases = moRows.map(mo => {
      const fir = firRows.find(f => f.fir_uid === mo.fir_uid) || {};
      return { ...mo, ...fir };
    });

    const custody = bailRows;
    const biometric = biometricRows.length > 0 ? biometricRows[0] : null;

    let casesWithZia = cases;
    try {
      const zia = res.locals.catalystApp.zia();
      
      casesWithZia = await Promise.all(
        cases.map(async (c) => {
          if (!c.mo_narrative_text || c.mo_narrative_text.length < 10) {
            return c;
          }
          try {
            const ziaResult = await zia.getTextAnalytics([{ text: c.mo_narrative_text }]);
            
            if (!ziaResult || !ziaResult[0]) 
              return c;
            
            const analysis = ziaResult[0];
            
            return {
              ...c,
              ziaKeywords: (analysis.keywords || analysis.keywordExtraction || [])
                .slice(0, 8)
                .map(k => ({
                  word: k.keyword || k.text || k,
                  score: k.confidence || k.score || 0.7
                })),
              ziaEntities: (analysis.namedEntityRecognition || analysis.entities || [])
                .map(e => ({
                  text: e.entity || e.text || '',
                  type: e.type || 'UNKNOWN',
                  confidence: e.confidence || 0
                }))
                .filter(e => e.text.length > 2 && e.confidence > 0.6),
              ziaSentiment: analysis.sentiment?.value || analysis.overallSentiment || analysis.sentimentAnalysis?.documentSentiment || 'NEUTRAL'
            };
          } catch (ziaItemErr) {
            console.log('Zia NER failed for case', c.fir_uid, ':', ziaItemErr.message);
            return c;
          }
        })
      );
    } catch (ziaErr) {
      console.log('Zia Text Analytics block failed:', ziaErr.message);
      casesWithZia = cases;
    }

    console.log('[offender detail] Zia NER ran on', casesWithZia.filter(c => c.ziaKeywords).length, 'cases');

    function mode(arr) {
      if (!arr || arr.length === 0) return null;
      const freq = {};
      arr.forEach(v => { 
        if (v) freq[v] = (freq[v] || 0) + 1; 
      });
      return Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
    }

    const timeSlots = casesWithZia.map(c => c.time_of_operation || c.time_of_day_slot).filter(Boolean);
    const crimeTypes = casesWithZia.map(c => c.crime_category).filter(Boolean);
    const instruments = casesWithZia.map(c => c.instrument_used).filter(Boolean);
    const escapeMethods = casesWithZia.map(c => c.escape_method).filter(Boolean);
    const targets = casesWithZia.map(c => c.target_selection_criteria).filter(Boolean);
    const districts = [...new Set(casesWithZia.map(c => c.district_name).filter(Boolean))];

    const preferredTime = mode(timeSlots);
    const preferredCrime = mode(crimeTypes);
    const preferredInstrument = mode(instruments);
    const preferredEscape = mode(escapeMethods);
    const preferredTarget = mode(targets);

    const humanReadable = {
      'DOOR_FORCED': 'forcing doors',
      'WINDOW_BROKEN': 'breaking windows',
      'LOCK_PICKED': 'picking locks',
      'TWO_WHEELER': 'two-wheeler',
      'CAR': 'car',
      'FOOT': 'on foot',
      'GROUND_FLOOR_RESIDENTIAL': 'ground floor residential properties',
      'ELDERLY_RESIDENT': 'elderly residents',
      'LONE_WOMAN': 'lone women',
      'ATM_USER': 'ATM users',
      'ONLINE_SELLER': 'online sellers'
    };

    const patternParts = [];
    if (preferredCrime) 
      patternParts.push(`Primarily commits ${preferredCrime.toLowerCase().replace(/_/g,' ')}`);
    if (preferredTime) 
      patternParts.push(`operates during ${preferredTime.toLowerCase()}`);
    if (preferredInstrument) 
      patternParts.push(`uses ${humanReadable[preferredInstrument] || preferredInstrument.toLowerCase().replace(/_/g,' ')}`);
    if (preferredEscape) 
      patternParts.push(`escapes by ${humanReadable[preferredEscape] || preferredEscape.toLowerCase().replace(/_/g,' ')}`);
    if (preferredTarget) 
      patternParts.push(`targets ${humanReadable[preferredTarget] || preferredTarget.toLowerCase().replace(/_/g,' ')}`);

    const operationalPattern = patternParts.join('. ') + (patternParts.length > 0 ? '.' : '');

    const behavioralProfile = {
      preferredTimeSlot: preferredTime,
      preferredCrimeType: preferredCrime,
      preferredInstrument,
      preferredEscapeMethod: preferredEscape,
      preferredTargetType: preferredTarget,
      jurisdictionsActive: districts,
      operationalPattern: operationalPattern || 'Insufficient data to compute operational pattern.'
    };

    const sorted = [...casesWithZia].sort((a,b) => new Date(a.fir_registration_datetime) - new Date(b.fir_registration_datetime));
    const values = sorted.map(c => parseFloat(c.property_stolen_value_inr) || 0).filter(v => v > 0);
    const escalating = values.length >= 2 && values[values.length-1] > values[0];
    const accompliceCounts = sorted.map(c => parseInt(c.accomplice_count) || 0);
    const accompliceEscalating = accompliceCounts.length >= 2 && accompliceCounts[accompliceCounts.length-1] > accompliceCounts[0];

    const escalationPattern = {
      escalating: escalating || accompliceEscalating,
      escalationNote: escalating
        ? `Property value stolen increased from ₹${values[0].toLocaleString('en-IN')} to ₹${values[values.length-1].toLocaleString('en-IN')} across ${values.length} incidents.`
        : accompliceEscalating
          ? `Accomplice count increased from ${accompliceCounts[0]} to ${accompliceCounts[accompliceCounts.length-1]}, indicating network growth.`
          : null
    };

    res.status(200).json({
      success: true,
      data: {
        profile, cases: casesWithZia, custody, biometric,
        behavioralProfile,
        escalationPattern,
        crossJurisdictionCount: districts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENDPOINT 8: POST /api/offenders/:uid/analyze-photo
app.post('/api/offenders/:uid/analyze-photo', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ success: false, error: 'No image provided' });

  try {
    const zia = res.locals.catalystApp.zia();
    const imageBuffer = Buffer.from(imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    let faceResult;
    try {
      faceResult = await zia.faceAnalytics(imageBuffer);
    } catch(m1) {
      try {
        faceResult = await zia.predictFaceAnalytics(imageBuffer);
      } catch(m2) {
        faceResult = await zia.getZiaServices('faceAnalytics', { imageBuffer });
      }
    }
    
    const detectedFace = faceResult?.predictions?.[0]
      || faceResult?.result?.[0]
      || faceResult?.[0]
      || faceResult;

    if (!detectedFace || Object.keys(detectedFace).length === 0) {
      return res.json({ success: true, data: { faceAnalysis: { faceCount: 0 }, profileComparison: { verificationStatus: 'UNVERIFIABLE' } } });
    }

    const detectedAge = detectedFace?.age_range || detectedFace?.age || detectedFace?.ageRange || 'Unknown';
    const detectedGender = detectedFace?.gender || detectedFace?.gender_value || 'Unknown';
    const confidence = detectedFace?.confidence || detectedFace?.score || 0;
    const faceCount = faceResult?.predictions?.length || (detectedFace ? 1 : 0);

    const zcql = res.locals.catalystApp.zcql();
    const uid = req.params.uid;
    const q = await zcql.executeZCQLQuery(`SELECT date_of_birth, gender FROM offender_profile WHERE offender_uid = '${uid}'`).catch(()=>[]);
    const profile = q.length > 0 ? (q[0].offender_profile || q[0]) : null;

    let storedAge = null, ageDelta = null, genderMatch = null, verificationStatus = 'VERIFIED';
    
    if (profile && profile.date_of_birth) {
      storedAge = Math.floor((Date.now() - new Date(profile.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
    }
    
    const parseAge = (ageStr) => {
      if (typeof ageStr === 'object' && ageStr.min !== undefined && ageStr.max !== undefined) {
        return (ageStr.min + ageStr.max) / 2;
      }
      if (typeof ageStr === 'string' && ageStr.includes('-')) {
        const parts = ageStr.split('-');
        return (parseInt(parts[0]) + parseInt(parts[1])) / 2;
      }
      return parseInt(ageStr) || 0;
    };
    
    const dAge = parseAge(detectedAge);
    
    if (storedAge && dAge) {
      ageDelta = Math.abs(storedAge - dAge);
      if (ageDelta > 15) verificationStatus = 'DISCREPANCY';
    }
    
    if (profile && profile.gender && detectedGender && detectedGender !== 'Unknown') {
      genderMatch = profile.gender.charAt(0).toUpperCase() === detectedGender.charAt(0).toUpperCase();
      if (!genderMatch) verificationStatus = 'DISCREPANCY';
    }

    res.status(200).json({
      success: true,
      data: {
        faceAnalysis: {
          detectedAge,
          detectedGender,
          confidence,
          faceCount,
          attributes: detectedFace
        },
        profileComparison: {
          storedAge, ageDelta, genderMatch, verificationStatus
        }
      }
    });
  } catch(e) {
    console.log('Zia Face Analytics error:', e.message);
    return res.json({
      success: false,
      error: 'Zia Face Analytics unavailable. Ensure Zia Services is enabled in Catalyst Console → Zia Services → Face Analytics.',
      fallback: true
    });
  }
});
