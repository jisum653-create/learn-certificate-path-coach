/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // googleapis 모듈 미설치 상태에서 해당 import를 사용하는 route가
    // 빌드를 막는 것을 방지 — 실제 사용은 런타임 조건부
    config.resolve.ignore = config.resolve.ignore || []
    config.resolve.ignore.push(/googleapis/)
    return config
  },
}

module.exports = nextConfig
