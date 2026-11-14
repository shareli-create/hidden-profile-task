import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Download, Users, CheckCircle } from 'lucide-react';
import { subscribeToSession } from '../firebase/database';
import { candidates } from '../data/candidates';

const SessionAnalysis = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, {
      onSessionUpdate: (session) => {
        setSessionData(session);
      },
      onGroupsUpdate: (groupsList) => {
        setGroups(groupsList);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const calculateIndividualChoices = () => {
    const counts = { candidate_a: 0, candidate_b: 0, candidate_c: 0 };
    
    groups.forEach(group => {
      if (group.readyMembers) {
        Object.values(group.readyMembers).forEach(member => {
          if (member.individualChoice) {
            counts[member.individualChoice]++;
          }
        });
      }
    });
    
    return counts;
  };

  const calculateGroupChoices = () => {
    const choices = [];
    
    groups.forEach(group => {
      if (group.groupDecision) {
        choices.push({
          groupName: group.name,
          choice: group.groupDecision.choice,
          choiceName: candidates.find(c => c.id === group.groupDecision.choice)?.name || 'לא ידוע'
        });
      }
    });
    
    return choices;
  };

  const calculateWeightAnalysis = () => {
    const analysis = [];
    
    groups.forEach(group => {
      if (group.ratings) {
        const sharedWeights = [];
        const uniqueWeights = [];
        
        Object.entries(group.ratings).forEach(([infoId, weight]) => {
          let isShared = false;
          
          candidates.forEach(candidate => {
            candidate.shared_info.forEach((info, idx) => {
              const sharedId = `${candidate.id}_shared_${idx}`;
              if (infoId === sharedId) {
                isShared = true;
              }
            });
          });
          
          if (isShared) {
            sharedWeights.push(weight);
          } else {
            uniqueWeights.push(weight);
          }
        });
        
        const meanShared = sharedWeights.length > 0 
          ? (sharedWeights.reduce((a, b) => a + b, 0) / sharedWeights.length).toFixed(2)
          : 0;
        
        const meanUnique = uniqueWeights.length > 0
          ? (uniqueWeights.reduce((a, b) => a + b, 0) / uniqueWeights.length).toFixed(2)
          : 0;
        
        analysis.push({
          groupName: group.name,
          groupChoice: candidates.find(c => c.id === group.groupDecision?.choice)?.name || 'לא ידוע',
          meanShared: parseFloat(meanShared),
          meanUnique: parseFloat(meanUnique),
          bias: parseFloat(meanShared) - parseFloat(meanUnique)
        });
      }
    });
    
    return analysis;
  };

  const exportToCSV = () => {
    const individualChoices = calculateIndividualChoices();
    const groupChoices = calculateGroupChoices();
    const weightAnalysis = calculateWeightAnalysis();
    
    let csv = 'Hidden Profile Task Results - Stasser & Titus (1985) Paradigm\n\n';
    
    csv += 'Individual Choices (Pre-Discussion)\n';
    csv += 'Candidate,Count\n';
    csv += `מועמד א,${individualChoices.candidate_a}\n`;
    csv += `מועמד ב,${individualChoices.candidate_b}\n`;
    csv += `מועמד ג,${individualChoices.candidate_c}\n\n`;
    
    csv += 'Group Decisions (Post-Discussion)\n';
    csv += 'Group,Choice\n';
    groupChoices.forEach(choice => {
      csv += `${choice.groupName},${choice.choiceName}\n`;
    });
    csv += '\n';
    
    csv += 'Weight Analysis (Information Bias)\n';
    csv += 'Group,Group Choice,Mean Shared Weight,Mean Unique Weight,Bias (Shared-Unique)\n';
    weightAnalysis.forEach(analysis => {
      csv += `${analysis.groupName},${analysis.groupChoice},${analysis.meanShared},${analysis.meanUnique},${analysis.bias.toFixed(2)}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hidden_profile_results_${sessionId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
            <p>טוען נתונים...</p>
          </div>
        </div>
      </div>
    );
  }

  const individualChoices = calculateIndividualChoices();
  const groupChoices = calculateGroupChoices();
  const weightAnalysis = calculateWeightAnalysis();
  const totalIndividuals = individualChoices.candidate_a + individualChoices.candidate_b + individualChoices.candidate_c;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-indigo-600 ml-3" />
              <h1 className="text-3xl font-bold">ניתוח תוצאות - Hidden Profile Task</h1>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="w-5 h-5 ml-2" />
              ייצא ל-CSV
            </button>
          </div>

          {/* Section 1: Individual Choices */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Users className="w-6 h-6 ml-2" />
              בחירות אישיות (לפני דיון)
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-lg mb-2">מועמד א</h3>
                <p className="text-3xl font-bold text-blue-600">{individualChoices.candidate_a}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_a / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <h3 className="font-semibold text-lg mb-2">מועמד ב</h3>
                <p className="text-3xl font-bold text-green-600">{individualChoices.candidate_b}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_b / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-lg mb-2">מועמד ג</h3>
                <p className="text-3xl font-bold text-purple-600">{individualChoices.candidate_c}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_c / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Group Decisions */}
          <div className="mb-8 p-6 bg-orange-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">החלטות קבוצתיות (אחרי דיון)</h2>
            <div className="space-y-3">
              {groupChoices.map((choice, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border-2 border-orange-200 flex items-center justify-between">
                  <span className="font-semibold">{choice.groupName}</span>
                  <span className={`text-xl font-bold ${
                    choice.choice === 'candidate_b' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {choice.choiceName}
                    {choice.choice === 'candidate_b' && ' ✓'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Weight Analysis */}
          <div className="mb-8 p-6 bg-purple-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">ניתוח משקלים - מידע משותף לעומת ייחודי</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-purple-200">
                  <tr>
                    <th className="p-3 text-right">קבוצה</th>
                    <th className="p-3 text-right">החלטה</th>
                    <th className="p-3 text-right">ממוצע משקל - מידע משותף</th>
                    <th className="p-3 text-right">ממוצע משקל - מידע ייחודי</th>
                    <th className="p-3 text-right">הטיה (משותף - ייחודי)</th>
                  </tr>
                </thead>
                <tbody>
                  {weightAnalysis.map((analysis, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">{analysis.groupName}</td>
                      <td className="p-3 font-semibold">{analysis.groupChoice}</td>
                      <td className="p-3 text-center">
                        <span className="bg-blue-100 px-3 py-1 rounded font-semibold">{analysis.meanShared}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-green-100 px-3 py-1 rounded font-semibold">{analysis.meanUnique}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded font-semibold ${
                          analysis.bias > 0.3 ? 'bg-yellow-100 text-yellow-700' : analysis.bias < -0.3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {analysis.bias > 0 ? '+' : ''}{analysis.bias.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-sm">
                <strong>הסבר פירוש הציונים:</strong><br/>
                • <strong className="text-yellow-700">צהוב (+0.3 ומעלה):</strong> הקבוצה נתנה משקל גבוה יותר למידע משותף - זוהי ההטיה האופיינית ב-Hidden Profile<br/>
                • <strong className="text-gray-700">אפור (-0.3 עד +0.3):</strong> הקבוצה נתנה משקל דומה לשני סוגי המידע<br/>
                • <strong className="text-green-700">ירוק (-0.3 ומטה):</strong> הקבוצה נתנה משקל גבוה יותר למידע ייחודי - הצליחה להתגבר על ההטיה!
              </p>
            </div>
          </div>

          {/* Section 4: Information Structure Reveal */}
          <div className="p-6 bg-emerald-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 ml-2 text-emerald-600" />
              מבנה המידע לפי Stasser & Titus (1985)
            </h2>
            
            <p className="text-sm text-gray-700 mb-4">
              כל חבר/ת קבוצה ראו אותם 5 פריטי מידע משותפים על כל מועמד, ועוד פריט ייחודי אחד על כל מועמד.
              3 הפריטים הייחודיים של כל מועמד חולקו בין חברי הקבוצה, פריט אחד לכל חבר/ה (בקבוצות של 4-5 חלק מהחברים קיבלו את אותו פריט ייחודי).
            </p>

            <div className="mb-6 p-4 bg-white rounded-lg border-2 border-emerald-300">
              <h3 className="text-xl font-bold mb-3 text-emerald-700">מועמד ב' (יואב לוי) - המועמד הטוב ביותר כשכל המידע משותף</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm font-semibold mb-1">מידע משותף: 4 יתרונות צנועים, חיסרון אחד</p>
                  <p className="text-xs text-gray-700">קורות החיים שנראים החלשים ביותר: פחות ניסיון, פרויקטים קטנים יותר, ציון הערכה נמוך יותר, ופחות מוכר בתעשייה.</p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm font-semibold mb-1">מידע ייחודי: יתרון משמעותי אחד, 2 חסרונות קלים</p>
                  <p className="text-xs text-gray-700">מנהיגות אנשים יוצאת דופן (שימור עובדים של 95%, מתואר כ"מנהיג מעצים ואמפתי"); קשיי ניהול זמן בתחילת הקריירה ואסרטיביות מוגבלת בקונפליקטים הם חסרונות קלים שניתנים לתיקון.</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold mb-2 text-blue-700">מועמדת א' (רונית כהן)</h3>
                <div className="text-sm space-y-1 mb-2">
                  <p><strong>מידע משותף:</strong> 5 יתרונות, ללא חסרונות</p>
                  <p><strong>מידע ייחודי:</strong> 3 חסרונות חמורים</p>
                </div>
                <p className="text-sm text-gray-700">קורות חיים מרשימים, אבל המידע הנסתר מראה בעיות חמורות בניהול אנשים: עזיבה של 40% בצוותים, תלונות רשמיות על יחס משפיל לעובדים זוטרים, והתגוננות מול ביקורת.</p>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                <h3 className="text-lg font-bold mb-2 text-purple-700">מועמדת ג' (דנה מזרחי)</h3>
                <div className="text-sm space-y-1 mb-2">
                  <p><strong>מידע משותף:</strong> 5 יתרונות, ללא חסרונות</p>
                  <p><strong>מידע ייחודי:</strong> 3 חסרונות חמורים</p>
                </div>
                <p className="text-sm text-gray-700">המועמדת הוותיקה ביותר, אבל המידע הנסתר מראה ניהול נוקשה ושתלטני: התנגדות ל-Agile, דיווחים על מיקרומנג'מנט וחוסר אוטונומיה, וקושי להסתגל לעבודה היברידית.</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
              <h3 className="font-bold mb-2 text-red-800">ההטיה הקלאסית של Hidden Profile (Stasser & Titus, 1985):</h3>
              <ul className="text-sm space-y-2">
                <li>• <strong>במידע המשותף:</strong> מועמדות א' וג' נראות טובות בבירור (5 יתרונות וללא חסרונות כל אחת, לעומת יתרונות צנועים וחיסרון אחד של ב')</li>
                <li>• <strong>במידע המלא:</strong> לא' ולג' יש בעיות חמורות בניהול אנשים, ואילו ב' הוא מנהיג אנשים יוצא דופן עם חסרונות קלים בלבד. בספירה פשוטה לכל השלושה יש 5 יתרונות ו-3 חסרונות - מה שמבדיל ביניהם הוא תוכן המידע הנסתר.</li>
                <li>• <strong>הבעיה:</strong> המידע שמשנה את התמונה הוא ייחודי - כל פריט נמצא אצל חבר/ה אחד/ת בלבד בקבוצה</li>
                <li>• <strong>התוצאה:</strong> קבוצות נוטות לדון במידע המשותף (discussion bias) ולכן מפספסות את היתרון של ב'</li>
                <li>• <strong>המסקנה:</strong> רק שיתוף יסודי של המידע הייחודי יגלה שב' הוא הבחירה הטובה ביותר</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/instructor')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
            >
              חזור לדף המרצה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalysis;