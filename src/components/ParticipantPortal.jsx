import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import {
  getActiveSession,
  addParticipant
} from '../firebase/database';

const ParticipantPortal = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const navigate = useNavigate();

  // Check for active session on mount
  useEffect(() => {
    checkForActiveSession();
  }, []);

  const checkForActiveSession = async () => {
    try {
      const session = await getActiveSession();
      if (session) {
        setActiveSessionId(session.id);
      } else {
        setError('There is no active session right now. Wait for the instructor to start one.');
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
      setError('Error connecting to the system. Please try again.');
    } finally {
      setCheckingSession(false);
    }
  };

  const joinSession = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!activeSessionId) {
      setError('There is no active session. Wait for the instructor to start one.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const result = await addParticipant(activeSessionId, {
        name: name.trim(),
        status: 'waiting'
      });
      
      if (result.success) {
        navigate(`/session/${activeSessionId}/task`, {
          state: { 
            participantId: result.id, 
            participantName: name.trim(),
            sessionId: activeSessionId
          }
        });
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Error joining the session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ErrorDisplay = ({ message, onClose }) => {
    if (!message) return null;
    
    return (
      <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <div className="flex items-center justify-between">
          <span>{message}</span>
          {onClose && (
            <button onClick={onClose} className="ml-4 text-red-700 hover:text-red-900 text-xl">×</button>
          )}
        </div>
      </div>
    );
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center" dir="ltr">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p>Looking for an active session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="ltr">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <UserPlus className="w-16 h-16 mx-auto mb-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-center mb-6">Join the Task</h2>
          
          <ErrorDisplay message={error} onClose={error.includes('no active session') ? null : () => setError('')} />
          
          {activeSessionId ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg text-center mb-4">
                <p className="text-sm text-green-800">✓ Active session found</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Name or nickname</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter a name or nickname of your choice"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading && name.trim()) {
                      joinSession();
                    }
                  }}
                />
              </div>
              
              <button
                onClick={joinSession}
                disabled={!name.trim() || loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join the task'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="p-6 bg-yellow-50 rounded-lg mb-4">
                <p className="text-gray-700">Waiting for the instructor to start a session...</p>
              </div>
              <button
                onClick={checkForActiveSession}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Check again
              </button>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">Instructions for participants:</h3>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Enter your name or a nickname</li>
              <li>• Click "Join the task"</li>
              <li>• Follow the instructions in the task</li>
              <li>• Choose the candidate you think is best</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantPortal;