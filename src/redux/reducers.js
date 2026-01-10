"use client";
import { combineReducers } from "@reduxjs/toolkit";
import publicChallengeReducer from "./features/publicChallenge/publicChallengeSlice";

const rootReducer = combineReducers({
  publicChallenge: publicChallengeReducer,
});

export default rootReducer;

