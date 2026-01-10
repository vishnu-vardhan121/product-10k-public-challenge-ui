"use client";
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import rootReducer from "./reducers";

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },
  setItem(_key, value) {
    return Promise.resolve(value);
  },
  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

/**
 * Redux Persist Configuration
 */
const persistConfig = {
  key: "public-challenge-ui",
  storage,
  version: 1,
  blacklist: [
    "publicChallenge", // Don't persist challenge data (always fetch fresh)
  ],
  timeout: 1000,
  writeFailHandler: (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Redux Persist] Write failed:', err);
    }
  },
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST", 
          "persist/REHYDRATE",
        ],
        ignoredPaths: [],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

const persistor = persistStore(store);
export { store, persistor };

