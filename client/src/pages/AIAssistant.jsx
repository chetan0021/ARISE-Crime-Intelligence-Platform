import { useState, useEffect, useRef } from 'react'
import {
  Send, Mic, MicOff, FileDown, Sparkles, Bot, User, Loader2,
  AlertCircle, ChevronDown, RotateCcw, Copy, CheckCircle, ChevronUp, Info, Volume2, VolumeX
} from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'
import ReactMarkdown from 'react-markdown'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics'

function stripLLMThinking(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let t = rawText;

  t = t.replace(/<think[\s\S]*?<\/think>/gi, ' ');
  t = t.replace(/```think[\s\S]*?```/gi, ' ');

  const lines = t.split(/\r?\n/);
  const kept = [];
  let inBulkReasoningBlock = false;

  const REASONING_BLOCK_HEADERS = [
    /^\*?\*?Thinking\b/i,
    /^\*?\*?Thought\b/i,
    /^\*?\*?Reasoning\b/i,
    /^\*?\*?Analysis\b/i,
    /^\*?\*?Plan\b/i,
    /^\*?\*?Steps?\b/i,
    /^\*?\*?Approach\b/i,
    /^\*?\*?Strategy\b/i,
    /^\*?\*?Let me (think|analyze|understand|verify|check|process|look|search|find|confirm|review|reason)\b/i,
    /^\*?\*?Okay,?\s+(let|now|so)\b/i,
    /^\*?\*?First,?\s+(let|I)\b/i,
    /^\*?\*?The user (said|asked|is asking|wants|is trying|is requesting)\b/i,
    /^\*?\*?User (said|asked|query|request|question):?\b/i,
    /^Analyze\s+(the\s+)?(Request|Query|Question|Input|User|Task|Prompt)\s*:?\s*$/i,
    /^(Scan|Search|Inspect|Review|Explore|Check)\s+(the\s+)?(Database|Context|Data|Records|Table|List|Schema|Fields?|History)\s*:?\s*$/i,
    /^(Filter|Selection|Match|Join|Map|Merge|Cross-?[Rr]ef(?:erence)?|Lookup|Search|Query)\s+(Logic|Plan|Strategy|Steps?|Condition|Rule|Criteria|Approach)\s*:?\s*$/i,
    /^(Constraint|Limitation|Requirement|Boundary|Rule|Validation|Safety|Guardrail)\s*(Check|Match|Test|Condition)?\s*:?\s*$/i,
    /^(Alternative|Fallback|Backup|Secondary|Option|Alternate)\s+(Strategy|Plan|Approach|Method|Solution)\s*:?\s*$/i,
    /^(Observation|Finding|Note|Insight|Discovery|Result|Summary|Conclusion|Reasoning)\s*(s)?\s*:?\s*$/i,
    /^(Target|Goal|Objective|Output|Deliverable|Result|Intent|Purpose|Task|Action)\s*:?\s*$/i,
    /^(Data\s+)?(Structure|Format|Schema|Mapping|Fields?|Columns?|Keys?|IDs?|Relations?|Relationships?|Model)\s*:?\s*$/i,
    /^(Execution|Implementation|Application|Processing)\s+(Plan|Steps?|Logic|Flow|Order|Strategy)\s*:?\s*$/i,
    /^(Language|Locale|Region|Format|Response\s+Type|Output\s+Format)\s*:?\s*$/i
  ];

  const META_HEADERS = [
    /^\*?\*?Role\b/i,
    /^\*?\*?Identity\b/i,
    /^\*?\*?Purpose\b/i,
    /^\*?\*?Constraint\b/i,
    /^\*?\*?Security\b/i,
    /^\*?\*?Instruction\b/i,
    /^\*?\*?System\b/i,
    /^\*?\*?Context\b/i,
    /^\*?\*?Task\b/i,
    /^\*?\*?Goal\b/i,
    /^\*?\*?Output\b/i,
    /^\*?\*?Format\b/i
  ];

  const COLON_LABEL = /^(?<label>[A-Z][A-Za-z0-9 _\-/]{2,78})\s*:/;

  const REASONING_LABEL_KEYWORDS = /\b(request|query|question|input|user|task|database|context|logic|steps?|plan|strategy|approach|check|condition|constraint|observation|finding|note|insight|target|goal|structure|schema|mapping|join|match|filter|selection|alternative|fallback|language|output|format|execution|processing|analysis|thinking|thought|reasoning|scan|search|review|explore|inspect|investigation|method|workflow|breakdown|decomposition|validation|implementation|application)\b/i;

  function isColonTitledSection(lineTrimmed) {
    if (REASONING_BLOCK_HEADERS.some(r => r.test(lineTrimmed))) return true;
    if (META_HEADERS.some(r => r.test(lineTrimmed))) return true;
    const m = lineTrimmed.match(COLON_LABEL);
    if (!m) return false;
    const label = m.groups.label.trim();
    if (label.length < 3 || label.length > 70) return false;
    const colonIdx = m.index + m[0].length;
    const afterColon = lineTrimmed.slice(colonIdx).trim();
    if (afterColon.length === 0) return REASONING_LABEL_KEYWORDS.test(label);
    return REASONING_LABEL_KEYWORDS.test(label);
  }

  function isReasoningBodyNarrative(lineTrimmed) {
    const tlc = lineTrimmed.toLowerCase();
    return (
      /^(let'?s|let me|let us)\b/i.test(lineTrimmed) ||
      /^i\s+(need to|should|will|can|must|cannot|can't|won't|have to|want to|'ll)\b/i.test(lineTrimmed) ||
      /^the\s+[a-z0-9_ ]{2,60}\s+(list|table|record|entry|field|column|object|array|dataset|data)\s+(contains|has|include|holds|store|provides|with|of|is|are|show)/i.test(lineTrimmed) ||
      /^(the\s+)?(ids?|id|keys?|values?|fields?|columns?|rows?|names?)\b.*\b(match|align|correspond|map|join|relate|differ|vary|overlap|connect|link|associate)\b/i.test(lineTrimmed) ||
      /^(since|because|as\s+|given\s+|however|but[,\s]|though|although|while|whereas|nonetheless|nevertheless|consequently|therefore|thus|hence|accordingly)\b/i.test(lineTrimmed) ||
      /^(also|additionally|furthermore|moreover|besides|next|then|meanwhile|otherwise|instead|alternatively|separately)\b/i.test(lineTrimmed) ||
      /^(these|those|such|this\s+(means|implies|suggests|shows|indicates|confirms)|that\s+(means|implies|suggests|shows|indicates|confirms))\b/i.test(lineTrimmed) ||
      /^(note\s+that|observe\s+that|notice\s+that|recall\s+that|remember\s+that|consider\s+that|keep\s+in\s+mind)\b/i.test(lineTrimmed) ||
      /^(observation|finding|note|insight|discovery|summary|conclusion|target|goal|constraint|limitation|condition|step|plan|approach|strategy|output|format|intent|purpose|action)\b\s*[:\-]/i.test(lineTrimmed) ||
      /\b(the\s+)?(repeat\s+offenders?|bail\s+status|fir|accused|offender|district|hotspot|crime)\s+(list|table|record|data|dataset)\b/i.test(tlc) ||
      /^[A-Z][A-Za-z0-9_]{2,60}\s+(has|contains|includes|stores|holds|lists|shows|provides|with|of)\b/i.test(lineTrimmed) ||
      /^(After|Once|When|While|Before|As|Upon|Following|If)\b.*\b(I|we|one)\s+(will|should|must|need to|can|shall|may|might|could|'ll)\b/i.test(lineTrimmed)
    );
  }

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();
    if (!trimmed) { kept.push(''); continue; }

    const isReasoningHeader = REASONING_BLOCK_HEADERS.some(r => r.test(trimmed));
    const isMetaHeader = META_HEADERS.some(r => r.test(trimmed));
    const isColonHeader = isColonTitledSection(trimmed);
    if (isReasoningHeader || isMetaHeader || isColonHeader) {
      inBulkReasoningBlock = true;
      continue;
    }

    if (/^#{1,6}\s*(Thinking|Thought|Reasoning|Analysis|Plan|Steps?|Approach|Context|Strategy|Execution|Processing)\b/i.test(trimmed)) {
      inBulkReasoningBlock = true;
      continue;
    }

    const INLINE_SELF_TALK = [
      /^(Okay,?\s+)?(so|now)\s+(I|let me)\b[^.!?]*?[.!?]?\s*$/i,
      /^(Before answering,?\s+)?Let me (think|analyze|understand|verify|check|process|look into|search for|find|confirm|review|figure out|break down|reason through|reason|map|join|cross-?[Rr]ef(?:erence)?|inspect|examine|evaluate|compare|match)\b[^.!?]*?[.!?]?\s*$/i,
      /^Before answering,?\s+let me\b[^.!?]*?[.!?]?\s*$/i,
      /^The user (said|asked|is asking|is requesting|wants|would like|needs)\b[^.!?]*?[.!?]?\s*$/i,
      /^User\b[^.!?]*?[.!?]?\s*$/i,
      /^I\s+(need to|should|will|can|must|cannot|can't|won't|have to|want to)\s+(verify|check|analyze|think|review|examine|process|look|determine|confirm|find|identify|map|join|match|extract|gather|collect|fetch|query|search|compare|evaluate|assess|consider|apply|perform|implement|execute|build|construct|filter|select|choose|decide)\b.*$/i,
      /^First,?\s+(I|let me)\s+(need to|should|will|can|must)?\s*(verify|check|analyze|think|review|examine|process|look|determine|confirm|find|identify|map|join|match|extract|gather|collect|fetch|query|search|compare|evaluate|assess|consider|apply|perform|implement|execute|filter|select|choose|decide)\b.*$/i,
      /^Secondly?,?\s+(I|let me)\b[^.!?]*?[.!?]?\s*$/i,
      /^Hmm\b[^.!?]*?[.!?]?\s*$/i,
      /^Alright,?\s+(let me|I)\b[^.!?]*?[.!?]?\s*$/i,
      /^Let'?s\s+(look\s+at|check|see|review|examine|analyze|consider|compare|evaluate|try|do|start|begin|think|assess|inspect|map|verify|confirm)\b/i,
      /^I\s+see\b/i,
      /^I\s+(think|believe|feel|suspect|guess|suppose|expect|imagine)\b/i,
      /^This\s+(is|looks|seems|appears|feels)\s+(tricky|tricky\.|interesting|complex|complicated|simple|straightforward|important|critical|crucial|key)/i
    ];
    if (INLINE_SELF_TALK.some(r => r.test(trimmed))) continue;

    const numberedMatch = trimmed.match(/^(\d+)[.)\]]\s+(.+)$/);
    if (numberedMatch) {
      const stepText = numberedMatch[2];
      const REASONING_STEP_VERBS = /^(check|verify|analyze|think about|determine|review|examine|process|search for|find|look for|look up|query|fetch|gather|collect|understand|break down|identify|evaluate|assess|consider|note that|notice that|recall|remember|cross-check|cross check|map|join|match|inspect|compare|filter|select|extract|confirm|validate|scan|explore|aggregate|sort|rank|order|group|categorize|classify|cluster|prioritize|organize|structure|compile|summarize|format|present|build|construct|generate|produce|create)\b/i;
      if (REASONING_STEP_VERBS.test(stepText)) continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const stepText = bulletMatch[1];
      const REASONING_BULLET = /^(check|verify|analyze|think about|determine|review|examine|process|search for|find|look for|query|fetch|gather|collect|understand|break down|identify|evaluate|assess|consider|note that|notice that|cross-check|cross check|map|join|match|inspect|compare|filter|select|extract|confirm|validate|scan|explore|aggregate|sort|rank|order|group|categorize|classify|cluster|prioritize|organize|structure|compile|summarize|format|present|build|construct|generate|produce|create)\b/i;
      if (REASONING_BULLET.test(stepText)) continue;
    }

    if (inBulkReasoningBlock) {
      const looksLikeMetaOrNarrative =
        REASONING_BLOCK_HEADERS.some(r => r.test(trimmed)) ||
        META_HEADERS.some(r => r.test(trimmed)) ||
        isColonTitledSection(trimmed) ||
        INLINE_SELF_TALK.some(r => r.test(trimmed)) ||
        isReasoningBodyNarrative(trimmed);

      if (!looksLikeMetaOrNarrative) {
        inBulkReasoningBlock = false;
      } else {
        continue;
      }
    }

    kept.push(line);
  }

  t = kept.join('\n');

  t = t.replace(/\[(Thought|Reasoning|Analysis|Thinking|Note|Plan|Strategy)\s*[:\-][^\]]*\]/gi, ' ');
  t = t.replace(/\(\s*(Let me|The user|Okay,? so|First,|Now I|I need|Let's|Let me|Observation|Note that|Consider)\b[^)]{4,200}\)/gi, ' ');

  t = t.replace(/^(Observation|Finding|Note|Insight|Discovery|Target|Goal|Constraint|Condition|Strategy|Approach|Plan|Step|Intent|Purpose|Action|Language|Locale|Format|Output|Context|Data\s+Structure|Structure|Mapping|Join|Filter|Match|Selection|Thinking|Thought|Reasoning|Analysis|Execution|Processing|Validation|Implementation|Application|Workflow|Method|Breakdown|Decomposition|Investigation|Inspection|Exploration|Scan|Search|Review)\s*:\s*.{0,200}$/gim, '');
  t = t.replace(/^[A-Z_\- ]{3,80}:\s*$/gm, '');

  t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();

  if (!t) t = "Based on the current records, I can confirm this is being processed. Would you like specific details?";
  return t;
}

/* â”€â”€ BNS LABELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BNS_LABELS = {
  'BNS-303': 'Theft',
  'BNS-309(4)': 'Robbery',
  'BNS-318(4)': 'Cyber Fraud',
  'BNS-331(3)': 'Housebreaking',
  'BNS-115': 'Assault'
}

const PROMPT_CHIPS = [
  {
    label: 'Repeat offenders on bail',
    query: 'Show me repeat offenders currently on bail',
    icon: 'Search'
  },
  {
    label: 'BNS-318(4) cases',
    query: 'Show all BNS-318(4) cyber fraud cases',
    icon: 'Search'
  },
  {
    label: 'High risk hotspots',
    query: 'Which areas have the highest crime risk right now',
    icon: 'Search'
  },
  {
    label: 'Housebreaking with crowbar',
    query: 'Find offenders who commit housebreaking at night using crowbar',
    icon: 'Search'
  },
  {
    label: 'Bengaluru Urban crimes',
    query: 'Show recent FIRs in Bengaluru Urban district',
    icon: 'Search'
  },
  {
    label: 'BNSS deadline status',
    query: 'Which FIRs have exceeded the BNSS chargesheet deadline',
    icon: 'Search'
  }
]

/* â”€â”€ INLINE STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const S = {
  page: {
    display: 'flex',
    height: '100%',
    fontFamily: "var(--font-sans)",
    background: 'transparent',
    color: 'var(--text-primary)',
    overflow: 'hidden'
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    borderRight: '1px solid var(--border-default)'
  },
  
  
    
  
  
  
  inputBar: {
    padding: '16px 24px',
    background: 'transparent',
    borderTop: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    maxWidth: '90%',
    zIndex: 10
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(4, 18, 38, 0.6)',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 119, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)',
    borderRadius: '24px',
    padding: '8px 16px',
    gap: '12px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: "var(--font-sans)",
    outline: 'none',
    padding: '8px 4px',
  },
  sendBtn: (active) => ({
    background: 'transparent',
    border: 'none',
    color: active ? 'var(--cyan)' : 'var(--text-muted)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: active ? 'pointer' : 'not-allowed',
    borderRadius: '50%',
    transition: 'all 0.2s',
  }),
rightPanel: {
    width: '360px',
    background: 'transparent',
    borderLeft: '1px solid var(--border-active)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'transparent',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-default)',
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  badge: (active) => ({
    fontSize: '10px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: active ? 'var(--green-dim)' : 'var(--amber-dim)',
    border: active ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(245,158,11,0.25)',
    color: active ? 'var(--green)' : 'var(--text-primary)'
  }),
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  ghostBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s'
  },
  langBadge: {
    fontSize: '10px',
    fontWeight: 600,
    background: 'var(--border-active)',
    color: 'var(--text-primary)',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  messagesScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    background: 'transparent'
  },
  msgUserRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%'
  },
  msgBotRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%'
  },
  msgUserBubble: {
    maxWidth: '75%',
    background: 'var(--amber-dim)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: '12px 12px 2px 12px',
    padding: '10px 14px',
    position: 'relative'
  },
  msgBotBubble: {
    maxWidth: '80%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-active)',
    borderRadius: '12px 12px 12px 2px',
    padding: '14px 16px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  bubbleText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap'
  },
  msgUserMeta: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textAlign: 'right',
    marginTop: '4px'
  },
  msgBotHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderBottom: '1px solid var(--border-active)',
    paddingBottom: '6px',
    marginBottom: '2px',
    position: 'relative'
  },
  msgBotTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  msgBotLlmBadge: {
    fontSize: '9px',
    background: 'var(--green-dim)',
    color: 'var(--green)',
    padding: '1px 5px',
    borderRadius: '3px',
    fontWeight: 500
  },
  msgBotMeta: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginLeft: 'auto'
  },
  copyBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    opacity: 0.6,
    transition: 'all 0.15s'
  },
  citesToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
    marginTop: '4px',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    padding: 0
  },
  citesList: {
    background: 'transparent',
    borderRadius: '6px',
    border: '1px solid var(--border-active)',
    padding: '8px 10px',
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  citeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  citeId: {
    fontFamily: 'monospace',
    color: 'var(--text-primary)',
    fontWeight: 600
  },
  citesFooter: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: '4px',
    borderTop: '1px solid var(--border-default)',
    paddingTop: '4px'
  },
  dotsContainer: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    padding: '6px 0'
  },
  dots: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-primary)',
    animation: 'pulse 1.2s infinite ease-in-out'
  },
  promptPillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    padding: '4px 0',
    width: '100%',
  },
  promptPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid var(--border-active)',
    background: 'var(--bg-card)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
  },
  
  
  voiceBtn: (listening) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: listening ? 'var(--red-dim)' : 'var(--bg-card)',
    border: listening ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-active)',
    color: listening ? 'var(--red)' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s',
    position: 'relative'
  }),
  inputField: {
    flex: 1,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-active)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s'
  },
  
  errorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--red-dim)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--red)'
  },
  convokraftHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-active)',
    background: 'transparent'
  },
  convokraftTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  convokraftEmbed: {
    flex: 1,
    height: '100%',
    minHeight: '400px',
    background: 'transparent',
    position: 'relative'
  },
  convokraftFooter: {
    padding: '12px 16px',
    fontSize: '10px',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border-active)',
    background: 'transparent',
    textAlign: 'center'
  },
  guidePanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  guideStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  stepCircle: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--amber-dim)',
    border: '1px solid var(--text-primary)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: '2px'
  },
  stepText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5
  }
}

/* â”€â”€ ANIMATION STYLE TAG (for pulsing dots and mic pulse) â”€â”€ */
if (typeof document !== 'undefined' && !document.getElementById('ai-pulse-style')) {
  const style = document.createElement('style')
  style.id = 'ai-pulse-style'
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: scale(0.6); opacity: 0.4; }
      50% { transform: scale(1.1); opacity: 1; }
    }
    @keyframes mic-glow {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .ai-mic-pulse { animation: mic-glow 1.5s infinite; }
    .ai-bubble:hover .ai-copy-btn { opacity: 1 !important; }
    .ai-pill:hover { border-color: var(--amber-dim) !important; color: var(--text-primary) !important; }
    .ai-markdown-content p { margin: 0 0 8px 0; }
    .ai-markdown-content p:last-child { margin: 0; }
    .ai-markdown-content ul { margin: 0 0 8px 0; padding-left: 20px; list-style-type: disc; }
    .ai-markdown-content ol { margin: 0 0 8px 0; padding-left: 20px; list-style-type: decimal; }
    .ai-markdown-content li { margin-bottom: 4px; }
    .ai-markdown-content strong { font-weight: 600; color: var(--text-primary); }
  `
  document.head.appendChild(style)
}

export default function AIAssistant() {
  const t = useT()
  const { lang } = useLang()

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('ai.welcome'),
      timestamp: new Date().toISOString(),
      recordCount: 0,
      usedLLM: false
    }
  ])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [expandedCites, setExpandedCites] = useState({})
  const [speakingId, setSpeakingId] = useState(null)
  const [audioRef, setAudioRef] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check if LLM is active
  const isLlmActive = true

  async function sendMessage(messageText) {
    const text = (messageText !== undefined ? messageText : input).trim()
    if (!text || sending) return

    const userMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    const loadingMessage = {
      id: Date.now() + '-loading',
      role: 'assistant',
      content: '',
      loading: true,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setSending(true)
    setError(null)

    const history = messages
      .filter(m => !m.loading && m.id !== 'welcome')
      .slice(-6)
      .map(m => ({
        role: m.role,
        content: m.content
      }))

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          message: text,
          language: lang,
          history: history
        })
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Query failed')

      const rawContent = json.data.response || '';
      const safeContent = stripLLMThinking(rawContent) || rawContent;
      const assistantMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: safeContent,
        timestamp: json.data.timestamp || new Date().toISOString(),
        intent: json.data.intent,
        entities: json.data.entities,
        retrievedRecords: json.data.retrievedRecords,
        recordCount: json.data.recordCount,
        usedLLM: json.data.usedLLM
      }

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        assistantMessage
      ])
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.filter(m => !m.loading))
    } finally {
      setSending(false)
    }
  }

  function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input not supported in this browser. Use Google Chrome.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e)
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  async function speakMessage(message) {
    // Stop any currently playing audio
    if (audioRef) {
      audioRef.pause()
      audioRef.currentTime = 0
      setSpeakingId(null)
    }

    if (speakingId === message.id) {
      setSpeakingId(null)
      return
    }

    try {
      setSpeakingId(message.id)
      
      // Detect language from message content
      const hasKannada = /[\u0C80-\u0CFF]/.test(message.content)
      const language = hasKannada ? 'kn' : 'en'
      
      // Strip markdown/tables before TTS to prevent cutoff/empty text
      let ttsText = message.content
        .replace(/\|.*?\|/g, '')
        .replace(/[*_~`#|]/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (!ttsText || ttsText.length < 5) ttsText = message.content.slice(0, 400)
      if (ttsText.length > 700) {
        const cut = ttsText.lastIndexOf('.', 700)
        ttsText = cut > 50 ? ttsText.slice(0, cut + 1) : ttsText.slice(0, 700)
      }
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, language: language, voice: language === 'kn' ? 'kn-IN-SapnaNeural' : 'en-US-AvaNeural' })
      })

      if (!res.ok) throw new Error('TTS failed')

      const audioBlob = await res.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        setSpeakingId(null)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setSpeakingId(null)
        URL.revokeObjectURL(audioUrl)
      }

      setAudioRef(audio)
      await audio.play()
    } catch (e) {
      console.error('TTS error:', e)
      setSpeakingId(null)
      setError('Voice playback failed')
    }
  }

  function exportConversationPDF() {
    const content = messages
      .filter(m => !m.loading)
      .map(m =>
        `[${new Date(m.timestamp).toLocaleString('en-IN')}] ${m.role === 'user' ? 'Officer' : 'ARISE'}: ${m.content}`
      ).join('\n\n')

    const blob = new Blob([
      `ARISE Intelligence Assistant\n` +
      `Conversation Export\n` +
      `Generated: ${new Date().toLocaleString('en-IN')}\n` +
      `Language: ${lang === 'kn' ? 'Kannada' : 'English'}\n\n` +
      `${'='.repeat(50)}\n\n` +
      content
    ], { type: 'text/plain;charset=utf-8' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ARISE_chat_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetChat() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('ai.welcome'),
        timestamp: new Date().toISOString(),
        recordCount: 0,
        usedLLM: false
      }
    ])
    setError(null)
  }

  function copyMessage(message) {
    navigator.clipboard.writeText(message.content)
    setCopiedId(message.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleCite = (id) => {
    setExpandedCites(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="arise-page-enter" style={S.page}>
      {/* â”€â”€ LEFT PANEL (CHAT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{...S.leftPanel, position: 'relative'}}>
        {/* Background Ambient Glows */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,119,255,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        {/* Header */}
        <div style={{...S.header, background: 'transparent', borderBottom: 'none', zIndex: 10}}>
          <div style={S.headerLeft}>
            <Bot color="var(--amber)" size={18} />
            <span style={S.title}>ARISE <span style={{color: 'var(--text-muted)'}}>· Intelligence Agent</span></span>
          </div>
          <div style={S.headerRight}>
            <button style={S.ghostBtn} title={t('ai.clearChat')} onClick={resetChat}>
              <RotateCcw size={18} />
            </button>
            <span style={S.langBadge}>{lang === 'kn' ? 'à²•à²¨à³à²¨à²¡' : 'EN'}</span>
          </div>
        </div>

        {/* Message Area */}
        <div style={{...S.messagesScroll, zIndex: 1}}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '-60px' }}>
              <div style={{ transform: 'scale(2.5)', margin: '80px 0' }}>
                <div className="cinematic-orb-container">
                  <div className="cinematic-orb"></div>
                  <div className="cinematic-orb-inner"></div>
                  <div className="cinematic-orb-highlight"></div>
                </div>
              </div>
              <button 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid rgba(0, 229, 255, 0.3)', 
                  color: 'var(--cyan)', 
                  padding: '12px 32px', 
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 0 20px rgba(0, 229, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {isListening ? <><Loader2 size={16} className="ai-spin"/> Listening...</> : <><Mic size={16}/> Talk to interrupt</>}
              </button>
            </div>
          )}
          {messages.map((m) => {
            const isUser = m.role === 'user'

            if (isUser) {
              return (
                <div key={m.id} style={S.msgUserRow}>
                  <div style={S.msgUserBubble}>
                    <div style={S.bubbleText}>{m.content}</div>
                    <div style={S.msgUserMeta}>
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={m.id} style={S.msgBotRow}>
                <div style={S.msgBotBubble} className="ai-bubble">
                  {/* Bot Header */}
                  <div style={S.msgBotHeader}>
                    <Bot size={14} color="var(--text-primary)" />
                    <span style={S.msgBotTitle}>ARISE</span>
                    {m.usedLLM && <span style={S.msgBotLlmBadge}>Catalyst GLM</span>}
                    <span style={S.msgBotMeta}>
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Copy & Speak Buttons */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                    <button
                      className="ai-copy-btn"
                      style={S.copyBtn}
                      onClick={() => speakMessage(m)}
                      title={speakingId === m.id ? 'Stop' : 'Read aloud'}
                    >
                      {speakingId === m.id ? (
                        <VolumeX size={14} color="var(--amber)" />
                      ) : (
                        <Volume2 size={14} />
                      )}
                    </button>
                    <button
                      className="ai-copy-btn"
                      style={S.copyBtn}
                      onClick={() => copyMessage(m)}
                    >
                      {copiedId === m.id ? (
                        <CheckCircle size={14} color="var(--green)" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Content or Loader */}
                  {m.loading ? (
                    <div style={S.dotsContainer}>
                      <span style={{ ...S.dots, animationDelay: '0s' }} />
                      <span style={{ ...S.dots, animationDelay: '0.2s' }} />
                      <span style={{ ...S.dots, animationDelay: '0.4s' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {t('ai.thinking')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={S.bubbleText} className="ai-markdown-content">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>

                      {/* Cited Records Collapsible */}
                      {m.retrievedRecords && m.retrievedRecords.length > 0 && (
                        <div>
                          <button style={S.citesToggle} onClick={() => toggleCite(m.id)}>
                            <Info size={12} />
                            {m.recordCount} {t('ai.cited')}
                            {expandedCites[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {expandedCites[m.id] && (
                            <div style={S.citesList}>
                              {m.retrievedRecords.map((rec, rIdx) => {
                                const type = rec.fir_uid ? 'FIR' : rec.offender_uid ? 'OFFENDER' : rec.district_name ? 'HOTSPOT' : 'RECORD'
                                const uid = rec.fir_uid || rec.offender_uid || rec.district_name || 'N/A'
                                const detail = rec.case_status || (rec.current_status ? `Bail: ${rec.current_status}` : '') || (rec.risk_tier ? `${rec.risk_tier} risk` : '') || ''

                                return (
                                  <div key={rIdx} style={S.citeRow}>
                                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>{type}</span>
                                    <span style={S.citeId}>{uid}</span>
                                    <span>{detail}</span>
                                  </div>
                                )
                              })}
                              <div style={S.citesFooter}>Data retrieved from ARISE DataStore</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {/* Spacer to guarantee scroll clearance for the absolute positioned input bar */}
          <div style={{ height: '220px', flexShrink: 0 }} />
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={S.inputBar}>
          {/* Prompt Chips */}
          {messages.length > 0 && (
            <div style={S.promptPillsRow} className="hide-scroll">
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  style={S.promptPill}
                  className="ai-pill"
                  disabled={sending}
                  onClick={() => sendMessage(chip.query)}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}

          <div style={S.inputRow}>
            <button
              style={S.voiceBtn(isListening)}
              className={isListening ? 'ai-mic-pulse' : ''}
              onClick={isListening ? stopVoiceInput : startVoiceInput}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              ref={inputRef}
              style={S.inputField}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
              placeholder={isListening ? t('ai.listening') : t('ai.placeholder')}
              disabled={sending}
            />

            <button
              style={S.sendBtn(input.trim().length > 0 && !sending)}
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
            >
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            </button>
          </div>

          {error && (
            <div style={S.errorRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setError(null)}
              >
                Ã—
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

