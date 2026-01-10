"use client";
import React from "react";
import { Provider } from "react-redux";
import { store, persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";

/**
 * Loading component shown while Redux Persist rehydrates state
 */
const PersistLoadingSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-orange-500"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={<PersistLoadingSpinner />}
        persistor={persistor}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}

