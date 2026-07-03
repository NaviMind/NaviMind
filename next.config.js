/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  // mupdf + sharp are native/WASM server packages — don't bundle them, require at runtime.
  serverExternalPackages: ["mupdf", "sharp"],
  // Short public URLs for the legal pages. Google's OAuth brand review and Paddle's
  // domain review are configured with /terms and /privacy; map them to the real pages.
  async redirects() {
    return [
      { source: "/terms", destination: "/legal/terms", permanent: true },
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/refund", destination: "/legal/refund", permanent: true },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist optionally imports the native `canvas` module for Node.js;
    // we only use the browser renderer so alias it away to prevent build errors.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
