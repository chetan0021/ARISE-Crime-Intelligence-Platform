import { useState, useEffect, useRef } from 'react'
import {
  Send, Mic, MicOff, FileDown, Sparkles, Bot, User, Loader2,
  AlertCircle, ChevronDown, RotateCcw, Copy, CheckCircle, ChevronUp, Info
} from 'lucide-react'
import { useT } from '../i18n/useT'
import { useLang } from '../context/LanguageContext'
import ReactMarkdown from 'react-markdown'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics'

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

      const assistantMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: json.data.response,
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

                  {/* Copy Button */}
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

