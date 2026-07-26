import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cognitivecops-60073718159.development.catalystserverless.in/server/get_crime_analytics';

const ZiaTest = () => {
  const { lang } = useLang();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [playbackRate, setPlaybackRate] = useState(1.15); // slightly faster than normal to reduce gaps
  const [speakDelay, setSpeakDelay] = useState(600); // ms delay before audio starts

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleQuery(text);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("SpeechRecognition not supported in this browser.");
    }
  }, [lang]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'kan' ? 'kn-IN' : 'en-IN';
    }
  }, [lang]);

  // Sync playback rate whenever slider changes and audio is playing
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleQuery = async (queryText) => {
    if (!queryText.trim()) return;

    setChatLog(prev => [...prev, { role: 'user', content: queryText }]);
    setIsThinking(true);

    try {
      // 1. Send query to GLM backend
      const res = await fetch(`${API_BASE}/api/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ message: queryText, history: [], language: lang === 'kan' ? 'kn' : 'en' })
      });
      const data = await res.json();

      const replyText = data.data?.response || data.reply || "I'm sorry, I couldn't process that.";
      setChatLog(prev => [...prev, { role: 'assistant', content: replyText }]);
      setIsThinking(false);

      // 2. Clean text for TTS
      const cleanSpeechText = replyText
        .replace(/[*_~`#]/g, '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/>/g, '')
        .trim();

      // 3. Fetch TTS audio
      const ttsRes = await fetch(`http://localhost:3001/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            audioRef.current.play();
            setIsPlaying(true);
            audioRef.current.onended = () => {
              setIsPlaying(false);
            };
          }
        }, speakDelay);
      } else {
        console.error("TTS generation failed");
      }

    } catch (error) {
      console.error("Error in Zia flow:", error);
      setIsThinking(false);
    }
  };

  const speedLabel = playbackRate < 0.9 ? 'Slow' : playbackRate < 1.1 ? 'Normal' : playbackRate < 1.4 ? 'Fast' : 'Very Fast';

  return (
    <div className="p-8 space-y-6 text-white min-h-screen bg-gray-900">
      <h2 className="text-2xl font-bold text-amber-500">Zia Voice Assistant Test Page</h2>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <button
            onClick={toggleListen}
            className={`px-6 py-3 rounded-full font-bold transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-amber-500 hover:bg-amber-600 text-black'}`}
          >
            {isListening ? 'Listening...' : 'Click to Speak'}
          </button>

          {isThinking && <span className="text-amber-400 animate-pulse">Zia is thinking...</span>}
          {isPlaying && <span className="text-green-400 animate-pulse">Zia is speaking...</span>}

          {/* Speed Slider */}
          <div className="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-lg border border-gray-600">
            <span className="text-xs text-gray-400 whitespace-nowrap">🔊 Speed:</span>
            <input
              type="range"
              min="0.7"
              max="1.8"
              step="0.05"
              value={playbackRate}
              onChange={e => setPlaybackRate(parseFloat(e.target.value))}
              className="w-28 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-amber-400 w-16">{speedLabel} ({playbackRate.toFixed(2)}x)</span>
          </div>

          {/* Speak Delay Slider */}
          <div className="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-lg border border-gray-600">
            <span className="text-xs text-gray-400 whitespace-nowrap">⏱ Delay:</span>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={speakDelay}
              onChange={e => setSpeakDelay(parseInt(e.target.value))}
              className="w-28 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-amber-400 w-16">{(speakDelay / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Chat Log */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {chatLog.map((msg, i) => (
            <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-blue-900/40 ml-12 border border-blue-800' : 'bg-gray-700 mr-12 border border-gray-600'}`}>
              <strong className={msg.role === 'user' ? 'text-blue-400' : 'text-amber-400'}>{msg.role === 'user' ? 'You' : 'Zia'}:</strong>
              <div className="mt-2 text-gray-200 whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default ZiaTest;
