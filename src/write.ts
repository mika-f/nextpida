import fs from "fs";
import path from "path";

type WriteArgs = {
  content: string;
  path: string;
};

const write = (args: WriteArgs) => {
  const dist = path.join(args.path, "$apis.ts");

  if (fs.existsSync(dist)) {
    const cache = fs.readFileSync(dist, "utf8");
    if (cache.trim() === args.content.trim()) {
      return;
    }
  }

  fs.writeFileSync(dist, args.content.trim(), "utf-8");
  console.log(`${dist} was build successfully`);
};

export { write };
