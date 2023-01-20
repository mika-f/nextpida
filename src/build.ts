import ts from "typescript";
import camelcase from "uppercamelcase";

import { findPrograms } from "./typescript/finder";
import { extract as extractHandlers } from "./typescript/handler-extracter";
import { getTypeName } from "./typescript/naming";
import { createProgram } from "./typescript/program";
import { extract as extractRoute } from "./typescript/route-extracter";

import type { Configuration } from "./config";

const createTypeDeclaration = (
  m: string,
  r: string,
  v: string,
  t: ts.TypeAliasDeclaration,
  w: (...nodes: ts.Node[]) => string
): string => {
  const typeDecl = ts.factory.updateTypeAliasDeclaration(
    t,
    undefined,
    ts.factory.createIdentifier(getTypeName(r, m, v)),
    undefined,
    t.type
  );

  const signature = ts.factory.createPropertySignature(
    undefined,
    ts.factory.createStringLiteral(r),
    undefined,
    ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(getTypeName(r, m, v)),
      undefined
    )
  );

  const decl = ts.factory.createInterfaceDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(`${m}${v}`),
    undefined,
    undefined,
    [signature]
  );

  return w(typeDecl, decl);
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
            "Request",
            req,
            write
          )
        );

        definition.push(
          createTypeDeclaration(
            camelcase(method),
            route.path,
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
