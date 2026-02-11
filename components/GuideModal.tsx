"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepItem {
  label: string;
  desc: string;
}

interface StepSection {
  title: string;
  items: string[];
}

interface GuideV2Messages {
  step1: {
    title: string;
    desc: string;
    items: StepItem[];
    tip: string;
  };
  step2: {
    title: string;
    desc: string;
    descHighlight: string;
    descSuffix: string;
    items: string[];
    tip: string;
  };
  step3: {
    title: string;
    desc: string;
    items: StepItem[];
    tip: string;
  };
  step4: {
    title: string;
    desc: string;
    items: StepItem[];
  };
  step5: {
    title: string;
    desc: string;
    items: string[];
  };
  step6: {
    title: string;
    desc: string;
    sections: StepSection[];
  };
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const { t, locale, messages } = useLocale();

  if (!isOpen) return null;

  // Access guideV2 from messages with runtime validation
  const guideV2 = messages.guideV2 as GuideV2Messages | undefined;

  // Validate guideV2 structure exists
  if (!guideV2?.step1?.title || !guideV2?.step2?.title) {
    console.error("Missing guideV2 data in locale messages");
    return null;
  }

  const separator = locale === "zh" ? "\uFF1A" : ": ";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative glass-panel rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20 animate-modal-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold serif text-white mb-8">{t("guideModal.title")}</h2>

          {/* API Key Notice */}
          <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">&#x1F511;</span>
              <div>
                <p className="text-blue-300 font-semibold mb-1">{t("guideModal.apiKeyNotice")}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("guideModal.apiKeyDesc")}{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {t("guideModal.apiKeyLink")}
                  </a>{" "}
                  {t("guideModal.apiKeyDesc2")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step1.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{guideV2.step1.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {guideV2.step1.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {separator}{item.desc}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-500 text-xs mt-3">{guideV2.step1.tip}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step2.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  {guideV2.step2.desc}{" "}
                  <strong className="text-white">{guideV2.step2.descHighlight}</strong>
                  {guideV2.step2.descSuffix}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {guideV2.step2.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">{guideV2.step2.tip}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step3.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">{guideV2.step3.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {guideV2.step3.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {separator}{item.desc}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {guideV2.step3.tip}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step4.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{guideV2.step4.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {guideV2.step4.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {separator}{item.desc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                5
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step5.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{guideV2.step5.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {guideV2.step5.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-lg border border-[var(--accent-primary)]/30">
                6
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{guideV2.step6.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">{guideV2.step6.desc}</p>

                <div className="space-y-3">
                  {guideV2.step6.sections.map((section, idx) => (
                    <div key={idx}>
                      <p className="text-white text-sm font-semibold mb-1.5">{section.title}</p>
                      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
