
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dibhlslwjfwsbrvqaxwu.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devServer: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1755843583601.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev',
    ],
  }
};

export default nextConfig;
