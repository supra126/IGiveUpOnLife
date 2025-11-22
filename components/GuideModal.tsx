import React from "react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20 animate-in fade-in zoom-in duration-300">
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
          <h2 className="text-3xl font-bold serif text-white mb-8">使用方式</h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-600/30">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  上傳與資訊輸入｜一次填完所有資訊
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  上傳產品圖後，可以選填以下資訊（填越多，AI 越懂你）：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  <li>
                    <strong className="text-white">產品名稱</strong>：讓 AI 認得你的產品
                  </li>
                  <li>
                    <strong className="text-white">產品資訊</strong>
                    ：品牌故事、核心價值、產品特色
                  </li>
                  <li>
                    <strong className="text-white">產品網址</strong>
                    ：AI 會自動抓取官網內容進行分析
                  </li>
                  <li>
                    <strong className="text-white">參考文案 / 競品參考</strong>
                    ：貼上同類商品的熱銷文案，AI 會拆解其說服邏輯
                  </li>
                </ul>
                <p className="text-gray-500 text-xs mt-3">
                  💡 小提示：所有資訊一次填完，就不用在流程中重複輸入了
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-600/30">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Phase 1：策略選擇｜秒速決定視覺方向
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  AI 會分析產品後，立即提供{" "}
                  <strong className="text-white">三條截然不同的視覺策略</strong>
                  ，每條路線包含：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  <li>主打標語與副標題</li>
                  <li>視覺風格描述（色調、氛圍、設計元素）</li>
                  <li>目標受眾定位</li>
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  👉 <strong className="text-white">點選一個你喜歡的路線</strong>
                  ，系統會自動進入 Phase 2 開始規劃完整內容
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-lg border border-pink-600/30">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Phase 2：全套內容企劃｜自動生成 8 張圖腳本
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  選擇策略路線後，AI 會<strong className="text-white">自動規劃</strong>一套{" "}
                  <strong className="text-white">8 張完整素材包</strong>：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  <li>
                    <strong className="text-white">2 張方形主圖 (1:1)</strong>
                    ：白底商品圖 + 情境氛圍大片
                  </li>
                  <li>
                    <strong className="text-white">6 張 Stories 長圖 (9:16)</strong>
                    ：封面 → 痛點 → 解法 → 細節 → 背書 → CTA（完整銷售漏斗）
                  </li>
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  整套文案、視覺 Prompt、構圖說明，全部自動規劃完成
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 text-yellow-400 flex items-center justify-center font-bold text-lg border border-yellow-600/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  審閱與製作｜兩種模式自由切換
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  腳本規劃完成後，可在兩種模式間切換：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 ml-1">
                  <li>
                    <strong className="text-white">1. 腳本審閱模式</strong>
                    ：檢視並編輯所有文案、Prompt、構圖說明
                  </li>
                  <li>
                    <strong className="text-white">2. 圖片製作模式</strong>
                    ：逐張生成圖片，支援針對單張上傳參考圖（例如指定 Logo 或顏色）
                  </li>
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed mt-3">
                  所有圖片都能一鍵下載，完成後可匯出完整策略報告
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
