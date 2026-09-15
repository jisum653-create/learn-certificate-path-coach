/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config) => {
    // googleapis 미설치 상태에서 Google Calendar/Notion 연동 route 빌드 통과용 stub 매핑
    // (해당 기능은 다른 팀원 담당 — 현재는 빌드만 막고 있음)
    config.resolve.alias = {
      ...config.resolve.alias,
      'googleapis': path.resolve(__dirname, 'app/lib/googleapis-stub.js'),
    };
    return config;
  },
};

module.exports = nextConfig;
