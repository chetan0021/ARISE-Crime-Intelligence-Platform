import React, { createContext, useContext, useState, useEffect } from 'react';

const ZiaContext = createContext();

export function ZiaProvider({ children }) {
  // Try to load from localStorage, default to 1.15 speed and 600ms delay
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem('zia_speed');
    return saved ? parseFloat(saved) : 1.15;
  });

  const [speakDelay, setSpeakDelay] = useState(() => {
    const saved = localStorage.getItem('zia_delay');
    return saved ? parseInt(saved, 10) : 600;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('zia_speed', playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    localStorage.setItem('zia_delay', speakDelay);
  }, [speakDelay]);

  return (
    <ZiaContext.Provider value={{ playbackRate, setPlaybackRate, speakDelay, setSpeakDelay }}>
      {children}
    </ZiaContext.Provider>
  );
}

export function useZia() {
  return useContext(ZiaContext);
}
