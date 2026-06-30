/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  // mupdf + sharp are native/WASM server packages — don't bundle them, require at runtime.
  serverExternalPackages: ["mupdf", "sharp"],
  webpack: (config) => {
    // pdfjs-dist optionally imports the native `canvas` module for Node.js;
    // we only use the browser renderer so alias it away to prevent build errors.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
