import type { Configuration } from "../config";
import type { Program } from "typescript";

type FindProgramArgs = {
  program: Program;
  config: Configuration;
};

const findPrograms = (args: FindProgramArgs) => {
  const programs = args.program
    .getRootFileNames()
    .filter((w) => w.match(args.config.input));

  return programs;
};

export { findPrograms };
