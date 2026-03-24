import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ProjectSettings } from './components/ProjectSettings';
import { ComingSoon } from './components/ComingSoon';
import { LiveEvent } from './components/LiveEvent';

export default function App() {
  const [isLive, setIsLive] = useState(false);
  const [branding, setBranding] = useState({
    logo: '', // Empty means use default Krambu logo
    primaryColor: '#a855f7', // Purple-500
    secondaryColor: '#06b6d4', // Cyan-500
    companyName: 'KRAMBU'
  });

  return (
    <Router>
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
  );
}
