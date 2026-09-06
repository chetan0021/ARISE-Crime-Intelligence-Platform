import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useZia } from '../context/ZiaContext';
import { Mic } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

function stripLLMThinking(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let t = raw;

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

  if (!t) {
    t = raw.replace(/<think[\s\S]*?<\/think>/gi, ' ').replace(/```think[\s\S]*?```/gi, ' ').trim();
  }
  return t;
}

export default function ZiaOrb({ variant = 'default' }) {
  const { lang } = useLang();
  const { playbackRate, speakDelay } = useZia();
  const navigate = useNavigate();
  const location = useLocation();

  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [history, setHistory] = useState([]);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const isMini = variant === 'mini';

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (interim) {
          setTranscriptText(interim);
        }
        
        if (final) {
          setTranscriptText(final);
          handleQuery(final);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [lang]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    }
  }, [lang]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isPlaying]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscriptText('');
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        // Autoplay unlock for Safari/Chrome
        audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.volume = 1;
        }).catch(() => {});
      }
      setTranscriptText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleQuery = async (queryText) => {
    if (!queryText.trim()) return;

    // Smart Routing Logic - Now Requires Explicit Intent
    const q = queryText.toLowerCase();
    const isNavIntent = q.includes('go to') || q.includes('take me to') || q.includes('show page') || q.includes('show me') || q.includes('navigate');
    
    if (isNavIntent) {
      if (q.includes('hotspot') || q.includes('map') || q.includes('ನಕ್ಷೆ') || q.includes('ಹಾಟ್')) {
        navigate('/dashboard/hotspots'); return;
      } else if (q.includes('analytic') || q.includes('graph') || q.includes('ವಿಶ್ಲೇಷಣೆ')) {
        navigate('/dashboard/analytics'); return;
      } else if (q.includes('network') || q.includes('link') || q.includes('ನೆಟ್ವರ್ಕ್')) {
        navigate('/dashboard/network'); return;
      } else if (q.includes('offender') || q.includes('criminal') || q.includes('ಅಪರಾಧಿ')) {
        navigate('/dashboard/offenders'); return;
      } else if (q.includes('predict') || q.includes('ಭವಿಷ್ಯ')) {
        navigate('/dashboard/predictions'); return;
      } else if (q.includes('socio') || q.includes('economic') || q.includes('ಆರ್ಥಿಕ')) {
        navigate('/dashboard/socioeconomic'); return;
      } else if (q.includes('financ') || q.includes('ಹಣಕಾಸು')) {
        navigate('/dashboard/financial'); return;
      } else if (q.includes('search') || q.includes('ಹುಡುಕು')) {
        navigate('/dashboard/search'); return;
      }
    }

    setIsThinking(true);

    try {
      // 1. Send query to GLM backend
      // Bypassing Catalyst CORS preflight by using text/plain (simple request)
      const res = await fetch(`${API_BASE}/api/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ 
          message: queryText, 
          history: history, 
          language: lang === 'kn' ? 'kn' : 'en',
          pageContext: location.pathname,
          voice_mode: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const rawReply = data.data?.response || data.reply || "I'm sorry, I couldn't process that.";
      const replyText = stripLLMThinking(rawReply);
      
      setHistory(prev => [...prev.slice(-4), {role: 'user', content: queryText}, {role: 'assistant', content: replyText}]);
      setIsThinking(false);

      // 2. Clean text for TTS - strip markdown, emojis, limit length
      let cleanSpeechText = stripLLMThinking(replyText)
        .replace(/\|.*?\|/g, '')           // strip table rows
        .replace(/[*_~`#|]/g, '')          // strip markdown symbols
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/>/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      // Fallback: if stripping left nothing, use first 300 chars of raw reply
      if (!cleanSpeechText || cleanSpeechText.length < 5) {
        cleanSpeechText = replyText.replace(/[*_~`#|]/g, '').trim().slice(0, 300);
      }
      // Limit to 700 chars so TTS completes cleanly
      if (cleanSpeechText.length > 700) {
        const cut = cleanSpeechText.lastIndexOf('.', 700);
        cleanSpeechText = cut > 50 ? cleanSpeechText.slice(0, cut + 1) : cleanSpeechText.slice(0, 700);
      }

      // 3. Fetch TTS audio
      // Bypassing Catalyst CORS preflight
      const ttsRes = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ text: cleanSpeechText, language: lang === 'kn' ? 'kn' : 'en', voice: lang === 'kn' ? 'kn-IN-SapnaNeural' : 'en-US-AvaNeural' })
      });

      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // 4. Wait for the delay, then play with current speed setting
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.playbackRate = playbackRate;
            audioRef.current.play().catch(e => {
              console.error("Audio playback prevented by browser:", e);
              setIsPlaying(false);
            });
            setIsPlaying(true);
            audioRef.current.onended = () => {
              setIsPlaying(false);
              setTranscriptText('');
            };
          }
        }, speakDelay);
      } else {
        const errText = await ttsRes.text();
        console.error("TTS generation failed:", errText);
        setTranscriptText("TTS Error");
      }

    } catch (error) {
      console.error("Error in Zia flow:", error);
      setIsThinking(false);
      setTranscriptText("Error: " + error.message);
    }
  };

  const getRingClass = () => {
    if (isListening) return 'listening';
    if (isThinking) return 'thinking';
    if (isPlaying) return 'speaking';
    return '';
  };

  // Mini variant styling overrides
  const containerStyle = isMini ? {
    position: 'fixed',
    bottom: '100px',
    right: '24px',
    transform: 'scale(0.35)',
    transformOrigin: 'bottom right',
    zIndex: 10000
  } : {};

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="zia-orb-container" onClick={toggleListen} style={{ position: 'relative' }}>
        <div className={`zia-led-ring ${getRingClass()}`}></div>
        <div className="zia-knob" title="Click to speak to Zia">
          <div className="zia-knob-texture"></div>
          <Mic size={40} className={isListening ? 'text-red-500' : isThinking ? 'text-amber-500' : isPlaying ? 'text-emerald-500' : 'text-slate-800'} style={{ zIndex: 20, filter: isListening ? 'none' : 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.7))' }} />
        </div>
        <audio ref={audioRef} className="hidden" />
      </div>
      
      {/* Live Transcript / Confirmation Toast */}
      {transcriptText && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          color: 'var(--amber)',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: isMini ? '18px' : '11px', // scaled by 0.5 in mini mode
          fontWeight: 400,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          maxWidth: isMini ? '350px' : '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          transition: 'all 0.3s ease'
        }}>
          {transcriptText}
        </div>
      )}
    </div>
  );
}
