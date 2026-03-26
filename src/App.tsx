import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ProjectSettings } from './components/ProjectSettings';
import { ComingSoon } from './components/ComingSoon';
import { LiveEvent } from './components/LiveEvent';
import { TourProvider } from './components/TourContext';
import { TourOverlay } from './components/TourOverlay';

export default function App() {
  const [isLive, setIsLive] = useState(false);
  const [branding, setBranding] = useState({
    logo: '/lbkh-logo.png', // Default LBKH logo — replace via Brand Identity in Settings
    primaryColor: '#40E0D0', // LBKH teal — configurable in Settings
    secondaryColor: '#00B5A8', // LBKH teal dark — configurable in Settings
    companyName: 'YOUR COMPANY'
  });

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
