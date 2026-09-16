/** @type {import('next').NextConfig} */

const path = require('path')

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['googleapis'] = path.resolve(__dirname, 'app/lib/googleapis-stub.js')
    return config
  },
};

module.exports = nextConfig
