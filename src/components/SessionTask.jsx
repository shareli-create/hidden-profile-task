import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Users, UserCheck } from 'lucide-react';
import {
  getGroups,
  subscribeToSession,
  markParticipantReady,
  submitDecision,
  submitGroupRatings
} from '../firebase/database';
import { candidates } from '../data/candidates';

const SessionTask = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentStage, setCurrentStage] = useState('waiting');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [groupDecision, setGroupDecision] = useState('');
  const [infoRatings, setInfoRatings] = useState({});
  const [groups, setGroups] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myGroup, setMyGroup] = useState(null);
  const [groupReadyStatus, setGroupReadyStatus] = useState({});

  const participantId = location.state?.participantId;
  const participantName = location.state?.participantName;

  if (!participantId || !participantName) {
    navigate('/participant');
    return null;
  }

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, {
      onSessionUpdate: (session) => {
        setSessionData(session);
        if (session && session.currentStage === 'task' && currentStage === 'waiting') {
          setCurrentStage('group_assignment');
        }
      },
      onGroupsUpdate: (groupsList) => {
        setGroups(groupsList);
        
        const userGroup = groupsList.find(g => 
          g.members && g.members.some(m => m.id === participantId)
        );
        
        if (userGroup) {
          console.log('Found user group:', userGroup);
          setMyGroup(userGroup);
          
          if (userGroup.readyMembers) {
            setGroupReadyStatus(userGroup.readyMembers);
            
            const allReady = userGroup.members.every(m => 
              userGroup.readyMembers[m.id]
            );
            
            if (allReady && currentStage === 'waiting_for_others') {
              setCurrentStage('group_decision_entry');
            }
          }
          
          if (userGroup.groupDecision && !userGroup.ratings && currentStage === 'group_decision_entry') {
            setGroupDecision(userGroup.groupDecision.choice);
            setCurrentStage('rate_information');
          }
          
          if (userGroup.ratings && currentStage === 'rate_information') {
            setCurrentStage('complete');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, currentStage, participantId]);

  const getMyInfo = () => {
    if (!myGroup) return null;
    
    const myMemberIndex = myGroup.members.findIndex(m => m.id === participantId);
    const memberKey = `member${myMemberIndex % 3}`;
    
    return candidates.map(candidate => {
      const myUniqueInfo = candidate.unique_info[memberKey];
      return {
        ...candidate,
        my_info: [
          ...candidate.shared_info,
          ...(myUniqueInfo ? [myUniqueInfo] : [])
        ]
      };
    });
  };

  const getAllGroupInfoPieces = () => {
    if (!myGroup) return [];
    
    const allPieces = [];
    
    candidates.forEach(candidate => {
      candidate.shared_info.forEach((info, idx) => {
        allPieces.push({
          candidate: candidate.name,
          candidateId: candidate.id,
          text: info,
          id: `${candidate.id}_shared_${idx}`,
          type: 'shared'
        });
      });
      
      Object.entries(candidate.unique_info).forEach(([memberKey, info]) => {
        allPieces.push({
          candidate: candidate.name,
          candidateId: candidate.id,
          text: info,
          id: `${candidate.id}_${memberKey}`,
          type: 'unique',
          memberKey: memberKey
        });
      });
    });
    
    return allPieces;
  };

  const markReady = async () => {
    if (!selectedCandidate) {
      setError('Please choose a candidate before moving on to the discussion');
      return;
    }

    setLoading(true);
    try {
      await markParticipantReady(sessionId, myGroup.id, participantId, {
        individualChoice: selectedCandidate
      });
      setCurrentStage('waiting_for_others');
    } catch (error) {
      console.error('Error marking ready:', error);
      setError('Error marking you as ready. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitGroupDecisionHandler = async () => {
    if (!groupDecision) {
      setError('Please choose a candidate');
      return;
    }

    setLoading(true);
    try {
      await submitDecision(sessionId, myGroup.id, {
        choice: groupDecision,
        submittedBy: participantName
      });
      setCurrentStage('rate_information');
    } catch (error) {
      console.error('Error submitting decision:', error);
      setError('Error submitting the decision. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitRatings = async () => {
    // A slider the group did not move still shows 5, so record it as 5.
    const allPieces = getAllGroupInfoPieces();
    const finalRatings = Object.fromEntries(
      allPieces.map(piece => [piece.id, infoRatings[piece.id] || 5])
    );

    setLoading(true);
    try {
      await submitGroupRatings(sessionId, myGroup.id, {
        ratings: finalRatings,
        submittedBy: participantName
      });
      setCurrentStage('complete');
    } catch (error) {
      console.error('Error submitting ratings:', error);
      setError('Error submitting the ratings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const MyInfoPanel = () => {
    const myInfo = getMyInfo();
    if (!myInfo) return null;

    return (
      <div className="border rounded-lg p-4 bg-blue-50">
        <h4 className="font-semibold mb-3 text-sm">Your information (for reference):</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {myInfo.map(candidate => (
            <div key={candidate.id} className="bg-white rounded p-3 border">
              <h5 className="font-semibold text-sm mb-2">{candidate.name}</h5>
              <ul className="text-xs space-y-1">
                {candidate.my_info.map((info, idx) => (
                  <li key={idx} className="text-gray-700">• {info}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (currentStage === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="ltr">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold mb-4">Waiting for the task to start...</h2>
            <p className="text-gray-600">Hello {participantName}!</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'group_assignment') {
    if (!myGroup) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="ltr">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-6"></div>
              <p>Loading group information...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6" dir="ltr">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Users className="w-16 h-16 mx-auto mb-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-center mb-6">Your Group</h2>
            
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-center">{myGroup.name}</h3>
              <div className="space-y-3">
                {myGroup.members.map((member) => (
                  <div key={member.id} className="bg-white p-3 rounded-lg flex items-center">
                    <UserCheck className="w-5 h-5 text-purple-600 mr-3" />
                    <span className={member.id === participantId ? 'font-bold' : ''}>
                      {member.name} {member.id === participantId && '(you)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Task instructions:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Sit together</strong> with your group members</li>
                <li>• Each of you will receive information about 3 candidates for a management position</li>
                <li>• Read the information <strong>on your own</strong> and choose a candidate individually</li>
                <li>• <strong>Do not take notes</strong> - only record your choice</li>
                <li>• Then <strong>discuss face to face</strong> and reach a group decision</li>
                <li>• The goal: identify the best candidate based on the available information</li>
              </ul>
            </div>

            <button
              onClick={() => setCurrentStage('individual')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700"
            >
              Continue to your information
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'individual') {
    const myInfo = getMyInfo();

    if (!myInfo) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="ltr">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Step 1: Individual Choice</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm mb-2">
                <strong>Task:</strong> Identify the best candidate for a management position in the organization.
              </p>
              <p className="text-sm mb-2">
                Read the information about the three candidates and choose the one who seems best to you.
              </p>
              <p className="text-sm mb-2">
                <strong>Do not discuss</strong> with others yet. <strong>Do not take notes</strong> - just choose a candidate.
              </p>
              <p className="text-sm font-semibold text-blue-800">
                Afterwards you will discuss <strong>face to face</strong> and reach a joint decision.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {myInfo.map(candidate => (
                <div key={candidate.id} className="border-2 rounded-lg p-4" style={{
                  borderColor: selectedCandidate === candidate.id ? '#4f46e5' : '#e5e7eb'
                }}>
                  <div className="flex items-center mb-4">
                    <button onClick={() => setSelectedCandidate(candidate.id)} className="mr-3">
                      {selectedCandidate === candidate.id ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : (
                        <Circle className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                    <h3 className="text-lg font-semibold">{candidate.name}</h3>
                  </div>
                  
                  <ul className="ml-10 space-y-2">
                    {candidate.my_info.map((info, idx) => (
                      <li key={idx} className="text-sm bg-gray-50 p-2 rounded">• {info}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

            <div className="text-center">
              <button
                onClick={markReady}
                disabled={!selectedCandidate || loading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Done - ready for the group discussion'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'waiting_for_others') {
    const readyCount = Object.keys(groupReadyStatus).length;
    const totalMembers = myGroup?.members.length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6" dir="ltr">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
            <h2 className="text-2xl font-bold text-center mb-6">Ready for the discussion!</h2>
            
            <div className="mb-6 p-4 bg-green-50 rounded-lg text-center">
              <p className="mb-2">
                <strong>Your individual choice:</strong> {candidates.find(c => c.id === selectedCandidate)?.name}
              </p>
              <p className="text-sm text-gray-600">
                Wait for your group members, then <strong>discuss together</strong> and reach a joint decision
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg mb-6">
              <h3 className="font-semibold mb-3 text-center">Status:</h3>
              <div className="space-y-2">
                {myGroup?.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-white p-3 rounded">
                    <span>{member.name}</span>
                    {groupReadyStatus[member.id] ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-pulse"></div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3 text-center">
                {readyCount}/{totalMembers} ready
              </p>
            </div>

            <MyInfoPanel />
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'group_decision_entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 p-6" dir="ltr">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Step 2: Group Decision</h2>
            
            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">
                After the face-to-face discussion, <strong>choose one device</strong> in the group to enter:
              </p>
              <ul className="text-sm space-y-1">
                <li>1. The group's joint decision</li>
                <li>2. The importance ratings of the information (in the next step)</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-4">What is the joint decision?</h3>
                {candidates.map(candidate => (
                  <div 
                    key={candidate.id} 
                    className="border-2 rounded-lg p-3 mb-3 cursor-pointer hover:bg-gray-50"
                    style={{ borderColor: groupDecision === candidate.id ? '#f97316' : '#e5e7eb' }}
                    onClick={() => setGroupDecision(candidate.id)}
                  >
                    <div className="flex items-center">
                      {groupDecision === candidate.id ? (
                        <CheckCircle className="w-6 h-6 text-orange-600 mr-3" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 mr-3" />
                      )}
                      <span className="font-semibold">{candidate.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <MyInfoPanel />
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

            <button
              onClick={submitGroupDecisionHandler}
              disabled={!groupDecision || loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Continue to rating the information'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'rate_information') {
    const allInfo = getAllGroupInfoPieces();

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-6" dir="ltr">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Step 3: Rate the Importance of the Information</h2>
            
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm mb-2">
                Below is <strong>all the information</strong> that was available to your group (split among the members).
              </p>
              <p className="text-sm font-semibold">
                Rate <strong>how much each piece of information influenced your group's decision</strong>.
              </p>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
              <p className="font-semibold">Your decision: {candidates.find(c => c.id === groupDecision)?.name}</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6 p-2">
              {allInfo.map((piece) => (
                <div key={piece.id} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{piece.candidate}</p>
                  <p className="text-sm mb-3 font-medium">{piece.text}</p>
                  
                  <div>
                    <label className="block text-xs font-medium mb-2">
                      How much did this piece of information influence the decision? (1 = not at all, 10 = very much)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={infoRatings[piece.id] || 5}
                      onChange={(e) => setInfoRatings(prev => ({...prev, [piece.id]: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <div className="text-center text-sm font-semibold text-gray-700">
                      {infoRatings[piece.id] || 5}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

            <button
              onClick={submitRatings}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit ratings and finish'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6" dir="ltr">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-emerald-600" />
            <h2 className="text-2xl font-bold mb-4">Thank you!</h2>
            <p className="text-gray-600 mb-6">
              Your group has completed the task. The instructor will now present the analysis of the results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SessionTask;