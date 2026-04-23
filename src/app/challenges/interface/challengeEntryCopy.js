/**
 * Static copy for the public challenge / interview entry flow.
 * Challenge title comes from API (`challenge.title`); keep wording neutral for hiring and assessments.
 */
export const CHALLENGE_ENTRY_COPY = {
  fallbackChallengeTitle: "Challenge",

  left: {
    subtitle: "Public challenge access",
    description:
      "Verify your mobile number to continue. If you are already registered, you can enter directly. If not, complete your details to proceed.",
    chipSecure: "Secure entry",
    chipRealtime: "Real-time evaluation",
  },

  /** Highlighted callout — rendered only below `lg` in interface/page (phones / small tablets) */
  laptopCallout: {
    title: "Use a laptop for this challenge",
    body: "For the best experience—coding, navigation, and proctoring—join from a laptop or desktop. A phone or small tablet may be hard to complete the session on.",
  },

  step1: {
    heading: "Enter challenge",
    subheading:
      "Use your mobile number to continue. We'll check whether you are already registered for this challenge.",
    mobileLabel: "Mobile number",
    mobilePlaceholder: "Enter your mobile number",
    continue: "Continue",
    checking: "Checking…",
    sendingCode: "Sending verification code…",
    footer:
      "Your information is used only for challenge access and communication related to this challenge.",
  },

  step2: {
    heading: "Complete your details",
    subheading:
      "We couldn't find an existing registration for this mobile number. Please provide your details to continue.",
    changeMobile: "Change mobile number",
    mobileCheckedHint:
      "This number was used for your registration check. Use Change mobile number if you need to correct it.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Enter your full name",
    emailLabel: "Email address",
    emailPlaceholder: "Enter your email address",
    addressLabel: "Current address",
    addressPlaceholder: "Enter your current address",
    qualificationLabel: "Highest qualification",
    qualificationPlaceholder: "e.g. B.Tech, B.Sc., Diploma",
    institutionLabel: "Institution or organization",
    institutionPlaceholder: "College, university, or employer",
    yearLabel: "Year of completion",
    yearPlaceholder: "e.g. 2024",
    primaryButton: "Continue to challenge",
    footer: "Your information is used only for this challenge and related communication.",
  },

  otp: {
    heading: "Verification",
    subheadingIntro: "Enter the code we sent to",
    codeLabel: "Verification code",
    changeMobile: "Change mobile number",
    resendIn: "Resend code in",
    resend: "Resend code",
    verifyButton: "Verify and continue",
    verifying: "Verifying…",
  },

  countdown: {
    title: "Challenge starts in",
    helper: "Stay on this page. You will enter automatically when the session opens.",
    whatsappTitle: "Join the WhatsApp group",
    whatsappBody:
      "Get last-minute updates and reminders while you wait. Open the invite in WhatsApp (install the app if needed).",
    whatsappCta: "Join WhatsApp group",
  },

  loading: {
    redirect: "Taking you to challenges…",
    preparing: "Preparing your session…",
    /** Shown while registration completes after OTP (Redux `loading.register`) */
    sessionSetup: "Setting up your session…",
    /** In-card overlay while challenge details refresh without leaving the form */
    cardWait: "One moment…",
  },

  validation: {
    challengeIdRequired: "Challenge ID is required.",
    mobileRequired: "Mobile number is required.",
    mobileInvalid: "Enter a valid 10-digit mobile number.",
    otpLength: "Enter the 6-digit verification code.",
    continueMobileFirst: "Continue with your mobile number first.",
    nameRequired: "Full name is required.",
    emailRequired: "Email address is required.",
    emailInvalid: "Enter a valid email address.",
    addressRequired: "Current address is required.",
    qualificationRequired: "Qualification is required.",
    institutionRequired: "Institution or organization is required.",
    yearRequired: "Year of completion is required.",
    yearRange: "Enter a year between 1900 and 2100.",
    registrationCheckFailed: "Could not verify registration for this number. Please try again.",
    registrationCheckError: "Could not check registration. Please try again.",
    sendCodeFailed: "Unable to send verification code. Please try again.",
    registrationSaveFailed: "Registration could not be completed. Please try again.",
    batchStudent:
      "This challenge is for new participants only. You're already a 10000 Coders student — share the link with friends!",
  },
};
