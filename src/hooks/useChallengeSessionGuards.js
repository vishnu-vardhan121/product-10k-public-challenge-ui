"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getTabAwaySessionStrikes,
  setTabAwaySessionStrikes,
} from "@/utils/challengeTabAwaySessionStrikes";

export const MAX_TAB_AWAY_STRIKES = 5;

/**
 * Session rules: camera must be allowed (local preview only, not recorded) + tab-away strikes.
 * Strike count is persisted in localStorage per challengeId so refresh does not reset it.
 *
 * @param {boolean} sessionActive
 * @param {React.MutableRefObject<HTMLVideoElement | null>} videoRef
 * @param {string|number|null|undefined} challengeId
 */
export function useChallengeSessionGuards(sessionActive, videoRef, challengeId) {
  const streamRef = useRef(null);
  const sessionActiveRef = useRef(sessionActive);
  sessionActiveRef.current = sessionActive;

  const challengeIdRef = useRef(challengeId);
  challengeIdRef.current = challengeId;

  const initialStrikes =
    typeof window !== "undefined" && challengeId != null && String(challengeId).trim() !== ""
      ? getTabAwaySessionStrikes(challengeId)
      : 0;

  const [awayStrikes, setAwayStrikes] = useState(initialStrikes);
  const [focusBlocked, setFocusBlocked] = useState(false);
  const focusBlockedRef = useRef(false);
  focusBlockedRef.current = focusBlocked;
  /** idle | requesting | ready | denied | unsupported */
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraRetryTick, setCameraRetryTick] = useState(0);
  /** Last strike count we showed a toast for — avoids duplicate toasts (e.g. React Strict Mode). */
  const prevAwayStrikesRef = useRef(initialStrikes);

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const el = videoRef?.current;
    if (el) el.srcObject = null;
  }, [videoRef]);

  // When challenge id changes, reload persisted strikes for that challenge.
  useEffect(() => {
    if (challengeId == null || String(challengeId).trim() === "") return;
    const s = getTabAwaySessionStrikes(String(challengeId));
    setAwayStrikes(s);
    prevAwayStrikesRef.current = s;
  }, [challengeId]);

  useEffect(() => {
    if (!sessionActive) {
      stopStream();
      setFocusBlocked(false);
      setCameraStatus("idle");
      return;
    }

    setCameraStatus("requesting");
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          if (!cancelled) setCameraStatus("unsupported");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (!cancelled) setCameraStatus("ready");
      } catch {
        if (!cancelled) {
          stopStream();
          setCameraStatus("denied");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [sessionActive, cameraRetryTick, stopStream]);

  useLayoutEffect(() => {
    if (cameraStatus !== "ready" || !streamRef.current || !videoRef?.current) return;
    const el = videoRef.current;
    el.srcObject = streamRef.current;
    el.muted = true;
    el.setAttribute("playsinline", "");
    el.play().catch(() => {});
  }, [cameraStatus, videoRef]);

  // One toast per strike increase — do not toast inside setState (Strict Mode can run updaters twice).
  useEffect(() => {
    if (!sessionActive) {
      prevAwayStrikesRef.current = awayStrikes;
      return;
    }
    const prev = prevAwayStrikesRef.current;
    if (awayStrikes <= prev) {
      prevAwayStrikesRef.current = awayStrikes;
      return;
    }
    prevAwayStrikesRef.current = awayStrikes;

    if (awayStrikes < MAX_TAB_AWAY_STRIKES) {
      toast.warning(
        `You left this tab (${awayStrikes}/${MAX_TAB_AWAY_STRIKES}). Stay on this window to continue the challenge.`,
        { position: "top-center", autoClose: 3200 }
      );
    } else {
      toast.error(
        `You left this tab ${MAX_TAB_AWAY_STRIKES} times. This challenge is blocked.`,
        { position: "top-center", autoClose: 5000 }
      );
    }
  }, [sessionActive, awayStrikes]);

  useEffect(() => {
    if (!sessionActive) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") return;
      if (!sessionActiveRef.current || focusBlockedRef.current) return;

      setAwayStrikes((n) => {
        if (!sessionActiveRef.current || focusBlockedRef.current) return n;
        const next = Math.min(n + 1, MAX_TAB_AWAY_STRIKES);
        const id = challengeIdRef.current;
        if (id != null && String(id).trim() !== "") {
          setTabAwaySessionStrikes(String(id), next);
        }
        if (next >= MAX_TAB_AWAY_STRIKES) {
          setFocusBlocked(true);
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [sessionActive]);

  const retryCamera = useCallback(() => {
    stopStream();
    setCameraRetryTick((t) => t + 1);
  }, [stopStream]);

  return {
    awayStrikes,
    maxTabAwayStrikes: MAX_TAB_AWAY_STRIKES,
    focusBlocked,
    cameraStatus,
    retryCamera,
  };
}
