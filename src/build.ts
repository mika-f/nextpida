import ts from "typescript";
import camelcase from "uppercamelcase";

import { findPrograms } from "./typescript/finder";
import { extract as extractHandlers } from "./typescript/handler-extracter";
import { getTypeName } from "./typescript/naming";
import { createProgram } from "./typescript/program";
import { extract as extractRoute } from "./typescript/route-extracter";

import type { Configuration } from "./config";

const updatePropertySignature = (
  signature: ts.PropertySignature,
  queryTypes: ts.PropertySignature[]
): ts.PropertySignature => {
  if (signature.type!.kind === ts.SyntaxKind.UnknownKeyword) {
    return ts.factory.updatePropertySignature(
      signature,
      undefined,
      ts.factory.createIdentifier("query"),
      undefined,
      ts.factory.createTypeLiteralNode(queryTypes)
    );
  }

  const tl = signature.type as ts.TypeLiteralNode;
  const inject = ts.factory.updateTypeLiteralNode(
    tl,
    ts.factory.createNodeArray([...tl.members, ...queryTypes])
  );

  return ts.factory.updatePropertySignature(
    signature,
    undefined,
    ts.factory.createIdentifier("query"),
    undefined,
    inject
  );
};

const updateParamsTypeDeclaration = (
  t: ts.TypeLiteralNode,
  queryTypes: ts.PropertySignature[]
): ts.TypeNode => {
  // safety cast
  const properties = t.members.filter((w) =>
    ts.isPropertySignature(w)
  ) as ts.PropertySignature[];
  const body = properties.find(
    (w) => (w.name as ts.Identifier).escapedText === "body"
  )!;
  const query = properties.find(
    (w) => (w.name as ts.Identifier).escapedText === "query"
  )!;

  const newQuery = updatePropertySignature(query, queryTypes);

  return ts.factory.updateTypeLiteralNode(
    t,
    ts.factory.createNodeArray([body, newQuery])
  );
};

const createTypeDeclaration = (
  method: string,
  route: string,
  query: ReturnType<typeof extractRoute>["query"],
  verb: "Request" | "Response",
  t: ts.TypeAliasDeclaration,
  writer: (...nodes: ts.Node[]) => string
): string => {
  const typeDecl = ts.factory.updateTypeAliasDeclaration(
    t,
    undefined,
    ts.factory.createIdentifier(getTypeName(route, method, verb)),
    undefined,
    verb === "Request"
      ? updateParamsTypeDeclaration(t.type as ts.TypeLiteralNode, query)
      : t.type
  );

  const signature = ts.factory.createPropertySignature(
    undefined,
    ts.factory.createStringLiteral(route),
    undefined,
    ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(getTypeName(route, method, verb)),
      undefined
    )
  );

  const decl = ts.factory.createInterfaceDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(`${method}${verb}`),
    undefined,
    undefined,
    [signature]
  );

  return writer(typeDecl, decl);
};

const build = (args: Configuration): string => {
  const program = createProgram(args);
  const scripts = findPrograms({ program, config: args });
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const source = ts.createSourceFile("$apis.ts", "", ts.ScriptTarget.Latest);

  const write = (...nodes: ts.Node[]) => {
    const content: string[] = [];

    for (const node of nodes) {
      content.push(printer.printNode(ts.EmitHint.Unspecified, node, source));
    }

    return content.join("\n\n");
  };

  const definition: string[] = [];

  for (const script of scripts) {
    const route = extractRoute({
      program,
      root: args.input,
      route: script,
    });

    const handlers = extractHandlers({ program, source: script });

    if (handlers.length) {
      for (const [method, req, res] of handlers) {
        definition.push(
          createTypeDeclaration(
            camelcase(method),
            route.path,
            route.query,
            "Request",
            req,
            write
          )
        );

        definition.push(
          createTypeDeclaration(
            camelcase(method),
            route.path,
            route.query,
            "Response",
            res,
            write
          )
        );
      }
    }
  }

  return definition.join("\n\n");
};

export { build };
