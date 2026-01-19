import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getChallenges,
  getChallengeDetails,
  getChallengeBySlug,
  checkRegistrationStatus as checkRegistrationStatusApi,
  getMCQQuestions,
  submitMCQAnswers,
  getCodingProblems,
  runSampleTests,
  submitProblemSolution,
  getMyScore,
  getDraft,
  saveDraft,
} from '@/services/publicChallengeApi';

const initialState = {
  challenges: [],
  currentChallenge: null,
  mcqQuestions: [],
  codingProblems: [],
  myScore: null,
  accessCode: null,
  phone: null,
  userId: null,
  userName: null,
  registrationId: null,
  loading: {
    challenges: false,
    challengeDetails: false,
    checkRegistration: false,
    mcqQuestions: false,
    codingProblems: false,
    submitMCQ: false,
    submitProblem: false,
    myScore: false,
  },
  timeOffset: 0,
  error: null,
  mcqAnswers: {}, // { questionId: { selected_option_id?, text_answer? } }
  problemSubmissions: {}, // { problemId: { language, source_code, result } }
};

// Async Thunks
export const fetchChallenges = createAsyncThunk(
  'publicChallenge/fetchChallenges',
  async (_, { rejectWithValue }) => {
    try {
      const { challenges, serverTime } = await getChallenges();

      // Calculate offset
      const serverDate = new Date(serverTime);
      const clientDate = new Date();
      const offset = serverDate.getTime() - clientDate.getTime();

      return { challenges, offset };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch challenges');
    }
  }
);

export const fetchChallengeDetails = createAsyncThunk(
  'publicChallenge/fetchChallengeDetails',
  async (challengeId, { rejectWithValue }) => {
    try {
      const response = await getChallengeDetails(challengeId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch challenge details');
    }
  }
);

export const fetchChallengeBySlug = createAsyncThunk(
  'publicChallenge/fetchChallengeBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await getChallengeBySlug(slug);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch challenge details');
    }
  }
);

export const checkRegistrationStatus = createAsyncThunk(
  'publicChallenge/checkRegistrationStatus',
  async ({ challengeId, phone }, { rejectWithValue }) => {
    try {
      const response = await checkRegistrationStatusApi(challengeId, phone);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check registration status');
    }
  }
);

export const fetchMCQQuestions = createAsyncThunk(
  'publicChallenge/fetchMCQQuestions',
  async ({ challengeId, userId, registrationId }, { rejectWithValue }) => {
    try {
      const response = await getMCQQuestions(challengeId, userId, registrationId);
      return response?.data || response || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch MCQ questions');
    }
  }
);

export const submitMCQ = createAsyncThunk(
  'publicChallenge/submitMCQ',
  async ({ challengeId, userId, registrationId, submissions }, { rejectWithValue }) => {
    try {
      const response = await submitMCQAnswers(challengeId, userId, registrationId, submissions);
      // Check if response indicates failure
      if (response?.success === false) {
        return rejectWithValue({
          message: response?.message || 'Failed to submit MCQ answers',
          errors: response?.errors || []
        });
      }
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message || 'Failed to submit MCQ answers',
        errors: error.response?.data?.errors || [],
        response: error.response?.data
      });
    }
  }
);

