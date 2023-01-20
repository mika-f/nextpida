import camelcase from "uppercamelcase";

const getTypeName = (path: string, prefix?: string, suffix?: string) => {
  const content = path
    .split("/")
    .map((w) => {
      if (w.startsWith("[[...") && w.endsWith("]]")) {
        return w.substring("[[...".length, w.lastIndexOf("]]"));
      }

      if (w.startsWith("[...") && w.endsWith("]")) {
        return w.substring("[...".length, w.lastIndexOf("]"));
      }

      if (w.startsWith("[") && w.endsWith("]")) {
        return w.substring("[".length, w.lastIndexOf("]"));
      }

      return w;
    })
    .map((w) => camelcase(w))
    .join("");

  return `${camelcase(prefix ?? "")}${content}${camelcase(suffix ?? "")}`;
};

export { getTypeName };
