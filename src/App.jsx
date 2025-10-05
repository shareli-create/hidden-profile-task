import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InstructorPortal from './components/InstructorPortal';
import ParticipantPortal from './components/ParticipantPortal';
import SessionTask from './components/SessionTask';
import SessionAnalysis from './components/SessionAnalysis';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Redirect root to instructor by default */}
          <Route path="/" element={<Navigate to="/instructor" replace />} />
          
          {/* Instructor routes */}
          <Route path="/instructor" element={<InstructorPortal />} />
          <Route path="/instructor/session/:sessionId" element={<SessionAnalysis />} />
          
          {/* Participant routes */}
          <Route path="/participant" element={<ParticipantPortal />} />
          <Route path="/join/:sessionCode" element={<ParticipantPortal />} />
          <Route path="/session/:sessionId/task" element={<SessionTask />} />
          
          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/instructor" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;