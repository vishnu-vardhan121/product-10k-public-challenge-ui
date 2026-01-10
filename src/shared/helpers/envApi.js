//  dev | uat | prod
const envType = process.env.NEXT_PUBLIC_env_type?.trim().replace(/^['"]|['"]$/g, '') || '';
let envConfig;

switch (envType) {
  case 'dev':
    envConfig = {
      public_challenges: 'public_challenges_dev',
      challenge_registrations: 'challenge_registrations_dev',
      mcq_questions: 'mcq_questions_dev',
      coding_problems: 'coding_problems_dev',
      leaderboard: 'leaderboard_dev',
      // base url will put here
    };
    break;
  case 'uat':
    envConfig = {
      public_challenges: 'public_challenges_uat',
      challenge_registrations: 'challenge_registrations_uat',
      mcq_questions: 'mcq_questions_uat',
      coding_problems: 'coding_problems_uat',
      leaderboard: 'leaderboard_uat',
    };
    break;
  case 'prod':
    envConfig = {
      public_challenges: 'public_challenges',
      challenge_registrations: 'challenge_registrations',
      mcq_questions: 'mcq_questions',
      coding_problems: 'coding_problems',
      leaderboard: 'leaderboard',
    };
    break;
  default:
    throw new Error(`Unsupported environment type: ${envType}`);
}

export {envConfig};

