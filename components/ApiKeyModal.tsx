"use client";

import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [key, setKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setKey(savedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      onSave(key.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e24] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
        <h3 className="text-xl font-bold text-white mb-4 serif">API Key 設定</h3>
        <p className="text-gray-400 text-sm mb-6">
          請輸入您的 Google Gemini API Key 以啟用 AI 功能。
          <br />
          <span className="text-xs text-gray-500">您的 Key 僅會儲存在瀏覽器中，不會傳送至伺服器。</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gemini API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              儲存設定
            </button>
          </div>
          
          <div className="text-center pt-2">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                 取得 API Key
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};
