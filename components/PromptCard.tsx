"use client";

import React, { useState, useEffect, useRef } from 'react';
import { generateMarketingImage, fileToBase64 } from '@/services/geminiService';
import { Spinner } from './Spinner';
import { PromptData } from '@/types';

interface PromptCardProps {
  data: PromptData;
  index: number;
  apiKey: string;
}

export const PromptCard: React.FC<PromptCardProps> = ({ data, index, apiKey }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable Prompt State
  const [promptText, setPromptText] = useState(data.prompt_en);
  
  // Reference Image State
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when data prop changes (new route selected)
  useEffect(() => {
    setPromptText(data.prompt_en);
    setGeneratedImage(null);
    setRefImage(null);
    setError(null);
    setIsEditing(false);
  }, [data]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Pass the current (potentially edited) prompt and the optional reference image
      const imageUrl = await generateMarketingImage(promptText, apiKey, refImage || undefined);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      setError(err.message || "圖片生成失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setRefImage(base64);
      } catch (err) {
        console.error("Failed to load image", err);
        setError("讀取參考圖片失敗");
      }
    }
  };

  const clearRefImage = () => {
    setRefImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-[#15151a] rounded-xl border border-blue-500/10 overflow-hidden flex flex-col h-full group hover:border-blue-500/30 transition-colors duration-300 shadow-lg shadow-blue-900/10">
      {/* Result Area */}
      <div className="aspect-[3/4] bg-black relative flex items-center justify-center overflow-hidden border-b border-blue-500/10">
        {generatedImage ? (
            <div className="relative w-full h-full group/img">
                <img src={generatedImage} alt="已生成圖片" className="w-full h-full object-cover animate-in fade-in duration-700" />
                <a
                    href={generatedImage}
                    download={`海報-版本-${index + 1}.png`}
                    className="absolute top-2 right-2 bg-blue-600/80 hover:bg-blue-500 text-white p-2 rounded-full backdrop-blur-sm transition opacity-0 group-hover/img:opacity-100"
                    title="下載圖片"
                >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
            </div>
        ) : (
          <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center">
            {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-blue-300 animate-pulse">AI 正在繪製中...</span>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-16 h-16 text-blue-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-xs uppercase tracking-widest text-blue-500/40">等待生成</span>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1 space-y-4">
        
        {/* Summary Section (New) */}
        <div>
            <div className="flex justify-between items-center mb-1">
                 <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">設計摘要</span>
                 <span className="text-[10px] text-gray-600">版本 {index + 1}</span>
            </div>
            <p className="text-sm text-gray-200 font-medium leading-relaxed">
                {data.summary_zh || "暫無摘要"}
            </p>
        </div>

        {/* Reference Image Section */}
        <div className="bg-[#1e1e24] rounded-lg p-3 border border-blue-500/10">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-blue-400 flex items-center gap-1 font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    參考圖片（選填）
                </span>
                {refImage && (
                    <button onClick={clearRefImage} className="text-[10px] text-red-400 hover:text-red-300 underline">移除</button>
                )}
             </div>

             {refImage ? (
                 <div className="relative h-20 w-full bg-black/40 rounded overflow-hidden flex items-center justify-center group/ref border border-blue-500/20">
                     <img src={refImage} alt="參考圖片" className="h-full object-contain" />
                 </div>
             ) : (
                 <div className="flex items-center justify-center">
                    <label className="w-full cursor-pointer flex items-center justify-center gap-2 py-2 border border-dashed border-blue-500/30 rounded hover:bg-blue-500/5 transition-colors">
                        <span className="text-xs text-gray-500">+ 上傳（例如：指定顏色/Logo）</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleRefImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </label>
                 </div>
             )}
        </div>

        {/* Editable Prompt Section */}
        <div>
            <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-2 w-full justify-between font-medium"
            >
                <span>提示詞（Prompt）</span>
                <span className="flex items-center gap-1">
                    {isEditing ? '收起' : '編輯'}
                    <svg className={`w-3 h-3 transition-transform ${isEditing ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </span>
            </button>

            {isEditing ? (
                <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="w-full h-32 bg-black/40 text-xs text-gray-300 p-3 rounded border border-blue-500/30 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="編輯提示詞..."
                />
            ) : (
                <div
                    className="w-full h-20 bg-black/20 text-xs text-gray-500 p-3 rounded border border-blue-500/10 overflow-y-auto cursor-pointer hover:border-blue-500/30 transition-colors"
                    onClick={() => setIsEditing(true)}
                    title="點擊編輯"
                >
                    {promptText}
                </div>
            )}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2">
            {error && <div className="text-red-400 text-xs mb-2 text-center">{error}</div>}
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold text-sm rounded-lg transition-all transform active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
                {isLoading ? '生成中...' : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        {generatedImage ? '重新生成' : '生成視覺圖'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
