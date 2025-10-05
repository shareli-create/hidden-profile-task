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

  const candidates = [
    {
      id: 'candidate_a',
      name: 'מועמד א',
      shared_info: [
        'מסוגל לבטא את עצמו בצורה ברורה ומשכנעת',
        'בעל ביטחון עצמי גבוה',
        'נחוש ואסרטיבי בקבלת החלטות',
        'בעל יכולות אינטלקטואליות גבוהות',
        'נתפס כמי שמחזיק בדעה חיובית מופרזת מדי על עצמו',
        'נוקשה בדעותיו ולא תמיד פתוח לשמוע אחרים'
      ],
      unique_info: {
        group1: ['מלא באנרגיה ויוזמה', 'שאפתן ומונע על ידי הצלחה'],
        group2: ['נוטה להחזיק בדעות קדומות כלפי אחרים', 'נוטה להתחמק מאחריות כשהדברים משתבשים'],
        group3: ['לא תמיד כן ונוטה להסתיר מידע', 'חסר רחמים ומוכן לפגוע באחרים למען מטרותיו']
      }
    },
    {
      id: 'candidate_b',
      name: 'מועמד ב',
      shared_info: [
        'בעל יכולות אינטלקטואליות גבוהות',
        'מסוגל לבטא את עצמו בצורה ברורה ומשכנעת',
        'בעל ביטחון עצמי גבוה',
        'נוקשה בדעותיו ולא תמיד פתוח לשמוע אחרים',
        'נתפס כמי שמחזיק בדעה חיובית מופרזת מדי על עצמו',
        'נוטה להחזיק בדעות קדומות כלפי אחרים'
      ],
      unique_info: {
        group1: ['אחראי ונוטל אחריות מלאה על פעולותיו', 'כן וישר בתקשורת עם אחרים'],
        group2: ['הוגן ושוויוני ביחסו לאנשים', 'ראוי לאמון ושומר על סודיות'],
        group3: ['בעל שיקול דעת בוגר ומאוזן', 'מציג עקביות בין דיבור למעשה']
      }
    },
    {
      id: 'candidate_c',
      name: 'מועמד ג',
      shared_info: [
        'מלא באנרגיה ויוזמה',
        'שאפתן ומונע על ידי הצלחה',
        'נחוש ואסרטיבי בקבלת החלטות',
        'בעל יכולות אינטלקטואליות גבוהות',
        'חסר רחמים ומוכן לפגוע באחרים למען מטרותיו',
        'לא תמיד כן ונוטה להסתיר מידע'
      ],
      unique_info: {
        group1: ['מסוגל לבטא את עצמו בצורה ברורה ומשכנעת', 'בעל ביטחון עצמי גבוה'],
        group2: ['נתפס כמי שמחזיק בדעה חיובית מופרזת מדי על עצמו', 'נוקשה בדעותיו ולא תמיד פתוח לשמוע אחרים'],
        group3: ['נוטה להחזיק בדעות קדומות כלפי אחרים', 'נוטה להתחמק מאחריות כשהדברים משתבשים']
      }
    }
  ];

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
    const groupKeys = ['group1', 'group2', 'group3'];
    const groupKey = groupKeys[myMemberIndex % 3];
    
    return candidates.map(candidate => ({
      ...candidate,
      my_info: [
        ...candidate.shared_info,
        ...(candidate.unique_info[groupKey] || [])
      ]
    }));
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
      
      Object.entries(candidate.unique_info).forEach(([groupKey, infoArray]) => {
        infoArray.forEach((info, idx) => {
          allPieces.push({
            candidate: candidate.name,
            candidateId: candidate.id,
            text: info,
            id: `${candidate.id}_${groupKey}_${idx}`,
            type: 'unique',
            groupKey: groupKey
          });
        });
      });
    });
    
    return allPieces;
  };

  const markReady = async () => {
    if (!selectedCandidate) {
      setError('נדרש לבחור מועמד לפני המעבר לדיון');
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
      setError('שגיאה בסימון מוכן. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const submitGroupDecisionHandler = async () => {
    if (!groupDecision) {
      setError('נדרש לבחור מועמד');
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
      setError('שגיאה בשליחת החלטה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const submitRatings = async () => {
    const allPieces = getAllGroupInfoPieces();
    const missingRatings = allPieces.some(piece => !infoRatings[piece.id]);
    
    if (missingRatings) {
      setError('נדרש לדרג את כל פיסות המידע');
      return;
    }

    setLoading(true);
    try {
      await submitGroupRatings(sessionId, myGroup.id, {
        ratings: infoRatings,
        submittedBy: participantName
      });
      setCurrentStage('complete');
    } catch (error) {
      console.error('Error submitting ratings:', error);
      setError('שגיאה בשליחת דירוגים. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const MyInfoPanel = () => {
    const myInfo = getMyInfo();
    if (!myInfo) return null;

    return (
      <div className="border rounded-lg p-4 bg-blue-50">
        <h4 className="font-semibold mb-3 text-sm">המידע שלך (לזיכרון):</h4>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold mb-4">ממתין להתחלת המשימה...</h2>
            <p className="text-gray-600">שלום {participantName}!</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'group_assignment') {
    if (!myGroup) {
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Users className="w-16 h-16 mx-auto mb-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-center mb-6">הקבוצה שלך</h2>
            
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-center">{myGroup.name}</h3>
              <div className="space-y-3">
                {myGroup.members.map((member) => (
                  <div key={member.id} className="bg-white p-3 rounded-lg flex items-center">
                    <UserCheck className="w-5 h-5 text-purple-600 ml-3" />
                    <span className={member.id === participantId ? 'font-bold' : ''}>
                      {member.name} {member.id === participantId && '(את/ה)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">הוראות המשימה:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>התיישבו יחד</strong> עם חברי הקבוצה</li>
                <li>• כל אחד יקבל מידע על 3 מועמדים למשרת ניהול</li>
                <li>• קראו <strong>לבד</strong> את המידע ובחרו מועמד באופן אישי</li>
                <li>• <strong>אל תרשמו הערות</strong> - רק את הבחירה שלכם</li>
                <li>• לאחר מכן <strong>דנו פנים אל פנים</strong> והגיעו להחלטה קבוצתית</li>
                <li>• המטרה: לזהות את המועמד הטוב ביותר על בסיס המידע הזמין</li>
              </ul>
            </div>

            <button
              onClick={() => setCurrentStage('individual')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700"
            >
              המשך לקריאת המידע האישי
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">שלב 1: בחירה אישית</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm mb-2">
                <strong>משימה:</strong> זהה את המועמד הטוב ביותר למשרת ניהול בארגון.
              </p>
              <p className="text-sm mb-2">
                קרא את המידע על שלושת המועמדים ובחר את המועמד שנראה לך הטוב ביותר.
              </p>
              <p className="text-sm mb-2">
                <strong>אל תדון</strong> עם אחרים כעת. <strong>אל תרשום הערות</strong> - רק בחר מועמד.
              </p>
              <p className="text-sm font-semibold text-blue-800">
                לאחר מכן תדונו <strong>פנים אל פנים</strong> ותגיעו להחלטה משותפת.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {myInfo.map(candidate => (
                <div key={candidate.id} className="border-2 rounded-lg p-4" style={{
                  borderColor: selectedCandidate === candidate.id ? '#4f46e5' : '#e5e7eb'
                }}>
                  <div className="flex items-center mb-4">
                    <button onClick={() => setSelectedCandidate(candidate.id)} className="ml-3">
                      {selectedCandidate === candidate.id ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : (
                        <Circle className="w-7 h-7 text-gray-400" />
                      )}
                    </button>
                    <h3 className="text-lg font-semibold">{candidate.name}</h3>
                  </div>
                  
                  <ul className="mr-10 space-y-2">
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
                {loading ? 'שולח...' : 'סיימתי - מוכן לדיון קבוצתי'}
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6" dir="rtl">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
            <h2 className="text-2xl font-bold text-center mb-6">מוכן לדיון!</h2>
            
            <div className="mb-6 p-4 bg-green-50 rounded-lg text-center">
              <p className="mb-2">
                <strong>הבחירה האישית שלך:</strong> {candidates.find(c => c.id === selectedCandidate)?.name}
              </p>
              <p className="text-sm text-gray-600">
                המתן לחברי הקבוצה, ואז <strong>דנו ביחד</strong> והגיעו להחלטה משותפת
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg mb-6">
              <h3 className="font-semibold mb-3 text-center">סטטוס:</h3>
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
                {readyCount}/{totalMembers} מוכנים
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 p-6" dir="rtl">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">שלב 2: החלטת הקבוצה</h2>
            
            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">
                לאחר הדיון פנים אל פנים, <strong>בחרו מכשיר אחד</strong> מהקבוצה שישמש להזנת:
              </p>
              <ul className="text-sm space-y-1">
                <li>1. ההחלטה המשותפת של הקבוצה</li>
                <li>2. דירוג חשיבות המידע (בשלב הבא)</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-4">מהי ההחלטה המשותפת?</h3>
                {candidates.map(candidate => (
                  <div 
                    key={candidate.id} 
                    className="border-2 rounded-lg p-3 mb-3 cursor-pointer hover:bg-gray-50"
                    style={{ borderColor: groupDecision === candidate.id ? '#f97316' : '#e5e7eb' }}
                    onClick={() => setGroupDecision(candidate.id)}
                  >
                    <div className="flex items-center">
                      {groupDecision === candidate.id ? (
                        <CheckCircle className="w-6 h-6 text-orange-600 ml-3" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 ml-3" />
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
              {loading ? 'שולח...' : 'המשך לדירוג המידע'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'rate_information') {
    const allInfo = getAllGroupInfoPieces();

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">שלב 3: דרגו את חשיבות המידע</h2>
            
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm mb-2">
                להלן <strong>כל המידע</strong> שהיה זמין לקבוצה שלכם (מחולק בין החברים).
              </p>
              <p className="text-sm font-semibold">
                דרגו <strong>עד כמה כל פיסת מידע השפיעה על ההחלטה הקבוצתית</strong> שלכם.
              </p>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
              <p className="font-semibold">ההחלטה שלכם: {candidates.find(c => c.id === groupDecision)?.name}</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6 p-2">
              {allInfo.map((piece) => (
                <div key={piece.id} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{piece.candidate}</p>
                  <p className="text-sm mb-3 font-medium">{piece.text}</p>
                  
                  <div>
                    <label className="block text-xs font-medium mb-2">
                      עד כמה פיסת מידע זו השפיעה על ההחלטה? (1 = לא השפיעה, 10 = השפיעה מאוד)
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
              {loading ? 'שולח...' : 'שלח דירוגים וסיים'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-emerald-600" />
            <h2 className="text-2xl font-bold mb-4">תודה!</h2>
            <p className="text-gray-600 mb-6">
              הקבוצה שלכם סיימה את המשימה. המרצה יציג כעת את ניתוח התוצאות.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SessionTask;