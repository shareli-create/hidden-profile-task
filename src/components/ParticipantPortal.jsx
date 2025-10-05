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
        setError('אין מפגש פעיל כרגע. המתן שהמדריך יתחיל מפגש.');
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
      setError('שגיאה בחיבור למערכת. נסה שוב.');
    } finally {
      setCheckingSession(false);
    }
  };

  const joinSession = async () => {
    if (!name.trim()) {
      setError('נדרש להכניס שם');
      return;
    }

    if (!activeSessionId) {
      setError('אין מפגש פעיל. המתן שהמדריך יתחיל מפגש.');
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
      setError('שגיאה בהצטרפות למפגש. נסה שוב.');
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
            <button onClick={onClose} className="mr-4 text-red-700 hover:text-red-900 text-xl">×</button>
          )}
        </div>
      </div>
    );
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p>מחפש מפגש פעיל...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <UserPlus className="w-16 h-16 mx-auto mb-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-center mb-6">הצטרפות למשימה</h2>
          
          <ErrorDisplay message={error} onClose={error.includes('אין מפגש פעיל') ? null : () => setError('')} />
          
          {activeSessionId ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg text-center mb-4">
                <p className="text-sm text-green-800">✓ מפגש פעיל נמצא</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">שם או כינוי</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="הכנס שם או כינוי לבחירתך"
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
                {loading ? 'מצטרף...' : 'הצטרף למשימה'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="p-6 bg-yellow-50 rounded-lg mb-4">
                <p className="text-gray-700">ממתין שהמדריך יתחיל מפגש...</p>
              </div>
              <button
                onClick={checkForActiveSession}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                בדוק שוב
              </button>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">הוראות למשתתפים:</h3>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• הכנס את שמך או כינוי</li>
              <li>• לחץ "הצטרף למשימה"</li>
              <li>• עקוב אחר ההוראות במשימה</li>
              <li>• בחר את המועמד הטוב ביותר לדעתך</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantPortal;