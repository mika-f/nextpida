import minimist from "minimist";

import { build } from "./build";
import { getConfigValues } from "./config";
import { __require__ } from "./require";
import { watch } from "./watch";
import { write } from "./write";

const run = async (args: string[]) => {
  const argv = minimist(args, {
    string: ["input", "output", "ignorePath"],
    boolean: ["version", "watch"],
    alias: { v: "version", w: "watch", o: "output", p: "ignorePath" },
  });

  if (argv.version) {
    const pkg = __require__("../package.json");
    console.log(`v${pkg.version}`);
    return;
  }

  const config = await getConfigValues({
    rootDir: argv.input,
    output: argv.output,
    ignorePath: argv.ignorePath,
  });

  const publish = () => {
    write({ path: config.output, content: build(config) });
  };

  if (argv.watch) {
    // TODO: use https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Compiler-API.md#writing-an-incremental-program-watcher
    publish();
    watch({
      input: config.input,
      callback: () => publish(),
    });

    return;
  }

  publish();
  return;
};

export { run };
