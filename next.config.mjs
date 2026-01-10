/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Fully static export
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true,
};

export default nextConfig;
