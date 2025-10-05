import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Eye, BarChart3, CheckCircle, Circle, Star, Weight, Copy, Link } from 'lucide-react';
import {
  createSession,
  addParticipant,
  getParticipants,
  createGroups,
  getGroups,
  submitDecision,
  getDecisions,
  updateSessionStage,
  subscribeToSession,
  checkSessionExists
} from '../firebase/database';

const HiddenProfileTask = () => {
  const [currentStage, setCurrentStage] = useState('setup');
  const [isInstructor, setIsInstructor] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null);

  // Candidate profiles for the hidden profile task
  const candidates = [
    {
      id: 'candidate_a',
      name: 'מועמד א',
      shared_info: [
        'בוגר אוניברסיטה מובילה',
        'ניסיון של 5 שנים בתחום',
        'שולט בשפות זרות'
      ],
      unique_info: {
        group1: ['הציג פרויקט חדשני בעבר', 'מנהיג טבעי בקבוצות עבודה'],
        group2: ['קיבל פרס מצוינות בעבודה הקודמת'],
        group3: ['יש לו המלצות חזקות מהמעסיקים הקודמים']
      }
    },
    {
      id: 'candidate_b', 
      name: 'מועמד ב',
      shared_info: [
        'ניסיון של 3 שנים בתחום',
        'עבד בחברות בינוניות',
        'יש לו הכשרה טכנית מתקדמת'
      ],
      unique_info: {
        group1: ['נוכחות גבוהה במקום העבודה הקודם'],
        group2: ['יזם פרויקטים חדשים ביוזמתו', 'מתמחה בטכנולוגיות חדשניות'],
        group3: ['עבד בצוותים בינלאומיים', 'פתר בעיות מורכבות בעבר']
      }
    },
    {
      id: 'candidate_c',
      name: 'מועמד ג',
      shared_info: [
        'בוגר תואר שני',
        'ניסיון של 4 שנים בתחום',
        'עבר הכשרות מקצועיות'
      ],
      unique_info: {
        group1: ['מוכר כעובד אמין ומסור', 'יש לו ידע רחב בתחום'],
        group2: ['קיבל קידומים מהירים בעבר', 'מנטור לעובדים חדשים'],
        group3: ['פיתח שיטות עבודה יעילות']
      }
    }
  ];

  const criteria = [
    'יכולת הובלה וניהול',
    'ניסיון מקצועי רלוונטי', 
    'יכולת חדשנות ויצירתיות',
    'עבודה בצוות',
    'אמינות ומסירות',
    'הסתגלות לשינויים'
  ];

  // Real-time listeners cleanup
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, {
      onSessionUpdate: (session) => {
        setSessionData(session);
        if (session && session.currentStage !== currentStage && !isInstructor) {
          // Participant follows instructor's stage changes
          if (session.currentStage === 'task' && currentStage === 'waiting') {
            setCurrentStage('task_started');
          }
        }
      },
      onParticipantsUpdate: (participantsList) => {
        setParticipants(participantsList);
      },
      onGroupsUpdate: (groupsList) => {
        setGroups(groupsList);
      },
      onDecisionsUpdate: (decisionsList) => {
        setDecisions(decisionsList);
      }
    });

    return () => unsubscribe();
  }, [sessionId, currentStage, isInstructor]);

  // Create new session (instructor)
  const createNewSession = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createSession({
        name: `Hidden Profile Task - ${new Date().toLocaleDateString('he-IL')}`,
        createdBy: 'instructor',
        currentStage: 'identity'
      });
      
      if (result.success) {
        setSessionId(result.id);
        setCurrentStage('instructor_waiting');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('שגיאה ביצירת המפגש. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Join existing session (participant)
  const joinSession = async (inputSessionId) => {
    if (!inputSessionId.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const exists = await checkSessionExists(inputSessionId.trim());
      if (!exists) {
        setError('קוד מפגש לא קיים. בדוק שהקוד נכון.');
        setLoading(false);
        return;
      }
      
      setSessionId(inputSessionId.trim());
      setCurrentStage('identity');
    } catch (error) {
      console.error('Error joining session:', error);
      setError('שגיאה בהצטרפות למפגש. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Add participant
  const addParticipantToSession = async (name) => {
    if (!name.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await addParticipant(sessionId, {
        name: name.trim(),
        status: 'waiting'
      });
      
      if (result.success) {
        setCurrentParticipant({ id: result.id, name: name.trim() });
        setCurrentStage('waiting');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      setError('שגיאה בהצטרפות למפגש. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Create groups and start task (instructor)
  const startTask = async () => {
    if (participants.length < 3) {
      setError('נדרשים לפחות 3 משתתפים להתחלת המשימה');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Create groups logic
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const newGroups = [];
      let groupId = 1;

      for (let i = 0; i < shuffled.length; i += 3) {
        const group = shuffled.slice(i, i + 3);
        if (group.length === 1 && newGroups.length > 0) {
          newGroups[newGroups.length - 1].members.push(group[0]);
        } else if (group.length === 2 && newGroups.length > 0) {
          newGroups[newGroups.length - 1].members.push(...group);
        } else {
          newGroups.push({
            id: `group${groupId}`,
            name: `קבוצה ${groupId}`,
            members: group
          });
          groupId++;
        }
      }

      const result = await createGroups(sessionId, newGroups);
      if (result.success) {
        await updateSessionStage(sessionId, 'task');
        setGroups(result.groups);
        setCurrentStage('task_started');
      }
    } catch (error) {
      console.error('Error starting task:', error);
      setError('שגיאה בהתחלת המשימה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Submit decision
  const submitGroupDecision = async (choice, weights) => {
    const userGroup = groups.find(g => 
      g.members.some(m => m.id === currentParticipant?.id)
    );
    
    if (!userGroup) {
      setError('לא נמצאה קבוצה עבור המשתתף');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await submitDecision(sessionId, userGroup.id, {
        participantId: currentParticipant.id,
        participantName: currentParticipant.name,
        choice,
        weights,
        groupName: userGroup.name
      });
      
      if (result.success) {
        setCurrentStage('complete');
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      setError('שגיאה בשליחת החלטה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Get participant's assigned information
  const getParticipantInfo = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return null;

    const group = groups.find(g => g.members.some(m => m.id === participantId));
    if (!group) return null;

    const groupKey = group.id;
    
    return candidates.map(candidate => ({
      ...candidate,
      visible_info: [
        ...candidate.shared_info,
        ...(candidate.unique_info[groupKey] || [])
      ]
    }));
  };

  // Error display component
  const ErrorDisplay = ({ message, onClose }) => {
    if (!message) return null;
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        <div className="flex items-center justify-between">
          <span>{message}</span>
          <button onClick={onClose} className="mr-4 text-red-700 hover:text-red-900">×</button>
        </div>
      </div>
    );
  };

  // Setup stage
  if (currentStage === 'setup') {
    const [inputSessionId, setInputSessionId] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-indigo-800">
              משימת הפרופיל הנסתר - קבלת החלטות קבוצתית
            </h1>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div 
                className="bg-green-50 p-6 rounded-lg cursor-pointer hover:bg-green-100 transition-colors border-2 border-transparent hover:border-green-300"
                onClick={() => {
                  if (!loading) {
                    setIsInstructor(true);
                    createNewSession();
                  }
                }}
              >
                <div className="text-center">
                  <Eye className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <h2 className="text-xl font-semibold mb-2">מדריך - צור מפגש חדש</h2>
                  <p className="text-gray-600">התחל מפגש חדש וקבל קוד למשתתפים</p>
                  {loading && isInstructor && (
                    <div className="mt-3 text-sm text-blue-600">יוצר מפגש...</div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border-2 border-transparent">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <h2 className="text-xl font-semibold mb-4">משתתף - הצטרף למפגש</h2>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={inputSessionId}
                      onChange={(e) => setInputSessionId(e.target.value)}
                      className="w-full p-3 border rounded-lg text-center"
                      placeholder="הכנס קוד מפגש"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !loading) {
                          joinSession(inputSessionId);
                        }
                      }}
                    />
                    <button
                      onClick={() => joinSession(inputSessionId)}
                      disabled={!inputSessionId.trim() || loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading && !isInstructor ? 'מצטרף...' : 'הצטרף למפגש'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">אודות המשימה:</h3>
              <p className="text-sm text-gray-700">
                משימת הפרופיל הנסתר היא כלי מחקרי לבחינת תהליכי קבלת החלטות בקבוצות.
                כל חבר קבוצה מקבל חלק מהמידע על המועמדים, כאשר חלק מהמידע משותף לכל הקבוצה
                וחלק ייחודי לכל משתתף. המטרה היא לבחור את המועמד הטוב ביותר על בסיס כל המידע הזמין.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Instructor waiting stage
  if (currentStage === 'instructor_waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">ממתין למשתתפים</h2>
            
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">קוד המפגש:</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-4 py-2 rounded text-lg font-mono">
                    {sessionId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sessionId);
                      // Could add a toast notification here
                    }}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="העתק קוד"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                שתף קוד זה עם המשתתפים כדי שיוכלו להצטרף למפגש
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">
                משתתפים רשומים ({participants.length}):
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-gray-500">
                      ממתין למשתתפים...
                    </div>
                  </div>
                ) : (
                  participants.map((participant, idx) => (
                    <div key={participant.id || idx} className="bg-gray-50 p-3 rounded-lg flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 ml-3" />
                      <span>{participant.name}</span>
                      <span className="mr-auto text-xs text-gray-500">
                        {participant.joinedAt && new Date(participant.joinedAt.toDate()).toLocaleTimeString('he-IL')}
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
                {loading ? 'מתחיל...' : `התחל משימה (${participants.length} משתתפים)`}
              </button>
              
              {participants.length < 3 && (
                <p className="text-sm text-red-600">
                  נדרשים לפחות 3 משתתפים להתחלת המשימה
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Identity stage (participant)
  if (currentStage === 'identity' && !isInstructor) {
    const [name, setName] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <UserPlus className="w-16 h-16 mx-auto mb-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-center mb-6">פרטי זהות</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">שם או כינוי</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="הכנס שם או כינוי לבחירתך"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      addParticipantToSession(name);
                    }
                  }}
                />
              </div>
              
              <button
                onClick={() => addParticipantToSession(name)}
                disabled={!name.trim() || loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'מצטרף...' : 'הצטרף למשימה'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                קוד מפגש: {sessionId}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting stage (participant)
  if (currentStage === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold mb-4">ממתין להתחלת המשימה...</h2>
            <p className="text-gray-600 mb-4">
              שלום {currentParticipant?.name}! אנחנו ממתינים שהמדריך יתחיל את המשימה.
            </p>
            <p className="text-sm text-indigo-600 mb-2">
              משתתפים רשומים: {participants.length}
            </p>
            <p className="text-xs text-gray-500">
              קוד מפגש: {sessionId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Task started - redirect to individual task
  if (currentStage === 'task_started') {
    useEffect(() => {
      const timer = setTimeout(() => setCurrentStage('task'), 2000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
            <h2 className="text-xl font-semibold mb-4">המשימה מתחילה!</h2>
            <p className="text-gray-600">
              מעביר אותך למשימה האישית...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Individual task stage
  if (currentStage === 'task' && !isInstructor) {
    const [selectedCandidate, setSelectedCandidate] = useState('');
    
    // Get participant's group and assigned information
    const userGroup = groups.find(g => 
      g.members.some(m => m.id === currentParticipant?.id)
    );
    
    if (!userGroup || !currentParticipant) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-6"></div>
              <p>טוען מידע על הקבוצה...</p>
            </div>
          </div>
        </div>
      );
    }

    const participantInfo = getParticipantInfo(currentParticipant.id);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">בחירת מועמד למשרה</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">הוראות:</h3>
              <p className="text-sm">
                קרא בעניה את המידע על כל מועמד. לאחר מכן בחר את המועמד שלדעתך מתאים ביותר למשרה
                על בסיס הקריטריונים הבאים: {criteria.join(', ')}.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                את חבר ב{userGroup.name} יחד עם: {userGroup.members.map(m => m.name).join(', ')}
              </p>
            </div>

            <div className="space-y-6">
              {participantInfo?.map(candidate => (
                <div key={candidate.id} className="border rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => setSelectedCandidate(candidate.id)}
                      className="ml-3"
                    >
                      {selectedCandidate === candidate.id ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <h3 className="text-lg font-semibold">{candidate.name}</h3>
                  </div>
                  
                  <ul className="space-y-2">
                    {candidate.visible_info.map((info, idx) => (
                      <li key={idx} className="text-sm bg-gray-50 p-2 rounded">
                        • {info}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentStage('discussion')}
                disabled={!selectedCandidate}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                המשך לדיון קבוצתי
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Discussion stage (group decision and weighting)
  if (currentStage === 'discussion' && !isInstructor) {
    const [finalChoice, setFinalChoice] = useState('');
    const [weights, setWeights] = useState({
      shared: 5,
      unique: 5,
      ...Object.fromEntries(criteria.map(c => [c, 5]))
    });

    const userGroup = groups.find(g => 
      g.members.some(m => m.id === currentParticipant?.id)
    );

    // Get all information available to the group
    const getAllGroupInfo = () => {
      if (!userGroup) return [];
      
      return candidates.map(candidate => {
        const allUniqueInfo = Object.values(candidate.unique_info).flat();
        return {
          ...candidate,
          all_info: [...candidate.shared_info, ...allUniqueInfo],
          shared_info: candidate.shared_info,
          unique_info: allUniqueInfo
        };
      });
    };

    const allGroupInfo = getAllGroupInfo();

    const handleSubmitDecision = () => {
      submitGroupDecision(finalChoice, weights);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">דיון קבוצתי - {userGroup?.name}</h2>
            
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">שלב הדיון:</h3>
              <p className="text-sm mb-2">
                כעת אתם יכולים לראות את כל המידע שהיה זמין לקבוצה שלכם. 
                דנו יחד ובחרו את המועמד הטוב ביותר.
              </p>
              <p className="text-xs text-gray-600">
                חברי הקבוצה: {userGroup?.members.map(m => m.name).join(', ')}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">המידע הזמין לקבוצה:</h3>
                <div className="space-y-4">
                  {allGroupInfo.map(candidate => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <button
                          onClick={() => setFinalChoice(candidate.id)}
                          className="ml-3"
                        >
                          {finalChoice === candidate.id ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <h4 className="font-semibold">{candidate.name}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-blue-600 mb-1">מידע משותף:</h5>
                          <ul className="text-xs space-y-1">
                            {candidate.shared_info.map((info, idx) => (
                              <li key={idx} className="bg-blue-50 p-1 rounded">• {info}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-green-600 mb-1">מידע ייחודי:</h5>
                          <ul className="text-xs space-y-1">
                            {candidate.unique_info.map((info, idx) => (
                              <li key={idx} className="bg-green-50 p-1 rounded">• {info}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">דרגו את חשיבות המידע:</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      חשיבות המידע המשותף (1-10):
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={weights.shared}
                      onChange={(e) => setWeights(prev => ({...prev, shared: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-600">
                      {weights.shared}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      חשיבות המידע הייחודי (1-10):
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={weights.unique}
                      onChange={(e) => setWeights(prev => ({...prev, unique: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-600">
                      {weights.unique}
                    </div>
                  </div>

                  {criteria.map(criterion => (
                    <div key={criterion}>
                      <label className="block text-sm font-medium mb-2">
                        חשיבות: {criterion} (1-10):
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={weights[criterion]}
                        onChange={(e) => setWeights(prev => ({...prev, [criterion]: parseInt(e.target.value)}))}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {weights[criterion]}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmitDecision}
                  disabled={!finalChoice || loading}
                  className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'שולח...' : 'שלח החלטה סופית'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completion stage
  if (currentStage === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
            <h2 className="text-2xl font-bold mb-4">תודה על השתתפותך!</h2>
            <p className="text-gray-600 mb-6">
              החלטת הקבוצה נרשמה בהצלחה. המדריך יוכל כעת לצפות בתוצאות הניתוח.
            </p>
            <p className="text-sm text-indigo-600 mb-4">
              קוד מפגש: {sessionId}
            </p>
            <button
              onClick={() => {
                setIsInstructor(true);
                setCurrentStage('analysis');
              }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              עבור לתצוגת מדריך
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Analysis stage (instructor view)
  if (isInstructor && (currentStage === 'analysis' || currentStage === 'task_started')) {
    const getAnalysisData = () => {
      return decisions.map(decision => {
        const group = groups.find(g => g.id === decision.groupId);
        const chosenCandidate = candidates.find(c => c.id === decision.choice);
        return {
          groupId: decision.groupId,
          groupName: group?.name || decision.groupName,
          members: group?.members || [],
          choice: chosenCandidate?.name || 'לא נבחר',
          candidateId: decision.choice,
          weights: decision.weights || {},
          participantName: decision.participantName || 'לא ידוע'
        };
      });
    };

    const analysisData = getAnalysisData();

    // Calculate information bias
    const calculateBias = () => {
      let totalSharedWeight = 0;
      let totalUniqueWeight = 0;
      let groupCount = 0;

      decisions.forEach(decision => {
        if (decision.weights?.shared && decision.weights?.unique) {
          totalSharedWeight += decision.weights.shared;
          totalUniqueWeight += decision.weights.unique;
          groupCount++;
        }
      });

      return {
        avgSharedWeight: groupCount > 0 ? (totalSharedWeight / groupCount).toFixed(1) : '0',
        avgUniqueWeight: groupCount > 0 ? (totalUniqueWeight / groupCount).toFixed(1) : '0',
        bias: groupCount > 0 ? ((totalSharedWeight - totalUniqueWeight) / groupCount).toFixed(1) : '0'
      };
    };

    const biasData = calculateBias();

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6" dir="rtl">
        <ErrorDisplay message={error} onClose={() => setError('')} />
        
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 ml-3 text-green-600" />
                <h1 className="text-3xl font-bold">ניתוח תוצאות - משימת הפרופיל הנסתר</h1>
              </div>
              <div className="text-sm text-gray-500">
                קוד מפגש: {sessionId}
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">סה"כ קבוצות</h3>
                <p className="text-2xl font-bold text-blue-600">{groups.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">סה"כ משתתפים</h3>
                <p className="text-2xl font-bold text-green-600">{participants.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">החלטות שהתקבלו</h3>
                <p className="text-2xl font-bold text-purple-600">{decisions.length}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800">התקדמות</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {groups.length > 0 ? `${Math.round((decisions.length / groups.length) * 100)}%` : '0%'}
                </p>
              </div>
            </div>

            {decisions.length > 0 && (
              <>
                {/* Bias Analysis */}
                <div className="bg-yellow-50 p-6 rounded-lg mb-8">
                  <h3 className="text-xl font-semibold mb-4">ניתוח הטיה במידע</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">משקל ממוצע - מידע משותף</p>
                      <p className="text-xl font-bold text-blue-600">{biasData.avgSharedWeight}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">משקל ממוצע - מידע ייחודי</p>
                      <p className="text-xl font-bold text-green-600">{biasData.avgUniqueWeight}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">הטיה (חיובי = העדפת מידע משותף)</p>
                      <p className={`text-xl font-bold ${parseFloat(biasData.bias) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {biasData.bias}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Group Decisions */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">החלטות קבוצתיות</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-3 text-right">קבוצה</th>
                          <th className="border border-gray-300 p-3 text-right">משתתף</th>
                          <th className="border border-gray-300 p-3 text-right">חברים</th>
                          <th className="border border-gray-300 p-3 text-right">בחירה</th>
                          <th className="border border-gray-300 p-3 text-right">משקל משותף</th>
                          <th className="border border-gray-300 p-3 text-right">משקל ייחודי</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.map((result, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-300 p-3">{result.groupName}</td>
                            <td className="border border-gray-300 p-3">{result.participantName}</td>
                            <td className="border border-gray-300 p-3">
                              {result.members.map(m => m.name).join(', ')}
                            </td>
                            <td className="border border-gray-300 p-3 font-medium">{result.choice}</td>
                            <td className="border border-gray-300 p-3 text-center">
                              {result.weights.shared || 'N/A'}
                            </td>
                            <td className="border border-gray-300 p-3 text-center">
                              {result.weights.unique || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Candidate Information Table */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">טבלת מועמדים מלאה</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-right">מועמד</th>
                      <th className="border border-gray-300 p-3 text-right">מידע משותף</th>
                      <th className="border border-gray-300 p-3 text-right">מידע ייחודי - קבוצה 1</th>
                      <th className="border border-gray-300 p-3 text-right">מידע ייחודי - קבוצה 2</th>
                      <th className="border border-gray-300 p-3 text-right">מידע ייחודי - קבוצה 3</th>
                      <th className="border border-gray-300 p-3 text-right">נבחר ע"י</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(candidate => {
                      const selectedBy = analysisData.filter(result => result.candidateId === candidate.id);
                      return (
                        <tr key={candidate.id}>
                          <td className="border border-gray-300 p-3 font-medium">{candidate.name}</td>
                          <td className="border border-gray-300 p-3">
                            <ul className="text-xs space-y-1">
                              {candidate.shared_info.map((info, idx) => (
                                <li key={idx}>• {info}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="border border-gray-300 p-3">
                            <ul className="text-xs space-y-1">
                              {candidate.unique_info.group1?.map((info, idx) => (
                                <li key={idx}>• {info}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="border border-gray-300 p-3">
                            <ul className="text-xs space-y-1">
                              {candidate.unique_info.group2?.map((info, idx) => (
                                <li key={idx}>• {info}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="border border-gray-300 p-3">
                            <ul className="text-xs space-y-1">
                              {candidate.unique_info.group3?.map((info, idx) => (
                                <li key={idx}>• {info}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="border border-gray-300 p-3">
                            {selectedBy.length > 0 ? (
                              <ul className="text-xs">
                                {selectedBy.map((selection, idx) => (
                                  <li key={idx} className="text-green-600 font-medium">
                                    {selection.groupName} ({selection.participantName})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-400 text-xs">לא נבחר</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {decisions.length > 0 && (
              <div className="bg-indigo-50 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">תובנות מרכזיות</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <Star className="w-4 h-4 ml-2 mt-1 text-indigo-600 flex-shrink-0" />
                    <p>
                      <strong>הטיית מידע משותף:</strong> {parseFloat(biasData.bias) > 1 ? 
                        'נצפתה העדפה חזקה למידע משותף על פני מידע ייחודי' :
                        parseFloat(biasData.bias) > 0 ? 
                        'נצפתה העדפה מתונה למידע משותף' :
                        parseFloat(biasData.bias) < -1 ?
                        'נצפתה העדפה חזקה למידע ייחודי על פני מידע משותף' :
                        'לא נצפתה הטיה משמעותית'
                      }
                    </p>
                  </div>
                  <div className="flex items-start">
                    <Weight className="w-4 h-4 ml-2 mt-1 text-indigo-600 flex-shrink-0" />
                    <p>
                      <strong>מועמד פופולרי:</strong> {
                        (() => {
                          const choices = decisions.map(d => d.choice);
                          const counts = {};
                          choices.forEach(choice => counts[choice] = (counts[choice] || 0) + 1);
                          const mostPopular = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                          return mostPopular ? 
                            `${candidates.find(c => c.id === mostPopular[0])?.name} (נבחר ע"י ${mostPopular[1]} החלטות)` :
                            'עדיין לא נאספו נתונים'
                        })()
                      }
                    </p>
                  </div>
                  <div className="flex items-start">
                    <BarChart3 className="w-4 h-4 ml-2 mt-1 text-indigo-600 flex-shrink-0" />
                    <p>
                      <strong>רמת השלמה:</strong> {decisions.length} החלטות מתוך {groups.length} קבוצות 
                      ({groups.length > 0 ? Math.round((decisions.length / groups.length) * 100) : 0}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  if (confirm('האם אתה בטוח שברצונך להתחיל מפגש חדש? כל הנתונים הנוכחיים יאבדו.')) {
                    window.location.reload();
                  }
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                התחל מפגש חדש
              </button>
              
              {decisions.length > 0 && (
                <button
                  onClick={() => {
                    // Generate CSV data
                    const csvHeaders = [
                      'קבוצה', 'משתתף', 'חברי קבוצה', 'בחירה', 'משקל מידע משותף', 'משקל מידע ייחודי', 
                      ...criteria
                    ];
                    
                    const csvRows = analysisData.map(result => [
                      result.groupName,
                      result.participantName,
                      result.members.map(m => m.name).join(';'),
                      result.choice,
                      result.weights.shared || '',
                      result.weights.unique || '',
                      ...criteria.map(c => result.weights[c] || '')
                    ]);
                    
                    const csvContent = [csvHeaders, ...csvRows]
                      .map(row => row.map(cell => `"${cell}"`).join(','))
                      .join('\n');
                    
                    // Add BOM for Hebrew support
                    const BOM = '\uFEFF';
                    const blob = new Blob([BOM + csvContent], { 
                      type: 'text/csv;charset=utf-8;' 
                    });
                    
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `hidden-profile-results-${sessionId}-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  ייצא תוצאות לCSV
                </button>
              )}
              
              <button
                onClick={() => setCurrentStage('instructor_waiting')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                חזור לניהול מפגש
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default HiddenProfileTask;