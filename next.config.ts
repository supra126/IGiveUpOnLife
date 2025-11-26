import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 增加 body size limit 以支援圖片上傳
    },
  },
};

export default nextConfig;
