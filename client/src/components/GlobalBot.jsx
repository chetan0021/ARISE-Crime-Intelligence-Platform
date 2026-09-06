import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, Maximize2, Minimize2, Copy, CheckCircle, Mic, MicOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import CopBot from './CopBot';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

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

export default function GlobalBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am Zia, your AI assistant. I have deep knowledge of the ARISE databases and your current screen. How can I help you?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [botState, setBotState] = useState('idle');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const location = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, expanded]);

  const toggleBot = () => setIsOpen(!isOpen);

  async function sendMessage(messageText) {
    const text = (messageText !== undefined ? messageText : input).trim();
    if (!text || sending) return;

    const userMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const loadingMessage = {
      id: Date.now() + '-loading',
      role: 'assistant',
      content: '',
      loading: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setSending(true);
    setBotState('thinking');

    const history = messages
      .filter(m => !m.loading && m.id !== 'welcome')
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          message: text,
          language: lang,
          history: history,
          pageContext: location.pathname
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Query failed');

      const rawContent = json.data.response || '';
      const safeContent = stripLLMThinking(rawContent) || rawContent;
      const assistantMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: safeContent,
        timestamp: json.data.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev.filter(m => !m.loading), assistantMessage]);
      setBotState('happy');
      setTimeout(() => setBotState('idle'), 3000);
    } catch (e) {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          id: Date.now() + '-err',
          role: 'assistant',
          content: 'I encountered an error while processing that request. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
      setBotState('error');
      setTimeout(() => setBotState('idle'), 3000);
    } finally {
      setSending(false);
    }
  }

  function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  const copyMessage = (message) => {
    navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const S = {
    floatingBtn: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '60px',
      height: '75px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    },
    panel: {
      position: 'fixed',
      bottom: '100px',
      right: '24px',
      width: expanded ? '600px' : '380px',
      height: expanded ? '80vh' : '550px',
      background: 'rgba(4, 18, 38, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 229, 255, 0.3)',
      borderRadius: '16px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,229,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10005,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      transformOrigin: 'bottom right',
      transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none'
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid rgba(0,229,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(0, 119, 255, 0.05)'
    },
    titleRow: { display: 'flex', alignItems: 'center', gap: '10px' },
    title: { fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' },
    subtitle: { fontSize: '11px', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '1px' },
    actionBtns: { display: 'flex', alignItems: 'center', gap: '12px' },
    iconBtn: { background: 'none', border: 'none', color: '#88a0b5', cursor: 'pointer', padding: 0, display: 'flex' },
    messagesArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
    userBubbleRow: { display: 'flex', justifyContent: 'flex-end' },
    userBubble: { background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', maxWidth: '85%', color: '#fff', fontSize: '13px', lineHeight: 1.5 },
    botBubbleRow: { display: 'flex', justifyContent: 'flex-start' },
    botBubble: { background: 'rgba(0, 119, 255, 0.08)', border: '1px solid rgba(0, 119, 255, 0.2)', borderRadius: '16px 16px 16px 4px', padding: '14px 18px', maxWidth: '90%', position: 'relative', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 },
    copyBtn: { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
    markdownContent: { 
      fontFamily: "var(--font-sans)",
      wordBreak: 'break-word',
    },
    inputArea: { padding: '16px', borderTop: '1px solid rgba(0,229,255,0.1)', background: 'rgba(4, 18, 38, 0.95)' },
    inputWrapper: { display: 'flex', alignItems: 'flex-end', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '8px 12px' },
    input: { flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', resize: 'none', maxHeight: '120px', minHeight: '24px', fontFamily: "var(--font-sans)" },
    sendBtn: { background: 'transparent', border: 'none', color: input.trim() ? 'var(--cyan)' : '#475569', cursor: input.trim() ? 'pointer' : 'default', padding: '4px' },
    micBtn: { background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent', border: 'none', color: isListening ? '#ef4444' : '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }
  };

  return (
    <>
      <style>{`
        .global-bot-md table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        .global-bot-md th, .global-bot-md td { border: 1px solid rgba(255,255,255,0.1); padding: 8px; text-align: left; }
        .global-bot-md th { background: rgba(0,119,255,0.1); color: var(--cyan); }
        .global-bot-md pre { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; overflow-x: auto; border: 1px solid rgba(255,255,255,0.05); }
        .global-bot-md code { font-family: monospace; font-size: 11px; color: #a5b4fc; }
        .global-bot-md ul, .global-bot-md ol { margin-left: 20px; margin-bottom: 10px; }
        
        @keyframes botBreathe {
          0% { filter: blur(8px) brightness(1); transform: scale(1); }
          50% { filter: blur(12px) brightness(1.5); transform: scale(1.15); }
          100% { filter: blur(8px) brightness(1); transform: scale(1); }
        }
        
        @keyframes botFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
      <div 
        style={{...S.floatingBtn, display: isOpen ? 'none' : 'flex'}} 
      >
        <CopBot currentState={botState} onClick={toggleBot} />
      </div>

      <div style={S.panel}>
        <div style={S.header}>
          <div style={S.titleRow}>
            <div style={{ padding: '6px', background: 'rgba(0,119,255,0.2)', borderRadius: '8px' }}>
              <Bot size={18} color="var(--cyan)" />
            </div>
            <div>
              <div style={S.title}>Zia AI</div>
              <div style={S.subtitle}>System Assistant</div>
            </div>
          </div>
          <div style={S.actionBtns}>
            <button style={S.iconBtn} onClick={() => setExpanded(!expanded)}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button style={S.iconBtn} onClick={toggleBot}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={S.messagesArea}>
          {messages.map(m => (
            <div key={m.id} style={m.role === 'user' ? S.userBubbleRow : S.botBubbleRow}>
              <div style={m.role === 'user' ? S.userBubble : S.botBubble}>
                {m.role === 'assistant' && (
                  <button style={S.copyBtn} onClick={() => copyMessage(m)}>
                    {copiedId === m.id ? <CheckCircle size={14} color="var(--green)" /> : <Copy size={14} />}
                  </button>
                )}
                {m.loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)' }}>
                    <Loader2 size={14} className="ai-spin" /> Thinking...
                  </div>
                ) : (
                  <div className="global-bot-md">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={S.inputArea}>
          <div style={S.inputWrapper}>
            <button style={S.micBtn} onClick={isListening ? stopVoiceInput : startVoiceInput}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <textarea 
              style={S.input}
              placeholder="Ask Zia about tables, data, or analytics..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
            />
            <button style={S.sendBtn} onClick={() => sendMessage()}>
              <Send size={18} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: '#64748b' }}>
            Context: {location.pathname}
          </div>
        </div>
      </div>
    </>
  );
}
