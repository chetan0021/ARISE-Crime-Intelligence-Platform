# Kannada Translation & Voice Fix Plan

## Issues Identified

### 1. Incomplete Kannada Translations
- Most dashboard pages are NOT using the translation system
- Pages directly hardcode English text instead of using `t()` function
- Only Command Center seems to use translations properly

### 2. Missing Kannada Voice Output (TTS)
- AI Assistant has voice INPUT (STT) but NO voice OUTPUT
- Backend has TTS endpoint (`/api/tts`) with Kannada support
- Frontend doesn't call TTS to read responses aloud

## Solution

### Phase 1: Add Voice Output to AI Assistant ✅

**Frontend Changes:**
1. Add "Read Aloud" button to each AI response
2. Integrate with `/api/tts` endpoint
3. Auto-detect language (en/kn) from response
4. Add audio playback with pause/stop controls

**Voices Available:**
- English: `en-US-AvaNeural` (Microsoft Edge TTS)
- Kannada: `kn-IN-SapnaNeural` (Microsoft Edge TTS)

**Alternative: Use Catalyst Zia TTS API (Better Quality)**
- English: Thomas, Adam, Brian (Male); Mary, Anna, Beth (Female)
- Hindi: Rohit, Arman (Male); Divya, Rani (Female)  
- Kannada: **Suresh, Chetan (Male); Anu, Vidya (Female)**

Endpoint: `https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize`

### Phase 2: Fix Dashboard Translations

**Pages Needing Translation Integration:**
1. ✅ CommandCenter.jsx - Already uses t()
2. ❌ CrimeAnalytics.jsx - Hardcoded English
3. ❌ HotspotMap.jsx - Hardcoded English  
4. ❌ NetworkAnalysis.jsx - Hardcoded English
5. ❌ OffenderIntelligence.jsx - Hardcoded English
6. ❌ Predictions.jsx - Hardcoded English
7. ❌ SocioEconomic.jsx - Hardcoded English
8. ❌ FinancialCrime.jsx - Hardcoded English
9. ❌ Search.jsx - Hardcoded English
10. ❌ AIAssistant.jsx - Hardcoded English
11. ❌ Reports.jsx - Hardcoded English
12. ❌ ZiaFaceAnalytics.jsx - Hardcoded English
13. ❌ Governance.jsx - Hardcoded English
14. ❌ Settings.jsx - Hardcoded English

**Required Changes Per File:**
```jsx
// BEFORE (Hardcoded)
<h1>Crime Analytics</h1>

// AFTER (Translated)
import { useT } from '../i18n/useT'

function Component() {
  const t = useT()
  return <h1>{t('ca.title')}</h1>
}
```

### Phase 3: Add Missing Translation Keys

Need to add ~200+ translation keys for all dashboards.

Example sections missing:
- Detailed chart labels
- Button texts
- Tooltip texts
- Error messages per page
- Table headers and columns

## Implementation Priority

1. **HIGH PRIORITY - Voice Output** (Most visible feature)
   - Add TTS to AI Assistant
   - Test both English and Kannada

2. **MEDIUM PRIORITY - Core Dashboards**
   - Fix: CrimeAnalytics, HotspotMap, NetworkAnalysis, OffenderIntelligence

3. **LOW PRIORITY - Admin Pages**
   - Fix: Settings, Governance (less frequently used)

## Testing Checklist

- [ ] Switch to Kannada language
- [ ] Test all 14 dashboard pages
- [ ] Verify all text is translated
- [ ] Test AI Assistant voice in English
- [ ] Test AI Assistant voice in Kannada
- [ ] Verify voice matches selected language

## Technical Notes

**Current TTS Implementation (msedge-tts):**
- Pros: Free, works offline
- Cons: Lower quality than Catalyst Zia

**Catalyst Zia TTS (Recommended):**
- Pros: Better quality, native Catalyst integration
- Cons: Requires OAuth token, API quota limits

**Decision:** Use existing msedge-tts for speed, can upgrade to Zia TTS later if needed.
