import path from "path";

import normalize from "normalize-path";
import ts from "typescript";

// https://nextjs.org/docs/api-routes/dynamic-api-routes
const ROUTE_REGEXES = {
  DYNAMIC_ROUTE: /^\[(?<arg>\w+)\]$/, // dynamic api routes
  CATCH_ALL_ROUTE: /^\[\.\.\.(?<arg>\w+)\]$/, // catch all api routes
  OPTIONAL_CATCH_ALL_ROUTE: /^\[\[\.\.\.(?<arg>\w+)\]\]$/, // optional catch all api routes
};

type ExtractArgs = {
  program: ts.Program;
  root: string;
  route: string;
};

type RouteArg = {
  name: string;
  type: { name: string; isArray: boolean; isOptional: boolean };
};

type Route = {
  path: string;
  query: RouteArg[];
};

const getRoutePath = (args: ExtractArgs): string => {
  const r = path.parse(path.relative(args.root, args.route));
  if (r.name === "index") {
    return normalize(r.dir);
  }

  return normalize(path.join(r.dir, r.name));
};

const getRouteArgWithType = (segment: string): RouteArg | undefined => {
  const match = ROUTE_REGEXES.DYNAMIC_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return {
      name,
      type: { name, isArray: false, isOptional: false },
    };
  }

  return undefined;
};

const getRouteArgWithArrayType = (segment: string): RouteArg | undefined => {
  const match = ROUTE_REGEXES.CATCH_ALL_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return {
      name,
      type: { name, isArray: true, isOptional: false },
    };
  }

  return undefined;
};

const getRouteArgWithOptionalArrayType = (
  segment: string
): RouteArg | undefined => {
  const match = ROUTE_REGEXES.OPTIONAL_CATCH_ALL_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return {
      name,
      type: { name, isArray: true, isOptional: true },
    };
  }

  return undefined;
};

const getRouteArg = (segment: string): RouteArg | undefined => {
  return (
    getRouteArgWithType(segment) ||
    getRouteArgWithArrayType(segment) ||
    getRouteArgWithOptionalArrayType(segment)
  );
};

const extract = (args: ExtractArgs): Route => {
  const route = getRoutePath(args);
  const segments = route.split("/");
  const query: RouteArg[] = [];

  for (const segment of segments) {
    const arg = getRouteArg(segment);
    if (arg) {
      query.push(arg);
    }
  }

  return {
    path: `api/${route}`,
    query,
  };
};

export { extract };

export type { Route };
