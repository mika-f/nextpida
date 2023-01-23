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

type Route = {
  path: string;
  query: ts.PropertySignature[];
};

const getRoutePath = (args: ExtractArgs): string => {
  const r = path.parse(path.relative(args.root, args.route));
  if (r.name === "index") {
    return normalize(r.dir);
  }

  return normalize(path.join(r.dir, r.name));
};

const getRouteArgWithType = (
  segment: string
): ts.PropertySignature | undefined => {
  const match = ROUTE_REGEXES.DYNAMIC_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      ts.factory.createUnionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      ])
    );
  }

  return undefined;
};

const getRouteArgWithArrayType = (
  segment: string
): ts.PropertySignature | undefined => {
  const match = ROUTE_REGEXES.CATCH_ALL_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      ts.factory.createArrayTypeNode(
        ts.factory.createParenthesizedType(
          ts.factory.createUnionTypeNode([
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          ])
        )
      )
    );
  }

  return undefined;
};

const getRouteArgWithOptionalArrayType = (
  segment: string
): ts.PropertySignature | undefined => {
  const match = ROUTE_REGEXES.OPTIONAL_CATCH_ALL_ROUTE.exec(segment);

  if (match && match.groups) {
    const name = match.groups["arg"]!;
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(name),
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ts.factory.createArrayTypeNode(
        ts.factory.createParenthesizedType(
          ts.factory.createUnionTypeNode([
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          ])
        )
      )
    );
  }

  return undefined;
};

const getRouteArg = (segment: string): ts.PropertySignature | undefined => {
  return (
    getRouteArgWithType(segment) ||
    getRouteArgWithArrayType(segment) ||
    getRouteArgWithOptionalArrayType(segment)
  );
};

const extract = (args: ExtractArgs): Route => {
  const route = getRoutePath(args);
  const segments = route.split("/");
  const query: ts.PropertySignature[] = [];

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
