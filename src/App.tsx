import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ProjectSettings } from './components/ProjectSettings';
import { ComingSoon } from './components/ComingSoon';
import { LiveEvent } from './components/LiveEvent';
import { TourProvider } from './components/TourContext';
import { TourOverlay } from './components/TourOverlay';

const STORAGE_KEY = 'lbkh_liaison_state';

interface AppState {
  isLive: boolean;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return {
    isLive: false,
    branding: {
      logo: '/lbkh-logo.png',
      primaryColor: '#40E0D0',
      secondaryColor: '#00B5A8',
      companyName: 'YOUR COMPANY',
    },
  };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export default function App() {
  const initial = loadState();
  const [isLive, setIsLiveRaw] = useState(initial.isLive);
  const [branding, setBrandingRaw] = useState(initial.branding);

  // Persist every change to localStorage
  useEffect(() => {
    saveState({ isLive, branding });
  }, [isLive, branding]);

  const setIsLive = (val: boolean) => setIsLiveRaw(val);
  const setBranding = (b: typeof branding) => setBrandingRaw(b);

  return (
    <TourProvider>
      <Router>
        {/* Tour overlay renders on top of everything, across all routes */}
        <TourOverlay />

        <Routes>
          {/* Main Dashboard Route */}
          <Route
            path="/"
            element={isLive ? <Dashboard branding={branding} /> : <ComingSoon branding={branding} />}
          />

          {/* Settings Route (Always accessible for configuration) */}
          <Route
            path="/settings"
            element={<ProjectSettings isLive={isLive} setIsLive={setIsLive} branding={branding} setBranding={setBranding} />}
          />

          {/* Live Event Route */}
          <Route
            path="/event"
            element={<LiveEvent branding={branding} />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </TourProvider>
  );
}
