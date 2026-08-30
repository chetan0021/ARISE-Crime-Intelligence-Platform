import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, Maximize2, Minimize2, Copy, CheckCircle, Mic, MicOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import CopBot from './CopBot';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

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

      const assistantMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: json.data.response,
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
