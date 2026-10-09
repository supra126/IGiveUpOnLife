/** 品牌標誌（小GG），使用 currentColor 以適應深淺色主題 */
export function BrandMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M18,3c-6.63,0-12,5.37-12,12v18l4.5-4.5,3.75,3.75,3.75-3.75,3.75,3.75,3.75-3.75,4.5,4.5V15c0-6.63-5.37-12-12-12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.62"
      />
      <path
        d="M12,19.81s2.25,3,6,3,6-3,6-3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.62"
      />
      <circle cx="13.07" cy="12.97" r="1.95" fill="currentColor" />
      <circle cx="22.93" cy="12.97" r="1.95" fill="currentColor" />
    </svg>
  );
}
