"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#0a0a0f]">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#15151a] border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">應用程式錯誤</h2>
            <p className="text-gray-400 mb-6 text-sm">
              抱歉，發生了嚴重的錯誤。請重新整理頁面或稍後再試。
            </p>

            {error.digest && (
              <p className="text-xs text-gray-600 mb-4 font-mono">
                錯誤代碼: {error.digest}
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                重試
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