export const fetchCodingProblems = createAsyncThunk(
  'publicChallenge/fetchCodingProblems',
  async ({ challengeId, userId, registrationId }, { rejectWithValue }) => {
    try {
      const response = await getCodingProblems(challengeId, userId, registrationId);
      // Handle response structure: {success: true, data: [...], message: "..."}
      if (response?.success && Array.isArray(response?.data)) {
        return response;
      } else if (Array.isArray(response)) {
        return { success: true, data: response };
      } else if (response?.data && Array.isArray(response.data)) {
        return response;
      }
      return { success: true, data: [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coding problems');
    }
  }
);

export const runSample = createAsyncThunk(
  'publicChallenge/runSample',
  async ({ challengeId, problemId, userId, registrationId, language, sourceCode }, { rejectWithValue }) => {
    try {
      const response = await runSampleTests(challengeId, problemId, userId, registrationId, language, sourceCode);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to run sample tests');
    }
  }
);

export const submitProblem = createAsyncThunk(
  'publicChallenge/submitProblem',
  async ({ challengeId, problemId, userId, registrationId, accessCode, language, sourceCode }, { rejectWithValue }) => {
    try {
      const response = await submitProblemSolution(challengeId, problemId, userId, registrationId, accessCode, language, sourceCode);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit solution');
    }
  }
);

export const fetchMyScore = createAsyncThunk(
  'publicChallenge/fetchMyScore',
  async ({ challengeId, userId, registrationId }, { rejectWithValue }) => {
    try {
      const response = await getMyScore(challengeId, userId, registrationId);
      return response?.data || response || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch score');
    }
  }
);

export const fetchPublicChallengeDraft = createAsyncThunk(
  'publicChallenge/fetchDraft',
  async ({ challengeId, problemId, userId, language }, { rejectWithValue }) => {
    try {
      const response = await getDraft(challengeId, problemId, userId, language);
      return response?.data ? { ...response.data, problemId } : null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch draft');
    }
  }
);

export const savePublicChallengeDraft = createAsyncThunk(
  'publicChallenge/saveDraft',
  async ({ challengeId, problemId, userId, language, sourceCode }, { rejectWithValue }) => {
    try {
      const response = await saveDraft(challengeId, problemId, userId, language, sourceCode);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save draft');
    }
  }
);

const publicChallengeSlice = createSlice({
  name: 'publicChallenge',
  initialState,
  reducers: {
    setAccessCode: (state, action) => {
      state.accessCode = action.payload;
    },
    setPhone: (state, action) => {
      state.phone = action.payload;
    },
    setUserId: (state, action) => {
      state.userId = action.payload;
    },
    setUserName: (state, action) => {
      state.userName = action.payload;
    },
    setRegistrationId: (state, action) => {
      state.registrationId = action.payload;
    },
    updateMCQAnswer: (state, action) => {
      const { questionId, answer } = action.payload;
      state.mcqAnswers[questionId] = answer;
    },
    updateProblemCode: (state, action) => {
      const { problemId, language, sourceCode } = action.payload;
      if (!state.problemSubmissions[problemId]) {
        state.problemSubmissions[problemId] = {};
      }
      state.problemSubmissions[problemId].language = language;
      state.problemSubmissions[problemId].source_code = sourceCode;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetChallengeState: (state) => {
      state.currentChallenge = null;
      state.mcqQuestions = [];
      state.codingProblems = [];
      state.mcqAnswers = {};
      state.problemSubmissions = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Challenges
    builder
      .addCase(fetchChallenges.pending, (state) => {
        state.loading.challenges = true;
        state.error = null;
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.loading.challenges = false;
        if (action.payload.challenges) {
          const challengeData = action.payload.challenges;
          if (challengeData.success && Array.isArray(challengeData.data)) {
            state.challenges = challengeData.data;
          } else if (Array.isArray(challengeData)) {
            state.challenges = challengeData;
          }
        }
        state.timeOffset = action.payload.offset || 0;
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.loading.challenges = false;
        state.error = action.payload;
      });

    // Fetch Challenge Details
    builder
      .addCase(fetchChallengeDetails.pending, (state) => {
        state.loading.challengeDetails = true;
        state.error = null;
      })
      .addCase(fetchChallengeDetails.fulfilled, (state, action) => {
        state.loading.challengeDetails = false;
        if (action.payload?.success && action.payload?.data) {
          state.currentChallenge = action.payload.data;
          // Extract problems and MCQ questions from challenge details
          // These are already included in the API response
          if (action.payload.data.problems && Array.isArray(action.payload.data.problems)) {
            state.codingProblems = action.payload.data.problems;
          }
          if (action.payload.data.mcq_questions && Array.isArray(action.payload.data.mcq_questions)) {
            state.mcqQuestions = action.payload.data.mcq_questions;
          }
        }
      })
      .addCase(fetchChallengeDetails.rejected, (state, action) => {
        state.loading.challengeDetails = false;
        state.error = action.payload;
      })

      // Fetch Challenge By Slug
      .addCase(fetchChallengeBySlug.pending, (state) => {
        state.loading.challengeDetails = true;
        state.error = null;
        state.currentChallenge = null;
      })
      .addCase(fetchChallengeBySlug.fulfilled, (state, action) => {
        state.loading.challengeDetails = false;
        if (action.payload?.success && action.payload?.data) {
          state.currentChallenge = action.payload.data;
          // Extract problems and MCQ questions from challenge details
          if (action.payload.data.problems && Array.isArray(action.payload.data.problems)) {
            state.codingProblems = action.payload.data.problems;
          }
          if (action.payload.data.mcq_questions && Array.isArray(action.payload.data.mcq_questions)) {
            state.mcqQuestions = action.payload.data.mcq_questions;
          }
        }
      })
      .addCase(fetchChallengeBySlug.rejected, (state, action) => {
        state.loading.challengeDetails = false;
        state.error = action.payload;
      });

    // Check Registration Status
    builder
      .addCase(checkRegistrationStatus.pending, (state) => {
        state.loading.checkRegistration = true;
        state.error = null;
      })
      .addCase(checkRegistrationStatus.fulfilled, (state, action) => {
        state.loading.checkRegistration = false;
        // Store user_id and registration_id if registration is found
        if (action.payload?.is_registered && action.payload?.user_id && action.payload?.registration_id) {
          state.userId = action.payload.user_id;
          state.registrationId = action.payload.registration_id;
          // Store user name if available in the response
          if (action.payload.data?.user?.name) {
            state.userName = action.payload.data.user.name;
          }
        }
      })
      .addCase(checkRegistrationStatus.rejected, (state, action) => {
        state.loading.checkRegistration = false;
        state.error = action.payload;
      });

    // Fetch MCQ Questions
    builder
      .addCase(fetchMCQQuestions.pending, (state) => {
        state.loading.mcqQuestions = true;
        state.error = null;
      })
      .addCase(fetchMCQQuestions.fulfilled, (state, action) => {
        state.loading.mcqQuestions = false;
        state.mcqQuestions = Array.isArray(action.payload) ? action.payload : (action.payload?.data || []);
      })
      .addCase(fetchMCQQuestions.rejected, (state, action) => {
        state.loading.mcqQuestions = false;
        state.error = action.payload;
      });

    // Submit MCQ
    builder
      .addCase(submitMCQ.pending, (state) => {
        state.loading.submitMCQ = true;
        state.error = null;
      })
      .addCase(submitMCQ.fulfilled, (state, action) => {
        state.loading.submitMCQ = false;
        // Answers are saved, but no feedback during challenge
      })
      .addCase(submitMCQ.rejected, (state, action) => {
        state.loading.submitMCQ = false;
        state.error = action.payload;
      });

    // Fetch Coding Problems
    builder
      .addCase(fetchCodingProblems.pending, (state) => {
        state.loading.codingProblems = true;
        state.error = null;
      })
      .addCase(fetchCodingProblems.fulfilled, (state, action) => {
        state.loading.codingProblems = false;
        // Handle response structure: {success: true, data: [...], message: "..."}
        if (action.payload?.success && Array.isArray(action.payload?.data)) {
          state.codingProblems = action.payload.data;
        } else if (Array.isArray(action.payload)) {
          state.codingProblems = action.payload;
        } else {
          state.codingProblems = action.payload?.data || [];
        }
      })
      .addCase(fetchCodingProblems.rejected, (state, action) => {
        state.loading.codingProblems = false;
        state.error = action.payload;
      });

    // Submit Problem
    builder
      .addCase(submitProblem.pending, (state) => {
        state.loading.submitProblem = true;
        state.error = null;
      })
      .addCase(submitProblem.fulfilled, (state, action) => {
        state.loading.submitProblem = false;
        const result = action.payload?.data || action.payload;
        if (result?.problem_id) {
          if (!state.problemSubmissions[result.problem_id]) {
            state.problemSubmissions[result.problem_id] = {};
          }
          state.problemSubmissions[result.problem_id].result = result;
        }
      })
      .addCase(submitProblem.rejected, (state, action) => {
        state.loading.submitProblem = false;
        state.error = action.payload;
      });

    // Fetch My Score
    builder
      .addCase(fetchMyScore.pending, (state) => {
        state.loading.myScore = true;
        state.error = null;
      })
      .addCase(fetchMyScore.fulfilled, (state, action) => {
        state.loading.myScore = false;
        state.myScore = action.payload || null;
      })
      .addCase(fetchMyScore.rejected, (state, action) => {
        state.loading.myScore = false;
        state.error = action.payload;
      });

    // Fetch Draft
    builder
      .addCase(fetchPublicChallengeDraft.fulfilled, (state, action) => {
        if (action.payload) {
          const { problemId, language, source_code } = action.payload;
          if (!state.problemSubmissions[problemId]) {
            state.problemSubmissions[problemId] = {};
          }
          state.problemSubmissions[problemId].language = language;
          state.problemSubmissions[problemId].source_code = source_code;
        }
      });
  },
});

export const {
  setAccessCode,
  setPhone,
  setUserId,
  setUserName,
  setRegistrationId,
  updateMCQAnswer,
  updateProblemCode,
  clearError,
  resetChallengeState,
} = publicChallengeSlice.actions;

export default publicChallengeSlice.reducer;

