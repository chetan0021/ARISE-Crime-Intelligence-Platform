import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useZia } from '../context/ZiaContext';
import { Mic } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

export default function ZiaOrb({ variant = 'default' }) {
  const { lang } = useLang();
  const { playbackRate, speakDelay } = useZia();
  const navigate = useNavigate();
  const location = useLocation();

  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');

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
      recognitionRef.current.lang = lang === 'kan' ? 'kn-IN' : 'en-IN';
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
        navigate('/dashboard/hotspots');
      } else if (q.includes('analytic') || q.includes('graph') || q.includes('ವಿಶ್ಲೇಷಣೆ')) {
        navigate('/dashboard/analytics');
      } else if (q.includes('network') || q.includes('link') || q.includes('ನೆಟ್ವರ್ಕ್')) {
        navigate('/dashboard/network');
      } else if (q.includes('offender') || q.includes('criminal') || q.includes('ಅಪರಾಧಿ')) {
        navigate('/dashboard/offenders');
      } else if (q.includes('predict') || q.includes('ಭವಿಷ್ಯ')) {
        navigate('/dashboard/predictions');
      } else if (q.includes('socio') || q.includes('economic') || q.includes('ಆರ್ಥಿಕ')) {
        navigate('/dashboard/socioeconomic');
      } else if (q.includes('financ') || q.includes('ಹಣಕಾಸು')) {
        navigate('/dashboard/financial');
      } else if (q.includes('search') || q.includes('ಹುಡುಕು')) {
        navigate('/dashboard/search');
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
          history: [], 
          language: lang === 'kan' ? 'kn' : 'en',
          pageContext: location.pathname
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const replyText = data.data?.response || data.reply || "I'm sorry, I couldn't process that.";
      
      setIsThinking(false);

      // 2. Clean text for TTS
      const cleanSpeechText = replyText
        .replace(/[*_~`#]/g, '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/>/g, '')
        .trim();

      // 3. Fetch TTS audio
      // Bypassing Catalyst CORS preflight
      const ttsRes = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ text: cleanSpeechText, language: lang === 'kan' ? 'kn' : 'en' })
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
    bottom: '24px',
    right: '24px',
    transform: 'scale(0.5)',
    transformOrigin: 'bottom right',
    zIndex: 9999
  } : {};

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="zia-orb-container" onClick={toggleListen} style={{ position: 'relative' }}>
        <div className={`zia-led-ring ${getRingClass()}`}></div>
        <div className="zia-knob" title="Click to speak to Zia">
          <div className="zia-knob-texture"></div>
          <Mic size={40} className={isListening ? 'text-red-500' : isThinking ? 'text-amber-500' : isPlaying ? 'text-emerald-500' : 'text-gray-400'} style={{ zIndex: 20 }} />
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
