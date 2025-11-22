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
                  上傳與資訊輸入｜你只要給點線索就好
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  上傳產品圖後，若你心情好，可以順便填這些：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  <li>
                    <strong className="text-white">產品名稱</strong>：讓 AI
                    至少認得你家孩子叫什麼。
                  </li>
                  <li>
                    <strong className="text-white">產品資訊</strong>
                    ：品牌故事、核心價值、特色…不過你懶得寫也沒關係，我懂。
                  </li>
                  <li>
                    <strong className="text-white">產品網址</strong>
                    ：貼上就好，AI 自己會去爬（比你勤勞多了）。
                  </li>
                </ul>
                <p className="text-gray-500 text-xs mt-3">
                  💡 小提示：網址＋手動輸入＝AI
                  會自己拼湊出一篇博士論文般的品牌解讀。你不用努力。
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
                  Phase 1：策略制定｜AI 總監開始賣弄專業
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  AI 總監會甩出{" "}
                  <strong className="text-white">三條視覺路線</strong>，
                  讓你一次看到 3 張概念海報。
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  你只要做一件事： 👉{" "}
                  <strong className="text-white">選一個你喜歡的</strong>
                  剩下風格走向交給 AI 大人繼續忙。
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
                  Phase 2：全套內容企劃｜8 張圖直接幫你排好劇本
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  你給它：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  <li>參考文案（可以沒有）</li>
                  <li>競品資訊（想不到也沒差）</li>
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  然後 AI 就會規劃一套{" "}
                  <strong className="text-white">8 張完整素材包</strong>：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                  <li>
                    <strong className="text-white">2 張方形主圖</strong>
                    （白底乾淨去背＋情境氛圍大片，兩種一次滿足）
                  </li>
                  <li>
                    <strong className="text-white">6 張 Stories 長圖</strong>
                    包含：封面 → 痛點 → 解法 → 細節 → 背書 → CTA
                    一整套比你店長還懂銷售流程。
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 text-yellow-400 flex items-center justify-center font-bold text-lg border border-yellow-600/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  審閱與製作｜你選、你改、然後 AI 生圖
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  這階段像是在當「懶人監製」：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 ml-1">
                  <li>
                    <strong className="text-white">腳本審閱模式</strong>
                    AI 已經把 8 張文案＋Prompt 排好，
                    你想改哪句就改哪句，反正它不會生氣。
                  </li>
                  <li>
                    <strong className="text-white">圖片製作模式</strong>
                    一張一張生成圖片。 你還能{" "}
                    <strong className="text-white">針對單張上傳參考圖</strong>
                    （例如 CTA 放特定 Logo） AI 會乖乖照做。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
