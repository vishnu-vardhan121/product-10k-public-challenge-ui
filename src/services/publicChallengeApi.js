// API service functions for public challenges
import axios from '../axios';

const API_BASE = '/public-challenges';

/**
 * Get list of all challenges
 */
export const getChallenges = async () => {
  const response = await axios.get(`${API_BASE}/challenges/`);
  return {
    challenges: response.data,
    serverTime: response.headers['date'] || new Date().toISOString()
  };
};

/**
 * Get challenge details by ID
 */
export const getChallengeDetails = async (challengeId) => {
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/`);
  return response.data;
};

/**
 * Get challenge details by slug
 */
export const getChallengeBySlug = async (slug) => {
  const response = await axios.get(`${API_BASE}/challenges/slug/${slug}/`);
  return response.data;
};

/**
 * Register for a challenge
 * @param {Object} registrationData - Registration data
 * @param {string} registrationData.name - User name (required)
 * @param {string} registrationData.email - User email (required)
 * @param {string} registrationData.phone - User phone (required)
 * @param {string} registrationData.address - Address (optional)
 * @param {string} registrationData.qualification - Qualification (optional)
 * @param {string} registrationData.college_name - College name (optional)
 * @param {number} registrationData.year_of_passing - Year of passing (optional)
 * @param {number} registrationData.challenge_id - Challenge ID (required)
 */
export const registerForChallenge = async (registrationData) => {
  const response = await axios.post(`${API_BASE}/challenges/register/`, registrationData);
  return response.data;
};

/**
 * Check registration status for a challenge
 * @param {number} challengeId - Challenge ID
 * @param {string} phone - User phone number
 */
export const checkRegistrationStatus = async (challengeId, phone) => {
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/registration-status/`, {
    params: { phone }
  });
  return response.data;
};

/**
 * Get MCQ questions for a challenge
 * @param {number} challengeId - Challenge ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (required)
 */
export const getMCQQuestions = async (challengeId, userId, registrationId) => {
  if (!userId || !registrationId) {
    throw new Error('userId and registrationId are required');
  }
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/mcq-questions/`, {
    params: {
      user_id: userId,
      registration_id: registrationId
    }
  });
  return response.data;
};

/**
 * Submit MCQ answers
 * @param {number} challengeId - Challenge ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (required)
 * @param {Array} submissions - Array of submission objects {question_id, selected_option_id?, text_answer?}
 */
export const submitMCQAnswers = async (challengeId, userId, registrationId, submissions) => {
  if (!userId || !registrationId) {
    throw new Error('userId and registrationId are required');
  }
  const response = await axios.post(`${API_BASE}/challenges/${challengeId}/mcq-submit/`, {
    user_id: userId,
    registration_id: registrationId,
    submissions
  });
  return response.data;
};

/**
 * Get coding problems for a challenge
 * @param {number} challengeId - Challenge ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (required)
 */
export const getCodingProblems = async (challengeId, userId, registrationId) => {
  if (!userId || !registrationId) {
    throw new Error('userId and registrationId are required');
  }
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/problems/`, {
    params: {
      user_id: userId,
      registration_id: registrationId
    }
  });
  return response.data;
};

/**
 * Run sample tests for a problem (no submission)
 * @param {number} challengeId - Challenge ID
 * @param {number} problemId - Problem ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (required)
 * @param {string} language - Programming language (python, javascript, java)
 * @param {string} sourceCode - Source code
 */
export const runSampleTests = async (challengeId, problemId, userId, registrationId, language, sourceCode) => {
  if (!userId || !registrationId) {
    throw new Error('userId and registrationId are required');
  }
  const response = await axios.post(`${API_BASE}/challenges/${challengeId}/problems/${problemId}/sample-run/`, {
    user_id: userId,
    registration_id: registrationId,
    language,
    source_code: sourceCode
  });
  return response.data;
};

/**
 * Submit code solution for a problem
 * @param {number} challengeId - Challenge ID
 * @param {number} problemId - Problem ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (required)
 * @param {string} accessCode - Access code (for PUBLIC/COLLEGE_STUDENTS challenges)
 * @param {string} language - Programming language (python, javascript, java)
 * @param {string} sourceCode - Source code
 */
export const submitProblemSolution = async (challengeId, problemId, userId, registrationId, accessCode, language, sourceCode) => {
  if (!userId || !registrationId) {
    throw new Error('userId and registrationId are required');
  }
  const data = {
    user_id: userId,
    registration_id: registrationId,
    language,
    source_code: sourceCode
  };
  if (accessCode) {
    data.access_code = accessCode;
  }
  const response = await axios.post(`${API_BASE}/challenges/${challengeId}/problems/${problemId}/submit/`, data);
  return response.data;
};

/**
 * Get user's score for a challenge
 * @param {number} challengeId - Challenge ID
 * @param {number} userId - User ID (required)
 * @param {number} registrationId - Registration ID (optional, for validation)
 */
export const getMyScore = async (challengeId, userId, registrationId) => {
  if (!userId) {
    throw new Error('userId is required');
  }
  const params = { user_id: userId };
  if (registrationId) {
    params.registration_id = registrationId;
  }
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/my-score/`, {
    params
  });
  return response.data;
};


/**
 * Save code draft
 * @param {number} challengeId - Challenge ID
 * @param {number} problemId - Problem ID
 * @param {number} userId - User ID
 * @param {string} language - Programming language
 * @param {string} sourceCode - Source code
 */
export const saveDraft = async (challengeId, problemId, userId, language, sourceCode) => {
  const response = await axios.post(`${API_BASE}/challenges/${challengeId}/problems/${problemId}/draft/`, {
    user_id: userId,
    language,
    source_code: sourceCode
  });
  return response.data;
};

/**
 * Get code draft
 * @param {number} challengeId - Challenge ID
 * @param {number} problemId - Problem ID
 * @param {number} userId - User ID
 */
export const getDraft = async (challengeId, problemId, userId) => {
  const response = await axios.get(`${API_BASE}/challenges/${challengeId}/problems/${problemId}/draft/`, {
    params: { user_id: userId }
  });
  return response.data;
};
