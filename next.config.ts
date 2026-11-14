import type { NextConfig } from "next";

const config: NextConfig = {
  async headers() {
    return [{source: "/mcp/connect/:path*", headers: [{key: "Content-Security-Policy", value: "frame-ancestors 'none'"}]}];
  },
};
export default config;
