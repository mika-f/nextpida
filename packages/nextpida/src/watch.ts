import chokidar from "chokidar";

import type { Stats } from "fs";

type WatchArgs = {
  input: string;
  callback: (e: "add" | "change" | "del", path: string, stats?: Stats) => void;
};

const watch = (args: WatchArgs) => {
  const watcher = chokidar.watch(args.input, { ignoreInitial: true });
  watcher.on("all", (e, path, stats) => {
    if (e === "addDir") {
      return;
    }

    const event = e === "add" ? "add" : e === "change" ? "change" : "del";
    args.callback(event, path, stats);
  });
};

export { watch };
