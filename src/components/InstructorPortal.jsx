import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Users, CheckCircle, BarChart3, Trash2 } from 'lucide-react';
import {
  createNewActiveSession,
  getActiveSession,
  getParticipants,
  createGroups,
  updateSessionStage,
  subscribeToSession,
  deleteAllData
} from '../firebase/database';

const InstructorPortal = () => {
  const [currentStage, setCurrentStage] = useState('loading');
  const [sessionId, setSessionId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, {
      onParticipantsUpdate: (participantsList) => {
        setParticipants(participantsList);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const checkActiveSession = async () => {
    try {
      const activeSession = await getActiveSession();
      if (activeSession) {
        setSessionId(activeSession.id);
        setCurrentStage('waiting');
      } else {
        setCurrentStage('setup');
      }
    } catch (error) {
      console.error('Error checking active session:', error);
      setCurrentStage('setup');
    }
  };

  const createNewSession = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createNewActiveSession({
        name: `Hidden Profile Task - ${new Date().toLocaleDateString('en-US')}`,
        createdBy: 'instructor'
      });
      
      if (result.success) {
        setSessionId(result.id);
        setCurrentStage('waiting');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Error creating the session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('This will permanently delete all data from the server! Continue?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await deleteAllData();
      setSessionId('');
      setParticipants([]);
      setCurrentStage('setup');
    } catch (error) {
      console.error('Error deleting all data:', error);
      setError('Error deleting the data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTask = async () => {
    if (participants.length < 3) {
      setError('At least 3 participants are needed to start the task');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const newGroups = [];
      let groupId = 1;

      for (let i = 0; i < shuffled.length; i += 3) {
        const group = shuffled.slice(i, i + 3);
        
        if (group.length === 3) {
          newGroups.push({
            name: `Group ${groupId}`,
            groupKey: `group${groupId}`,
            members: group.map(p => ({ id: p.id, name: p.name }))
          });
          groupId++;
        } else if (group.length === 2 && newGroups.length > 0) {
          newGroups[newGroups.length - 1].members.push(
            { id: group[0].id, name: group[0].name },
            { id: group[1].id, name: group[1].name }
          );
        } else if (group.length === 1 && newGroups.length > 0) {
          newGroups[newGroups.length - 1].members.push({
            id: group[0].id,
            name: group[0].name
          });
        }
      }

      console.log('Creating groups:', newGroups);

      const result = await createGroups(sessionId, newGroups);
      if (result.success) {
        await updateSessionStage(sessionId, 'task');
        navigate(`/instructor/session/${sessionId}`);
      }
    } catch (error) {
      console.error('Error starting task:', error);
      setError('Error starting the task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ErrorDisplay = ({ message, onClose }) => {
    if (!message) return null;
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        <div className="flex items-center justify-between">
          <span>{message}</span>
          <button onClick={onClose} className="ml-4 text-red-700 hover:text-red-900">×</button>
        </div>
      </div>
    );
  };

  if (currentStage === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6 flex items-center justify-center" dir="ltr">
        <div className="animate-spin w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full"></div>
      </div>
    );
  }

  if (currentStage === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6" dir="ltr">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-green-800">
              Instructor Portal - Hidden Profile Task
            </h1>
            
            <div className="text-center mb-8">
              <Eye className="w-24 h-24 mx-auto mb-6 text-green-600" />
              <p className="text-gray-600 mb-6">
                Welcome to the instructor portal. Start a new session to begin.
              </p>
              
              <button
                onClick={createNewSession}
                disabled={loading}
                className="bg-green-600 text-white px-8 py-4 text-lg rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating session...' : 'Start a new session'}
              </button>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Start a new session</li>
                <li>• Share this link with the participants: <code className="bg-white px-2 py-1 rounded">{window.location.origin}/participant</code></li>
                <li>• Wait for all participants to join</li>
                <li>• Start the task</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'waiting') {
    const participantUrl = `${window.location.origin}/participant`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6" dir="ltr">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Waiting for Participants</h2>
            
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold mb-4">Participant link:</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={participantUrl} 
                  readOnly 
                  className="flex-1 p-3 bg-white border rounded text-center font-medium"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(participantUrl);
                    alert('Link copied!');
                  }}
                  className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Share this link with all participants
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Registered participants ({participants.length}):
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <div className="animate-pulse text-gray-500">
                      Waiting for participants...
                    </div>
                  </div>
                ) : (
                  participants.map((participant, idx) => (
                    <div key={participant.id || idx} className="bg-gray-50 p-3 rounded-lg flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <span>{participant.name}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {participant.joinedAt && new Date(participant.joinedAt.toDate()).toLocaleTimeString('en-US')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={startTask}
                disabled={participants.length < 3 || loading}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Starting...' : `Start task (${participants.length} participants)`}
              </button>
              
              {participants.length < 3 && (
                <p className="text-sm text-red-600">
                  At least 3 participants are needed to start the task
                </p>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate(`/instructor/session/${sessionId}`)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />
                  View results
                </button>
                
                <button
                  onClick={handleDeleteAll}
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  {loading ? 'Deleting...' : 'Delete everything from the server'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InstructorPortal;