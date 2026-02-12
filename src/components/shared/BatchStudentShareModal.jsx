"use client";
import React, { useEffect } from "react";
import { FaTimes, FaWhatsapp, FaLink } from "react-icons/fa";

const SHARE_MESSAGE = "Check out this coding challenge from 10000Coders! Register and compete for rewards.";

const UTM_PARAMS = {
  utm_source: "frnd_reff",
  utm_medium: "share",
  utm_campaign: "referral",
};

function addUtmToShareUrl(href) {
  if (!href) return href;
  try {
    const url = new URL(href);
    Object.entries(UTM_PARAMS).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    const sep = href.includes("?") ? "&" : "?";
    const qs = new URLSearchParams(UTM_PARAMS).toString();
    return `${href}${sep}${qs}`;
  }
}

/**
 * Modal shown when a 10000Coders batch student tries to register/verify OTP.
 * Asks them to share the form with friends and provides WhatsApp share + copy link.
 * Share link includes UTM params (utm_source=frnd_reff) so friend signups are tracked.
 */
export default function BatchStudentShareModal({ open, onClose, shareUrl }) {
  const baseUrl = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
  const url = addUtmToShareUrl(baseUrl);
  const whatsappText = encodeURIComponent(`${SHARE_MESSAGE}\n\n${url}`);
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleCopyLink = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).catch(() => {});
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-student-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <FaTimes className="text-lg" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-2xl" aria-hidden>👋</span>
          </div>
          <h2 id="batch-student-modal-title" className="text-xl font-bold text-gray-900 mb-2">
            For Your Friends
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            This challenge is not for 10000Coders students. Please share this form with your friends so they can register and participate!
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20BD5A] transition-colors"
          >
            <FaWhatsapp className="text-xl" />
            Share on WhatsApp
          </a>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 text-gray-700 text-sm truncate" title={url}>
              <FaLink className="shrink-0 text-gray-400" />
              <span className="truncate">{url}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 px-4 py-2.5 bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              Copy link
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Share the link above with friends who are not 10000Coders students.
        </p>
      </div>
    </div>
  );
}
