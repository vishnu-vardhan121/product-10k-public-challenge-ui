// Firebase configuration and initialization
import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration
// In production, these should come from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAnKfdVhooLC9MJ0e6Ec4aT7ExW8uUs9Uc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "meracil-culture.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "meracil-culture",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "meracil-culture.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "574521063603",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:574521063603:web:c094f1c3c566a236cc98c6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1MCT9P7WPY"
};

// Initialize Firebase (only if not already initialized)
let app;
let auth;
let analytics;

if (typeof window !== "undefined") {
  // Only initialize on client side
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Auth
  auth = getAuth(app);

  // Initialize Analytics (only if supported)
  if (typeof window !== "undefined") {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }
}

// Helper function to setup reCAPTCHA verifier
export const setupRecaptchaVerifier = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined" || !auth) {
    return null;
  }

  // Check if verifier already exists and is valid
  if (window.recaptchaVerifier) {
    try {
      // If render is available, it's a valid verifier instance
      return window.recaptchaVerifier;
    } catch (e) {
      // If invalid, clear it
      delete window.recaptchaVerifier;
    }
  }

  // Get or create container element
  let container = document.getElementById(containerId);

  // If container doesn't exist, create it
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none'; // Hide invisible reCAPTCHA
    document.body.appendChild(container);
  } else {
    // Clear any existing content in container to extra safe
    container.innerHTML = '';
  }

  // Create new verifier
  try {
    const verifier = new RecaptchaVerifier(auth, container, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        // Response expired
        console.error("reCAPTCHA expired");
        // Clear global verifier so it can be recreated
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) { }
          delete window.recaptchaVerifier;
        }
      },
    });

    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error('Error creating reCAPTCHA verifier:', error);
    // Clear container on error
    if (container) {
      container.innerHTML = '';
    }
    // Clear global reference
    delete window.recaptchaVerifier;
    throw error;
  }
};

// Helper function to clear reCAPTCHA verifier
export const clearRecaptchaVerifier = () => {
  if (typeof window === "undefined") {
    return;
  }

  // Clear verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // Ignore errors when clearing
    }
    delete window.recaptchaVerifier;
  }

  // Clear container element
  const container = document.getElementById("recaptcha-container");
  if (container) {
    container.innerHTML = '';
  }
};

export { app, auth, analytics };
export default app;

