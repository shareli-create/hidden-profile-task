// Candidate information for the task. Used by both the participant task
// (SessionTask) and the instructor's results analysis (SessionAnalysis),
// so the two always describe the same candidates.
export const candidates = [
  {
    id: 'candidate_a',
    name: 'Candidate A - Ronit Cohen',
    shared_info: [
      '12 years of project management experience',
      'MBA from an accredited college',
      'Led a project that generated ₪3 million (NIS) in revenue',
      'Average score of 4.2/5 in annual performance reviews',
      'Impressive presence at professional conferences'
    ],
    unique_info: {
      member0: 'High turnover (40%) in the teams she managed over the past two years',
      member1: 'Three formal complaints were filed about her demeaning treatment of junior employees',
      member2: 'Has difficulty accepting criticism and reacts defensively'
    }
  },
  {
    id: 'candidate_b',
    name: 'Candidate B - Yoav Levi',
    shared_info: [
      '7 years of management experience',
      'Bachelor\'s degree in industrial engineering and management',
      'Managed projects with budgets of ₪500,000 - ₪1 million (NIS)',
      'Average score of 3.8/5 in performance reviews',
      'Less well known in the industry; has not written articles or given talks'
    ],
    unique_info: {
      member0: 'Exceptional employee retention (95%) - the highest in his entire previous company - and employees describe him as "an empowering and empathetic leader"',
      member1: 'Early in his career, struggled with time management and meeting deadlines',
      member2: 'Seen as not assertive enough in conflict situations'
    }
  },
  {
    id: 'candidate_c',
    name: 'Candidate C - Dana Mizrahi',
    shared_info: [
      '15 years of industry experience (the most senior)',
      'Master\'s degree in business administration',
      'Published two articles in professional journals',
      'Average score of 4.0/5 in performance reviews',
      'Member of national professional committees'
    ],
    unique_info: {
      member0: 'Tends to work with traditional methods and opposes Agile methods',
      member1: 'Her teams report "micromanagement" and "lack of autonomy"',
      member2: 'Struggled to adapt to hybrid work after COVID'
    }
  }
];
