import ts from "typescript";

import type { Configuration } from "../config";

const createProgram = (args: Configuration) => {
  const tsconfig = ts.findConfigFile(
    args.rootDir,
    ts.sys.fileExists,
    args.tsconfig ?? "tsconfig.json"
  );

  if (!tsconfig) {
    throw new Error("failed to find tsconfig.json");
  }

  const values = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    ts.sys as any
  );

  if (!values || values.errors.length) {
    throw new Error("failed to parse tsconfig.json");
  }

  return ts.createProgram({
    rootNames: values.fileNames,
    options: values.options,
  });
};

export { createProgram };
