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
                  選擇圖片尺寸｜多平台支援
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  選擇策略路線後，系統會自動進入尺寸選擇畫面，勾選你需要的尺寸：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  <li>
                    <strong className="text-white">1:1 方形圖</strong>
                    ：適合 FB 貼文、IG 輪播、電商主圖
                  </li>
                  <li>
                    <strong className="text-white">9:16 直式長圖</strong>
                    ：適合限時動態、Instagram Stories、Reels
                  </li>
                  <li>
                    <strong className="text-white">4:5 直式圖</strong>
                    ：適合 IG Feed 主頁、優化手機瀏覽
                  </li>
                  <li>
                    <strong className="text-white">16:9 橫式長圖</strong>
                    ：適合封面、廣告圖片、橫幅設計
                  </li>
                  <li>
                    <strong className="text-white">1:1 商業攝影</strong>
                    ：專業商品攝影風格（工作室燈光、高端相機質感）
                  </li>
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  AI 會為<strong className="text-white">每個選定的尺寸生成 3 組不同的內容方案</strong>
                  （功能導向、情感導向、數據導向）
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center font-bold text-lg border border-green-600/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  上傳產品圖與 Logo｜產圖前置準備
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  在「爆肝產圖設定」區域，上傳以下素材（這些設定會在所有方案間共用）：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  <li>
                    <strong className="text-white">📸 產品圖片</strong>
                    ：必要，用於圖片生成的主要素材
                  </li>
                  <li>
                    <strong className="text-white">🏷️ 品牌 Logo</strong>
                    ：選填，會自動放置在圖片角落
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 text-yellow-400 flex items-center justify-center font-bold text-lg border border-yellow-600/30">
                5
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  腳本審閱模式｜內容來嘴看看
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  切換至「內容來嘴看看」模式，可以：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  <li>查看所有方案的標題、文案、視覺摘要</li>
                  <li>編輯任何不滿意的文案</li>
                  <li>調整 AI Prompt（進階功能）</li>
                  <li>為每個方案重新生成 Prompt</li>
                </ul>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-600/30">
                6
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  圖片製作模式｜爆肝產圖
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  切換至「爆肝產圖」模式，針對每個方案可以：
                </p>

                <div className="space-y-3">
                  <div>
                    <p className="text-white text-sm font-semibold mb-1.5">
                      ✅ 文字與字體控制
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                      <li>勾選「顯示內容（標題 + 文案）」決定是否在圖片上疊加文字</li>
                      <li>直接在產圖模式修改標題和文案</li>
                      <li>選擇字體粗細（標題和文案各有下拉選單）：
                        <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5">
                          <li>Regular - 正常粗細</li>
                          <li>Medium - 適中粗細</li>
                          <li>Bold - 粗體（標題預設）</li>
                          <li>Black - 特粗體</li>
                        </ul>
                      </li>
                      <li>所有文字使用開源字體<strong className="text-white">思源黑體（Noto Sans TC）</strong>，無版權問題</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-white text-sm font-semibold mb-1.5">
                      🎨 雙模式生成
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                      <li>
                        <strong className="text-white">提詞版</strong>（預設）
                        ：使用 AI 自動生成的視覺 Prompt 創作
                      </li>
                      <li>
                        <strong className="text-white">參考版</strong>
                        ：上傳參考圖片，選擇相似度（三個離散等級）：
                        <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5">
                          <li><strong className="text-white">低相似度</strong> - 創意發揮（僅參考色調與氛圍）</li>
                          <li><strong className="text-white">中等相似度</strong> - 適度參考（匹配光線與色彩，構圖可變）</li>
                          <li><strong className="text-white">高相似度</strong> - 完全模仿（匹配構圖、佈局、風格）</li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-white text-sm font-semibold mb-1.5">
                      📥 生成與下載
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                      <li>點擊播放按鈕開始生成（約 10-20 秒）</li>
                      <li>滑鼠移至圖片上方：
                        <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5">
                          <li>📥 下載按鈕 - 下載圖片</li>
                          <li>🔄 重繪按鈕 - 重新生成</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
