
import React, { useState, useRef, useEffect } from 'react';
import { ContentPlan, ContentSet, ImageRatio, ArrangementStyle } from '../types';
import { generateMarketingImage, generateImageFromReference, fileToBase64, regenerateVisualPrompt } from '../services/geminiService';
import { Spinner } from './Spinner';

// 排列方式選項
const ARRANGEMENT_OPTIONS: { value: ArrangementStyle; label: string; description: string }[] = [
  { value: 'single', label: '單品特寫', description: '單一產品置中展示' },
  { value: 'fan', label: '扇形展開', description: '多產品呈扇形排列' },
  { value: 'grid', label: '整齊並排', description: '產品整齊排列成行' },
  { value: 'stack', label: '自然堆疊', description: '產品自然層疊擺放' },
  { value: 'custom', label: '自訂', description: '使用構圖摘要描述' },
];

// 根據排列方式生成商業攝影的構圖摘要 placeholder
const getCommercialPlaceholder = (arrangement: ArrangementStyle): string => {
  const base = "乾淨的純色背景，色號#f6f6f6，專業商品攝影構圖，強調產品細節，無雜亂元素";
  switch (arrangement) {
    case 'single':
      return `${base}，單一產品置中展示，讓產品成為絕對焦點`;
    case 'fan':
      return `${base}，多片產品呈扇形展開排列，展現產品系列感`;
    case 'grid':
      return `${base}，產品整齊並排展示，呈現規律美感`;
    case 'stack':
      return `${base}，產品自然層疊堆放，展現豐富感`;
    case 'custom':
      return "請自由描述您想要的構圖方式、背景色、排列方式等...";
    default:
      return base;
  }
};

// 根據排列方式生成英文 prompt 片段
export const getArrangementPrompt = (arrangement: ArrangementStyle): string => {
  switch (arrangement) {
    case 'single':
      return "single product centered, hero shot composition";
    case 'fan':
      return "multiple products arranged in elegant fan spread pattern, radiating outward";
    case 'grid':
      return "products neatly arranged in organized grid or row, symmetrical layout";
    case 'stack':
      return "products naturally stacked or layered, casual elegant arrangement";
    case 'custom':
      return ""; // 自訂模式不加入預設排列
    default:
      return "single product centered";
  }
};

interface ContentSuiteProps {
  plan: ContentPlan;
  onContentUpdate: (updatedSets: ContentSet[]) => void;
  apiKey: string;
  productImage: File | null;
  secondaryProduct: File | null;
  brandLogo: File | null;
  onProductImageChange: (file: File | null) => void;
  onSecondaryProductChange: (file: File | null) => void;
  onBrandLogoChange: (file: File | null) => void;
}

