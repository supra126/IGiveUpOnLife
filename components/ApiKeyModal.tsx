"use client";

import React, { useState, useEffect } from 'react';
import { saveApiKey, getApiKey, clearApiKey } from '@/lib/api-key-storage';
import { useLocale } from '@/contexts/LocaleContext';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  serverHasKey?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, serverHasKey = false }) => {
  const { t } = useLocale();
  const [key, setKey] = useState('');

  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) {
      setKey(savedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      saveApiKey(key.trim());
      onSave(key.trim());
      onClose();
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setKey('');
    onSave('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-overlay-in" onClick={onClose} />
      <div className="relative glass-panel rounded-2xl p-8 max-w-md w-full shadow-2xl animate-modal-in">
        <h3 className="text-xl font-bold text-white mb-4 serif">{t("apiKeyModal.title")}</h3>

        {/* Server has key: Show free mode info */}
        {serverHasKey && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-300 font-bold text-sm">{t("apiKeyModal.freeMode")}</span>
            </div>
            <p className="text-green-300/70 text-xs">
              {t("apiKeyModal.freeModeDesc")}
              <br />
              {t("apiKeyModal.freeModeDesc2")}
            </p>
          </div>
        )}

        <p className="text-gray-400 text-sm mb-6">
          {serverHasKey ? (
            <>
              {t("apiKeyModal.enterKeyOptional")}
              <br />
              <span className="text-xs text-gray-500">{t("apiKeyModal.enterKeyOptionalDesc")}</span>
            </>
          ) : (
            <>
              {t("apiKeyModal.enterKeyRequired")}
              <br />
              <span className="text-xs text-gray-500">{t("apiKeyModal.enterKeyRequiredDesc")}</span>
            </>
          )}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
              {t("apiKeyModal.labelOptional")} {serverHasKey && <span className="text-gray-600 normal-case">({t("common.optional")})</span>}
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="input-field font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
            >
              {serverHasKey ? t("common.close") : t("common.cancel")}
            </button>
            {key.trim() && (
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 transition-opacity text-sm"
              >
                {t("apiKeyModal.saveButton")}
              </button>
            )}
            {getApiKey() && (
              <button
                onClick={handleClearKey}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors text-sm"
              >
                {t("apiKeyModal.clearKey")}
              </button>
            )}
          </div>

          <div className="text-center pt-2">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent-primary)] hover:opacity-80 underline transition-opacity">
                 {t("apiKeyModal.getApiKey")}
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};
