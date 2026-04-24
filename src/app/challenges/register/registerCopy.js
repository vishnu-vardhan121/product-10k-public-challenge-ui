/** Static copy for the public challenge registration page — neutral, hiring-friendly tone */
export const REGISTER_PAGE_COPY = {
  loading: "Loading challenge…",
  left: {
    eyebrow: "Challenge registration",
    participantLabel: "Registered participants",
  },
  mobile: {
    subtitle:
      "Complete your details and verify your mobile number. We use this only for this challenge and related communication.",
  },
  form: {
    title: "Register",
    subtitle: "Fill in your details, verify your number, then submit once.",
    sectionPersonal: "Your details",
    sectionContact: "Contact & verification",
    sectionEducation: "Education & institution",
    footerNote: "By registering, you agree that your information may be used for this challenge and related updates.",
  },
  success: {
    title: "Registration successful",
    body: "We have sent an email to your registered address with the session timings and the join link.",
    bodyFollowUp:
      "Please open that email, use the link, and join at least 5 minutes before the scheduled start so you are settled in before the challenge begins. If you do not see the message within a few minutes, check your spam or promotions folder.",
    laptopTitle: "Use a laptop for the challenge",
    laptopBody:
      "For coding, navigation, and a stable session, join from a laptop or desktop. Phones and small tablets are not recommended for this challenge.",
    whatsappTitle: "Join the WhatsApp group",
    whatsappBody:
      "Get updates, reminders, and community support for this challenge. Tap below to open the invite in WhatsApp.",
    whatsappCta: "Join WhatsApp group",
    cta: "Back to home",
  },
  challengeNotFound: {
    titleClosed: "Registration closed",
    titleMissing: "Challenge not found",
    cta: "Go to home",
  },
  /** Shown when API returns that the challenge window is over (e.g. slug detail 400). */
  challengeEnded: {
    title: "Challenge ended",
    subtitle: "This challenge is no longer open for registration.",
  },
};
