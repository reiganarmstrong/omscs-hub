/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  allowedDevOrigins: ["192.168.1.215", "pc"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
