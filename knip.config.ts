import type { KnipConfig } from "knip";

/**
 * Knip configuration.
 * @see https://knip.dev/reference/configuration
 */
const knipConfig: KnipConfig = {
  entry: ["src/index.ts", "src/ics.ts"],
  project: ["src/**/*.ts"],
  ignore: ["build/**", "dist/**"],
  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },
};

export default knipConfig;
