import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb', // 增加 body size limit 以支援大圖片上傳
    },
  },
};

export default nextConfig;
