import fs from "fs";
import path from "path";

import normalize from "normalize-path";

import { __require__ } from "./require.js";

type Configuration = {
  input: string;
  rootDir: string;
  output: string;
  ignorePath?: string;
  basePath?: string;
  tsconfig?: string;
};

const getConfigValues = async (
  args: Partial<Pick<Configuration, "rootDir" | "output" | "ignorePath">>
): Promise<Configuration> => {
  const rootDir = normalize(path.resolve(args.rootDir ?? process.cwd()));

  const config = await __require__("next/dist/server/config").default(
    __require__("next/constants").PHASE_PRODUCTION_BUILD,
    rootDir
  );

  const output = normalize(
    args.output ? args.output : path.join(rootDir, "lib")
  );

  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  const input = normalize(path.join(rootDir, "pages", "api"));
  const ignorePath = args.ignorePath
    ? normalize(path.join(rootDir, args.ignorePath))
    : undefined;

  return {
    input,
    rootDir,
    output,
    ignorePath,
    basePath: config.basePath,
    tsconfig: config.typescript?.tsconfigPath,
  };
};

export { getConfigValues };

export type { Configuration };