// --- SUB-COMPONENT: Script Editor Row with Regenerate Prompt Button ---
const ScriptEditorRow: React.FC<{
  contentSet: ContentSet;
  onChange: (id: string, field: keyof ContentSet, value: string | ArrangementStyle) => void;
  onRegeneratePrompt: (id: string) => void;
  isRegenerating: boolean;
}> = ({ contentSet, onChange, onRegeneratePrompt, isRegenerating }) => {
  const getRatioColor = (ratio: ImageRatio) => {
    switch(ratio) {
      case '1:1': return 'bg-blue-500/20 text-blue-300';
      case '9:16': return 'bg-purple-500/20 text-purple-300';
      case '4:5': return 'bg-pink-500/20 text-pink-300';
      case '16:9': return 'bg-green-500/20 text-green-300';
      case '1:1-commercial': return 'bg-amber-500/20 text-amber-300';
    }
  };

  return (
    <div className="bg-[#1e1e24] border border-white/5 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${getRatioColor(contentSet.ratio)}`}>
            {contentSet.size_label} - 方案 {contentSet.set_number}
          </span>
          <span className="text-xs text-gray-500">{contentSet.ratio}</span>
        </div>
        <button
          onClick={() => onRegeneratePrompt(contentSet.id)}
          disabled={isRegenerating}
          className="text-xs px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white font-bold rounded-full transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="根據當前標題和內文重新生成視覺提示詞"
        >
          {isRegenerating ? (
            <>
              <Spinner className="w-3 h-3" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>重新生成 Prompt</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Text Content */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">標題 (Title)</label>
            <textarea
              value={contentSet.title_zh}
              onChange={(e) => onChange(contentSet.id, 'title_zh', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none h-16"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">內文 (Copy)</label>
            <textarea
              value={contentSet.copy_zh}
              onChange={(e) => onChange(contentSet.id, 'copy_zh', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none h-24"
            />
          </div>
          {/* 商業攝影專用：排列方式選擇 */}
          {contentSet.ratio === '1:1-commercial' && (
            <div>
              <label className="block text-xs text-amber-400 mb-1">排列方式</label>
              <div className="grid grid-cols-5 gap-1">
                {ARRANGEMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(contentSet.id, 'arrangement_style', option.value)}
                    className={`px-2 py-1.5 text-[10px] rounded transition-all ${
                      (contentSet.arrangement_style || 'single') === option.value
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-black/30 text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {ARRANGEMENT_OPTIONS.find(o => o.value === (contentSet.arrangement_style || 'single'))?.description}
              </p>
            </div>
          )}

          {/* 構圖摘要 - 可編輯 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              構圖摘要 (Visual Summary)
              {contentSet.ratio === '1:1-commercial' && (
                <span className="ml-2 text-amber-400 text-[10px]">商業攝影模式</span>
              )}
            </label>
            <textarea
              value={contentSet.visual_summary_zh}
              onChange={(e) => onChange(contentSet.id, 'visual_summary_zh', e.target.value)}
              placeholder={contentSet.ratio === '1:1-commercial'
                ? getCommercialPlaceholder(contentSet.arrangement_style || 'single')
                : "描述畫面構圖、背景、光線、氛圍等視覺元素..."}
              className={`w-full bg-black/30 border rounded px-3 py-2 text-sm focus:outline-none resize-none h-20 ${
                contentSet.ratio === '1:1-commercial'
                  ? 'border-amber-500/30 text-amber-200 focus:border-amber-500 placeholder:text-amber-500/50'
                  : 'border-white/10 text-gray-300 focus:border-blue-500 placeholder:text-gray-600'
              }`}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              {contentSet.ratio === '1:1-commercial'
                ? "排列方式、構圖摘要修改後，點擊「重新生成 Prompt」按鈕更新視覺提示詞"
                : "修改後點擊「重新生成 Prompt」按鈕更新視覺提示詞"}
            </p>
          </div>
        </div>

        {/* Visual Prompt */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">視覺提示詞 (Prompt) - AI 生成</label>
          <textarea
            value={contentSet.visual_prompt_en}
            onChange={(e) => onChange(contentSet.id, 'visual_prompt_en', e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-blue-500 focus:outline-none font-mono resize-none h-48"
          />
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: Production Card ---
const ProductionCard: React.FC<{
  contentSet: ContentSet;
  apiKey: string;
  productImage: string | null;
  secondaryProduct: string | null;
  brandLogo: string | null;
  onContentChange: (id: string, field: keyof ContentSet, value: string) => void;
}> = ({ contentSet, apiKey, productImage, secondaryProduct, brandLogo, onContentChange }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local showText state for this card
  const [showText, setShowText] = useState(false);

  // Font weight selection for title and copy
  const [titleWeight, setTitleWeight] = useState<'regular' | 'medium' | 'bold' | 'black'>('bold');
  const [copyWeight, setCopyWeight] = useState<'regular' | 'medium' | 'bold' | 'black'>('regular');

  // Generation mode: 'prompt' (提詞版) or 'reference' (參考版)
  const [generationMode, setGenerationMode] = useState<'prompt' | 'reference'>('prompt');

  // Reference image state (for reference mode)
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [similarityLevel, setSimilarityLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const handleGenerate = async () => {
    if (!productImage) {
      setError("請先上傳產品圖");
      return;
    }

    // Reference mode: need reference image
    if (generationMode === 'reference' && !referenceImage) {
      setError("請先上傳參考圖");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let result: string;

      if (generationMode === 'reference' && referenceImage) {
        // Reference-based generation (available for all ratios)
        // Map similarity level to numeric value
        const similarityValue =
          similarityLevel === 'low' ? 20 :
          similarityLevel === 'medium' ? 55 : 85;

        result = await generateImageFromReference(
          productImage,
          referenceImage,
          similarityValue,
          apiKey,
          contentSet.ratio,
          brandLogo,
          contentSet.title_zh,
          contentSet.copy_zh,
          showText,
          titleWeight,
          copyWeight,
          secondaryProduct
        );
      } else {
        // Standard AI prompt-based generation
        let enhancedPrompt = contentSet.visual_prompt_en;

        // Add logo placement instruction if logo is provided
        if (brandLogo) {
          enhancedPrompt += "\n\nIMPORTANT: Place the uploaded brand logo in one of the four corners (top-left, top-right, bottom-left, or bottom-right) in a subtle, non-intrusive way. The logo should be clearly visible but not dominate the composition.";
        }

        // Add text overlay instruction if enabled
        if (showText) {
          // Map font weight to Noto Sans TC weight names
          const weightMap = {
            'regular': 'Regular (400)',
            'medium': 'Medium (500)',
            'bold': 'Bold (700)',
            'black': 'Black (900)'
          };

          enhancedPrompt += `\n\nIMPORTANT: Overlay the following text on the image using Noto Sans TC (Noto Sans Traditional Chinese) font:\nTitle: "${contentSet.title_zh}" (Font: Noto Sans TC ${weightMap[titleWeight]})\nCopy: "${contentSet.copy_zh}" (Font: Noto Sans TC ${weightMap[copyWeight]})\nUse appropriate positioning, size, and styling that complements the visual design. Make sure the font is Noto Sans TC (思源黑體).`;
        }

        result = await generateMarketingImage(
          enhancedPrompt,
          apiKey,
          productImage,
          contentSet.ratio,
          secondaryProduct
        );
      }

      setImage(result);
    } catch (e: any) {
      setError(e.message || "生成失敗");
    } finally {
      setLoading(false);
    }
  };

  const getRatioClass = (ratio: ImageRatio) => {
    switch(ratio) {
      case '1:1': return 'aspect-square';
      case '1:1-commercial': return 'aspect-square';
      case '9:16': return 'aspect-[9/16]';
      case '4:5': return 'aspect-[4/5]';
      case '16:9': return 'aspect-[16/9]';
    }
  };

  const getRatioColor = (ratio: ImageRatio) => {
    switch(ratio) {
      case '1:1': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case '1:1-commercial': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case '9:16': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case '4:5': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case '16:9': return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-3 group relative">
        {/* Image Display Area */}
        <div className={`relative rounded-xl overflow-hidden bg-[#15151a] border border-white/10 shadow-lg w-full ${getRatioClass(contentSet.ratio)}`}>
            {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
                    <Spinner className="w-10 h-10 text-blue-500 mb-3" />
                    <p className="text-sm text-blue-300 font-medium">生成中...</p>
                    <p className="text-xs text-gray-400 mt-1">請稍候片刻</p>
                </div>
            ) : image ? (
                <div className="relative w-full h-full">
                    <img src={image} alt={contentSet.title_zh} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                         <a href={image} download={`${contentSet.id}.png`} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm pointer-events-auto" title="下載">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                         </a>
                         <button onClick={handleGenerate} disabled={loading} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed" title="重繪">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                         </button>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
                    {/* Product Image Background (Blurred) */}
                    {productImage && (
                        <div className="absolute inset-0 opacity-20">
                            <img src={productImage} className="w-full h-full object-cover blur-sm" alt="product-bg" />
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={!productImage}
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-gray-500 border border-white/10 relative z-10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
            )}
            <div className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm z-20 ${getRatioColor(contentSet.ratio)}`}>
                方案 {contentSet.set_number}
            </div>
        </div>

        {/* Controls Area */}
        <div className="space-y-2">
            {/* Show Text Toggle */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id={`showText-${contentSet.id}`}
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
                className="w-3 h-3 rounded border-gray-500 bg-black/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label htmlFor={`showText-${contentSet.id}`} className="text-[10px] text-gray-400 cursor-pointer select-none">
                顯示內容（標題 + 文案）
              </label>
            </div>

            {/* Editable Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-500">標題</label>
                <select
                  value={titleWeight}
                  onChange={(e) => setTitleWeight(e.target.value as any)}
                  className="text-[9px] px-1 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
                  <option value="black">Black</option>
                </select>
              </div>
              <input
                type="text"
                value={contentSet.title_zh}
                onChange={(e) => onContentChange(contentSet.id, 'title_zh', e.target.value)}
                className="w-full px-2 py-1 text-sm font-bold text-white bg-white/5 border border-white/10 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="輸入標題"
              />
            </div>

            {/* Editable Copy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-500">文案</label>
                <select
                  value={copyWeight}
                  onChange={(e) => setCopyWeight(e.target.value as any)}
                  className="text-[9px] px-1 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
                  <option value="black">Black</option>
                </select>
              </div>
              <textarea
                value={contentSet.copy_zh}
                onChange={(e) => onContentChange(contentSet.id, 'copy_zh', e.target.value)}
                className="w-full px-2 py-1 text-xs text-gray-300 bg-white/5 border border-white/10 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="輸入文案"
              />
            </div>

            {/* Generation Mode Toggle - Available for all ratios */}
            <div className="mt-3 space-y-3">
              {/* Mode Selection Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setGenerationMode('prompt')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    generationMode === 'prompt'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  提詞版
                </button>
                <button
                  onClick={() => setGenerationMode('reference')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    generationMode === 'reference'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  參考版
                </button>
              </div>

              {/* Reference Mode Settings */}
              {generationMode === 'reference' && (
                <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg space-y-3">
                  <div className="text-xs font-bold text-purple-300">參考圖設定</div>

                  {/* Reference Image Upload */}
                  <label className="block">
                    <div className="text-[10px] text-gray-400 mb-1">上傳參考圖</div>
                    <label className="flex items-center justify-center w-full h-20 border border-dashed border-purple-500/50 rounded cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all relative overflow-hidden">
                      {referenceImage ? (
                        <div className="w-full h-full relative group">
                          <img src={referenceImage} alt="Reference" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-[10px]">更換參考圖</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2">
                          <svg className="w-6 h-6 mb-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-[10px] text-purple-300">點擊上傳</p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const base64 = await fileToBase64(e.target.files[0]);
                            setReferenceImage(base64);
                          }
                        }}
                      />
                    </label>
                  </label>

                  {/* Similarity Level Selection */}
                  <div>
                    <label className="text-[10px] text-gray-400 mb-2 block">相似度</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSimilarityLevel('low')}
                        className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
                          similarityLevel === 'low'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        低相似度
                        <div className="text-[8px] opacity-70">創意發揮</div>
                      </button>
                      <button
                        onClick={() => setSimilarityLevel('medium')}
                        className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
                          similarityLevel === 'medium'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        中等相似度
                        <div className="text-[8px] opacity-70">適度參考</div>
                      </button>
                      <button
                        onClick={() => setSimilarityLevel('high')}
                        className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
                          similarityLevel === 'high'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        高相似度
                        <div className="text-[8px] opacity-70">完全模仿</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export const ContentSuite: React.FC<ContentSuiteProps> = ({
  plan,
  onContentUpdate,
  apiKey,
  productImage: productImageFile,
  secondaryProduct: secondaryProductFile,
  brandLogo: brandLogoFile,
  onProductImageChange,
  onSecondaryProductChange,
  onBrandLogoChange
}) => {
  const [mode, setMode] = useState<'review' | 'production'>('review');
  const [contentSets, setContentSets] = useState<ContentSet[]>(plan.content_sets);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Production mode states (converted from File props to base64)
  const [productImageBase64, setProductImageBase64] = useState<string | null>(null);
  const [secondaryProductBase64, setSecondaryProductBase64] = useState<string | null>(null);
  const [brandLogoBase64, setBrandLogoBase64] = useState<string | null>(null);

  // Convert File props to base64 when they change
  useEffect(() => {
    if (productImageFile) {
      fileToBase64(productImageFile).then(setProductImageBase64);
    } else {
      setProductImageBase64(null);
    }
  }, [productImageFile]);

  useEffect(() => {
    if (secondaryProductFile) {
      fileToBase64(secondaryProductFile).then(setSecondaryProductBase64);
    } else {
      setSecondaryProductBase64(null);
    }
  }, [secondaryProductFile]);

  useEffect(() => {
    if (brandLogoFile) {
      fileToBase64(brandLogoFile).then(setBrandLogoBase64);
    } else {
      setBrandLogoBase64(null);
    }
  }, [brandLogoFile]);

  // Sync with props if plan changes completely
  useEffect(() => {
    setContentSets(plan.content_sets);
    setMode('review');
  }, [plan]);

  const handleContentChange = (id: string, field: keyof ContentSet, value: string | ArrangementStyle) => {
    const newSets = contentSets.map(set =>
      set.id === id ? { ...set, [field]: value } : set
    );
    setContentSets(newSets);
    onContentUpdate(newSets);
  };

  const handleRegeneratePrompt = async (id: string) => {
    setRegeneratingId(id);

    const targetSet = contentSets.find(s => s.id === id);
    if (!targetSet) return;

    try {
      // 商業攝影模式：整合排列方式到構圖摘要
      let visualSummary = targetSet.visual_summary_zh;
      if (targetSet.ratio === '1:1-commercial') {
        const arrangement = targetSet.arrangement_style || 'single';
        const arrangementPrompt = getArrangementPrompt(arrangement);

        // 如果構圖摘要為空，使用排列方式的預設值
        if (!visualSummary?.trim()) {
          visualSummary = getCommercialPlaceholder(arrangement);
        }

        // 加入排列方式的英文描述（除非是自訂模式）
        // 將排列方式放在最前面，強調其優先級
        if (arrangementPrompt) {
          visualSummary = `【產品排列方式 - 最高優先級】${arrangementPrompt}。\n\n${visualSummary}`;
        }

        console.log('🎯 商業攝影 - 排列方式:', arrangement);
        console.log('📝 完整構圖摘要:', visualSummary);
      }

      const newPrompt = await regenerateVisualPrompt(
        targetSet.title_zh,
        targetSet.copy_zh,
        targetSet.ratio,
        targetSet.size_label,
        apiKey,
        visualSummary // 傳遞構圖摘要（包含排列方式）
      );

      handleContentChange(id, 'visual_prompt_en', newPrompt);
    } catch (e: any) {
      console.error('Failed to regenerate prompt:', e);
      alert(`重新生成 Prompt 失敗：${e.message || '未知錯誤'}`);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Group content sets by ratio
  const groupedSets = plan.selected_sizes.map(ratio => ({
    ratio,
    label: contentSets.find(s => s.ratio === ratio)?.size_label || ratio,
    sets: contentSets.filter(s => s.ratio === ratio)
  }));

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Upload Settings Section - Always Visible */}
        <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl">
          <h4 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            爆肝產圖設定
          </h4>
          <p className="text-sm text-gray-400 mb-6">
            上傳產品圖或品牌 Logo，讓 AI 生成圖片時使用（隨時可以調整）
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Product Image Upload */}
            <div className="relative">
              <label className="block text-sm font-bold text-indigo-200 mb-2">
                主產品圖片（選填）
              </label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-500/5 relative overflow-hidden border-indigo-500/30 bg-black/20">
                {productImageFile ? (
                  <div className="w-full h-full relative group">
                    <img
                      src={URL.createObjectURL(productImageFile)}
                      alt="Product"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm">更換圖片</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-8 h-8 mb-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-indigo-300">點擊上傳主產品</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onProductImageChange(e.target.files[0]);
                    }
                  }}
                  accept="image/*"
                />
              </label>
              {productImageFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProductImageChange(null);
                  }}
                  className="absolute top-8 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors z-10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Secondary Product Upload */}
            <div className="relative">
              <label className="block text-sm font-bold text-indigo-200 mb-2">
                副產品圖片（選填）
              </label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-pink-400 hover:bg-pink-500/5 relative overflow-hidden border-pink-500/30 bg-black/20">
                {secondaryProductFile ? (
                  <div className="w-full h-full relative group">
                    <img
                      src={URL.createObjectURL(secondaryProductFile)}
                      alt="Secondary Product"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm">更換圖片</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-8 h-8 mb-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-pink-300">點擊上傳副產品</p>
                    <p className="text-[10px] text-gray-500 mt-1">與主產品融合展示</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onSecondaryProductChange(e.target.files[0]);
                    }
                  }}
                  accept="image/*"
                />
              </label>
              {secondaryProductFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSecondaryProductChange(null);
                  }}
                  className="absolute top-8 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors z-10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Brand Logo Upload */}
            <div className="relative">
              <label className="block text-sm font-bold text-indigo-200 mb-2">
                品牌 Logo（選填）
              </label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-500/5 relative overflow-hidden border-indigo-500/30 bg-black/20">
                {brandLogoFile ? (
                  <div className="w-full h-full relative group">
                    <img
                      src={URL.createObjectURL(brandLogoFile)}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm">更換 Logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-8 h-8 mb-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <p className="text-xs text-indigo-300">點擊上傳品牌 Logo</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onBrandLogoChange(e.target.files[0]);
                    }
                  }}
                  accept="image/*"
                />
              </label>
              {brandLogoFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrandLogoChange(null);
                  }}
                  className="absolute top-8 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors z-10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header & Mode Switch */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-white/10 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-white serif mb-1">
                    {plan.plan_name}
                </h2>
                <p className="text-gray-400 text-sm">
                  {plan.selected_sizes.map(r => {
                    const count = contentSets.filter(s => s.ratio === r).length;
                    const label = contentSets.find(s => s.ratio === r)?.size_label || r;
                    return `${label} ${count}組`;
                  }).join(' | ')}
                </p>
            </div>

            <div className="bg-[#1a1a1f] p-1 rounded-lg flex items-center border border-white/10">
                <button
                    onClick={() => setMode('review')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'review' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    1. 內容來嘴看看
                </button>
                <button
                    onClick={() => setMode('production')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'production' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    2. 爆肝產圖去
                </button>
            </div>
        </div>

        {/* MODE: SCRIPT REVIEW */}
        {mode === 'review' && (
            <div className="space-y-8">
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6 flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <p className="text-blue-200 text-sm font-bold mb-1">內容來嘴看看</p>
                        <p className="text-blue-300/70 text-xs">
                          檢查看看小GG剛剛生了什麼內容，標題不對味？內文有點怪？沒關係，你想改就改。修改後記得點擊「重新生成 Prompt」按鈕。
                        </p>
                    </div>
                </div>

                {groupedSets.map(group => (
                  <div key={group.ratio}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className={`w-2 h-6 rounded-full ${
                        group.ratio === '1:1' ? 'bg-blue-500' :
                        group.ratio === '9:16' ? 'bg-purple-500' :
                        group.ratio === '4:5' ? 'bg-pink-500' :
                        group.ratio === '16:9' ? 'bg-green-500' :
                        group.ratio === '1:1-commercial-ai' ? 'bg-amber-500' :
                        'bg-orange-500'
                      }`}></span>
                      {group.label} ({group.ratio}) - {group.sets.length} 組方案
                    </h3>
                    {group.sets.map(set => (
                        <ScriptEditorRow
                          key={set.id}
                          contentSet={set}
                          onChange={handleContentChange}
                          onRegeneratePrompt={handleRegeneratePrompt}
                          isRegenerating={regeneratingId === set.id}
                        />
                    ))}
                  </div>
                ))}
            </div>
        )}

        {/* MODE: PRODUCTION */}
        {mode === 'production' && (
            <div>
                {/* Production Grid - Grouped by Size */}
                {groupedSets.map((group, idx) => (
                  <div key={group.ratio} className={idx > 0 ? 'mt-12' : ''}>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className={`w-2 h-6 rounded-full ${
                          group.ratio === '1:1' ? 'bg-blue-500' :
                          group.ratio === '9:16' ? 'bg-purple-500' :
                          group.ratio === '4:5' ? 'bg-pink-500' :
                          group.ratio === '16:9' ? 'bg-green-500' :
                          group.ratio === '1:1-commercial-ai' ? 'bg-amber-500' :
                          'bg-orange-500'
                        }`}></span>
                        {group.label} ({group.ratio})
                    </h3>
                    <div className={`grid gap-6 ${
                      group.ratio === '1:1' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' :
                      group.ratio === '1:1-commercial-ai' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' :
                      group.ratio === '1:1-reference' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' :
                      group.ratio === '9:16' ? 'grid-cols-1 sm:grid-cols-3 md:grid-cols-6' :
                      group.ratio === '4:5' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                      group.ratio === '16:9' ? 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2' :
                      'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                    }`}>
                        {group.sets.map(set => (
                            <ProductionCard
                              key={set.id}
                              contentSet={set}
                              apiKey={apiKey}
                              productImage={productImageBase64}
                              secondaryProduct={secondaryProductBase64}
                              brandLogo={brandLogoBase64}
                              onContentChange={handleContentChange}
                            />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
        )}
    </div>
  );
};
