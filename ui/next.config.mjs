import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  allowedDevOrigins: ["192.168.1.215", "pc"],
  images: {
    unoptimized: true,
  },
}

const configForPhase = (phase) => {
  if (phase === PHASE_DEVELOPMENT_SERVER && process.env.OMSCS_BROWSER_TEST === "1") {
    return {
      ...nextConfig,
      distDir: ".next-browser-tests",
      typescript: { tsconfigPath: ".tsconfig-browser-tests.json" },
      webpack(config) {
        config.resolve.alias["@clerk/react"] = fileURLToPath(new URL("./tests/fixtures/clerk-react.tsx", import.meta.url));
        config.resolve.alias["./historical-courses.json$"] = fileURLToPath(new URL("./tests/fixtures/historical-courses.json", import.meta.url));
        return config;
      },
    };
  }
  return nextConfig;
};

export default configForPhase;
