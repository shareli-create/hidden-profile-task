import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Download, Users, CheckCircle } from 'lucide-react';
import { subscribeToSession } from '../firebase/database';

const SessionAnalysis = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const candidates = [
    {
      id: 'candidate_a',
      name: 'Candidate A',
      shared_info: [
        'Able to express himself clearly and persuasively',
        'Highly self-confident',
        'Determined and assertive in making decisions',
        'Has high intellectual ability',
        'Seen as having an overly high opinion of himself',
        'Rigid in his views and not always open to others'
      ],
      unique_info: {
        group1: ['Full of energy and initiative', 'Ambitious and driven by success'],
        group2: ['Tends to hold prejudices toward others', 'Tends to avoid responsibility when things go wrong'],
        group3: ['Not always honest and tends to hide information', 'Ruthless and willing to hurt others to reach his goals']
      },
      positive_shared: 4,
      negative_shared: 2,
      positive_unique: 2,
      negative_unique: 4
    },
    {
      id: 'candidate_b',
      name: 'Candidate B',
      shared_info: [
        'Has high intellectual ability',
        'Able to express himself clearly and persuasively',
        'Highly self-confident',
        'Rigid in his views and not always open to others',
        'Seen as having an overly high opinion of himself',
        'Tends to hold prejudices toward others'
      ],
      unique_info: {
        group1: ['Responsible and takes full ownership of his actions', 'Honest and straightforward in communicating with others'],
        group2: ['Fair and egalitarian in how he treats people', 'Trustworthy and keeps confidences'],
        group3: ['Shows mature, balanced judgment', 'Consistent between what he says and what he does']
      },
      positive_shared: 3,
      negative_shared: 3,
      positive_unique: 6,
      negative_unique: 0
    },
    {
      id: 'candidate_c',
      name: 'Candidate C',
      shared_info: [
        'Full of energy and initiative',
        'Ambitious and driven by success',
        'Determined and assertive in making decisions',
        'Has high intellectual ability',
        'Ruthless and willing to hurt others to reach his goals',
        'Not always honest and tends to hide information'
      ],
      unique_info: {
        group1: ['Able to express himself clearly and persuasively', 'Highly self-confident'],
        group2: ['Seen as having an overly high opinion of himself', 'Rigid in his views and not always open to others'],
        group3: ['Tends to hold prejudices toward others', 'Tends to avoid responsibility when things go wrong']
      },
      positive_shared: 4,
      negative_shared: 2,
      positive_unique: 2,
      negative_unique: 4
    }
  ];

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
          choiceName: candidates.find(c => c.id === group.groupDecision.choice)?.name || 'Unknown'
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
          groupChoice: candidates.find(c => c.id === group.groupDecision?.choice)?.name || 'Unknown',
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
    csv += `Candidate A,${individualChoices.candidate_a}\n`;
    csv += `Candidate B,${individualChoices.candidate_b}\n`;
    csv += `Candidate C,${individualChoices.candidate_c}\n\n`;
    
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="ltr">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
            <p>Loading data...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-6" dir="ltr">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-3xl font-bold">Results Analysis - Hidden Profile Task</h1>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="w-5 h-5 mr-2" />
              Export to CSV
            </button>
          </div>

          {/* Section 1: Individual Choices */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Individual Choices (Before Discussion)
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-lg mb-2">Candidate A</h3>
                <p className="text-3xl font-bold text-blue-600">{individualChoices.candidate_a}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_a / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <h3 className="font-semibold text-lg mb-2">Candidate B</h3>
                <p className="text-3xl font-bold text-green-600">{individualChoices.candidate_b}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_b / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-lg mb-2">Candidate C</h3>
                <p className="text-3xl font-bold text-purple-600">{individualChoices.candidate_c}</p>
                <p className="text-sm text-gray-600">
                  ({totalIndividuals > 0 ? ((individualChoices.candidate_c / totalIndividuals) * 100).toFixed(1) : 0}%)
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Group Decisions */}
          <div className="mb-8 p-6 bg-orange-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Group Decisions (After Discussion)</h2>
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
            <h2 className="text-2xl font-bold mb-4">Weight Analysis - Shared vs. Unique Information</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-purple-200">
                  <tr>
                    <th className="p-3 text-left">Group</th>
                    <th className="p-3 text-left">Decision</th>
                    <th className="p-3 text-left">Mean weight - shared information</th>
                    <th className="p-3 text-left">Mean weight - unique information</th>
                    <th className="p-3 text-left">Bias (shared - unique)</th>
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
                <strong>How to read the scores:</strong><br/>
                • <strong className="text-yellow-700">Yellow (+0.3 and above):</strong> the group gave more weight to shared information - this is the typical Hidden Profile bias<br/>
                • <strong className="text-gray-700">Gray (-0.3 to +0.3):</strong> the group gave similar weight to both types of information<br/>
                • <strong className="text-green-700">Green (-0.3 and below):</strong> the group gave more weight to unique information - it overcame the bias!
              </p>
            </div>
          </div>

          {/* Section 4: Information Structure Reveal */}
          <div className="p-6 bg-emerald-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-emerald-600" />
              Information Structure According to Stasser & Titus (1985)
            </h2>
            
            <div className="mb-6 p-4 bg-white rounded-lg border-2 border-emerald-300">
              <h3 className="text-xl font-bold mb-3 text-emerald-700">Candidate B - the optimal candidate!</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-sm font-semibold mb-1">Shared information</p>
                  <p className="text-2xl font-bold text-blue-600">3+ / 3-</p>
                  <p className="text-xs text-gray-600">Looks balanced</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-sm font-semibold mb-1">Unique information</p>
                  <p className="text-2xl font-bold text-green-600">6+ / 0-</p>
                  <p className="text-xs text-gray-600">All the advantages are hidden!</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded">
                  <p className="text-sm font-semibold mb-1">Total</p>
                  <p className="text-2xl font-bold text-emerald-600">9+ / 3-</p>
                  <p className="text-xs text-gray-600">3:1 ratio - the best</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold mb-2 text-blue-700">Candidate A</h3>
                <div className="text-sm space-y-1 mb-2">
                  <p><strong>Shared information:</strong> 4 positive, 2 negative</p>
                  <p><strong>Unique information:</strong> 2 positive, 4 negative</p>
                  <p className="font-semibold text-blue-600">Total: 6 positive / 6 negative (1:1 ratio)</p>
                </div>
                <p className="text-sm text-gray-700">Looks good on the shared information, but is actually balanced</p>
              </div>
              
              <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                <h3 className="text-lg font-bold mb-2 text-purple-700">Candidate C</h3>
                <div className="text-sm space-y-1 mb-2">
                  <p><strong>Shared information:</strong> 4 positive, 2 negative</p>
                  <p><strong>Unique information:</strong> 2 positive, 4 negative</p>
                  <p className="font-semibold text-purple-600">Total: 6 positive / 6 negative (1:1 ratio)</p>
                </div>
                <p className="text-sm text-gray-700">Also looks good on the shared information, but is also balanced</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
              <h3 className="font-bold mb-2 text-red-800">The classic Hidden Profile bias (Stasser & Titus, 1985):</h3>
              <ul className="text-sm space-y-2">
                <li>• <strong>On the shared information:</strong> candidates A and C look better (4 positive vs. 3 for B)</li>
                <li>• <strong>On the full information:</strong> candidate B is objectively the best (3:1 ratio vs. 1:1)</li>
                <li>• <strong>The problem:</strong> all 6 of B's positive traits are in the unique information spread across the group</li>
                <li>• <strong>The result:</strong> groups tend to discuss the shared information (discussion bias) and so miss B's advantage</li>
                <li>• <strong>The conclusion:</strong> only thorough sharing of all the unique information reveals that B is the optimal choice</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/instructor')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
            >
              Back to the instructor page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalysis;