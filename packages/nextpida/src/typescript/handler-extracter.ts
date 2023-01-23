import ts from "typescript";

// supported types
const DETECTING_REQUIRED_MEMBERS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
] as const;

type HttpMethods = (typeof DETECTING_REQUIRED_MEMBERS)[number];

type TypedRequestHandler = ts.TypeAliasDeclaration;

type TypedResponseHandler = ts.TypeAliasDeclaration;

type TypedApiHandler = [TypedRequestHandler, TypedResponseHandler];

type TypedApiHandlerWithMethod = [HttpMethods, ...TypedApiHandler];

/**
 * unsafe marker
 *
 * @example
 *
 * const t = checker.getTypeAtLocation(node);
 *
 * return __unsafe__(() => {
 *  // unsafe code
 * }) ?? {
 *  return ...
 * }
 */
const __unsafe__ = <T>(func: () => T): T | undefined => {
  try {
    return func();
  } catch (err) {
    return undefined;
  }
};

const getDefaultExportNode = (
  source: ts.SourceFile,
  checker: ts.TypeChecker
): ts.Declaration | undefined => {
  const symbol = checker.getSymbolAtLocation(source);
  if (symbol === undefined) {
    return;
  }

  const exports = checker.getExportsOfModule(symbol);

  const handler = exports.find((w) => w.escapedName === "default")!;
  if (handler.declarations?.length === 1) {
    return handler.valueDeclaration;
  }

  return handler.declarations![0];
};

const createFullyResolvedTypeDeclarationBySymbol = (
  checker: ts.TypeChecker,
  s: ts.Symbol
): ts.TypeNode => {
  if (s.members && s.members.size) {
    const members: ts.TypeElement[] = [];

    s.members.forEach((member) => {
      const decl = member.valueDeclaration!;

      if (ts.isPropertySignature(decl)) {
        const tt = checker.getTypeAtLocation(decl.type!);
        const value = createFullyResolvedTypeDeclarationByType(checker, tt);

        members.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(decl.name.getText()),
            undefined,
            value
          )
        );

        return;
      }
    });

    return ts.factory.createTypeLiteralNode(members);
  }

  if (s.valueDeclaration) {
    const decl = s.valueDeclaration;

    if (ts.isPropertySignature(decl)) {
      const tt = checker.getTypeAtLocation(decl.type!);
      const value = createFullyResolvedTypeDeclarationByType(checker, tt);

      return value;
    }
  }

  return ts.factory.createTypeLiteralNode([]);
};

const createFullyResolvedTypeDeclarationByType = (
  checker: ts.TypeChecker,
  t: ts.Type
): ts.TypeNode => {
  if (t.flags === ts.TypeFlags.String) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  }

  if (t.flags === ts.TypeFlags.StringLiteral) {
    const literal = <ts.StringLiteralType>t;

    return ts.factory.createLiteralTypeNode(
      ts.factory.createStringLiteral(literal.value)
    );
  }

  if (t.flags === ts.TypeFlags.Number) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  }

  if (t.flags === ts.TypeFlags.NumberLiteral) {
    const literal = <ts.NumberLiteralType>t;

    return ts.factory.createLiteralTypeNode(
      ts.factory.createNumericLiteral(literal.value)
    );
  }

  if (t.flags === ts.TypeFlags.Boolean) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  }

  if (t.flags === ts.TypeFlags.BooleanLiteral) {
    const literal = <ts.LiteralType>t;

    return ts.factory.createLiteralTypeNode(ts.factory.createTrue());
  }

  if (t.flags === ts.TypeFlags.Undefined) {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
  }

  if (t.flags === ts.TypeFlags.Union) {
    const u = <ts.UnionType>t;
    const types: ts.TypeNode[] = [];

    for (const type of u.types) {
      types.push(createFullyResolvedTypeDeclarationByType(checker, type));
    }

    return ts.factory.createUnionTypeNode(types);
  }

  const s = t.symbol;

  // is present type is Array<T>?
  if (s.escapedName.toString() === "Array") {
    const array = <ts.TypeReference>t;
    const infer = createFullyResolvedTypeDeclarationByType(
      checker,
      array.typeArguments![0]
    );

    return ts.factory.createArrayTypeNode(infer);
  }

  return createFullyResolvedTypeDeclarationBySymbol(checker, s);
};

const createTypeDeclarationForUnknown = (
  name: string
): ts.TypeAliasDeclaration => {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  );
};

const createTypeDeclarationForReferenceType = (
  checker: ts.TypeChecker,
  t: ts.ObjectType
): ts.TypeAliasDeclaration => {
  const symbol = t.symbol;
  const members: ts.TypeElement[] = [];

  symbol.members?.forEach((s) => {
    if (s.valueDeclaration && ts.isPropertySignature(s.valueDeclaration)) {
      if (s.valueDeclaration.type) {
        const t = checker.getTypeAtLocation(s.valueDeclaration.type);

        members.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(s.escapedName.toString()),
            undefined,
            createFullyResolvedTypeDeclarationByType(checker, t)
          )
        );
      }
    }
  });

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(""),
    undefined,
    ts.factory.createTypeLiteralNode(members)
  );
};

const createTypeDeclarationForUnionType = (
  checker: ts.TypeChecker,
  t: ts.UnionType
): ts.TypeAliasDeclaration => {
  const literals: ts.TypeNode[] = [];

  for (const type of t.types) {
    const decl = createFullyResolvedTypeDeclarationByType(checker, type);
    literals.push(decl);
  }

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(""),
    undefined,
    ts.factory.createUnionTypeNode(literals)
  );
};

const createTypeDeclarationForExports = (
  checker: ts.TypeChecker,
  node: ts.TypeNode
): ts.TypeAliasDeclaration => {
  const t = checker.getTypeAtLocation(node);

  if (t.flags === ts.TypeFlags.Union) {
    return createTypeDeclarationForUnionType(checker, <ts.UnionType>t);
  }

  if (t.flags === ts.TypeFlags.Object) {
    return createTypeDeclarationForReferenceType(checker, <ts.ObjectType>t);
  }

  throw new Error("");
};

const getResponseTypeDefinition = (
  checker: ts.TypeChecker,
  t: ts.TypeReferenceNode
): ts.TypeAliasDeclaration => {
  if (ts.isIdentifier(t.typeName)) {
    // return T of NextApiResponse<T>
    if (t.typeName.escapedText === "NextApiResponse") {
      if (t.typeArguments) {
        const response = t.typeArguments[0];

        return createTypeDeclarationForExports(checker, response);
      } else {
        return createTypeDeclarationForUnknown("");
      }
    }

    // return NextApiRequestLike<T = any>
    return createTypeDeclarationForUnknown("");
  }

  return createTypeDeclarationForUnknown("");
};

const getRequestTypeDefinition = (
  checker: ts.TypeChecker,
  symbol?: ts.Symbol
): ts.TypeNode => {
  const unknown = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.UnknownKeyword
  );

  if (symbol) {
    if (
      symbol.valueDeclaration &&
      ts.isPropertySignature(symbol.valueDeclaration)
    ) {
      const type = symbol.valueDeclaration.type;

      if (type && ts.isTypeReferenceNode(type)) {
        const t = checker.getTypeAtLocation(type);

        if (t.flags === ts.TypeFlags.Any) {
          return unknown;
        }

        return (
          __unsafe__(() => {
            // working with TypeScript 4.9.4
            // `at` includes **resolved** type properties
            const at = (t as any).members as Map<string, ts.Symbol>;
            const members: ts.PropertySignature[] = [];

            at.forEach((val, key) => {
              checker.getTypeOfSymbolAtLocation(val, type);

              const infer: ts.Type = (val as any).type;
              const t = createFullyResolvedTypeDeclarationByType(
                checker,
                infer
              );

              const p = ts.factory.createPropertySignature(
                undefined,
                ts.factory.createIdentifier(key),
                undefined,
                t
              );

              members.push(p);
            });

            return ts.factory.createTypeLiteralNode(members);
          }) ?? createFullyResolvedTypeDeclarationByType(checker, t)
        );
      }
    }
  }

  return unknown;
};

const getRequestTypeDefinitions = (
  checker: ts.TypeChecker,
  bodySymbol?: ts.Symbol,
  querySymbol?: ts.Symbol
): ts.TypeAliasDeclaration => {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(""),
    undefined,
    ts.factory.createTypeLiteralNode([
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier("body"),
        undefined,
        getRequestTypeDefinition(checker, bodySymbol)
      ),
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier("query"),
        undefined,
        getRequestTypeDefinition(checker, querySymbol)
      ),
    ])
  );
};

const isParameterTypeInheritFrom = (
  checker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration,
  type: string
): ts.TypeAliasDeclaration => {
  if (parameter.type === undefined || !ts.isTypeReferenceNode(parameter.type)) {
    return createTypeDeclarationForUnknown("");
  }

  if (!ts.isIdentifier(parameter.type.typeName)) {
    return createTypeDeclarationForUnknown("");
  }

  const symbol = checker.getExportSpecifierLocalTargetSymbol(
    parameter.type.typeName
  );

  const [module, name] = type.split("/");
  if (symbol?.name !== name || !symbol.declarations) {
    // check the type is replaced `body` and/or `query` in NextApiRequest?
    if (symbol && type === "next/NextApiRequest") {
      const t = checker.getTypeFromTypeNode(parameter.type);

      if (t.flags === ts.TypeFlags.Intersection) {
        const it = <ts.IntersectionType>t;

        const properties = it.types.flatMap((w) => w.getProperties());
        const bs = properties.find((w) => w.escapedName === "body")!;
        const qs = properties.find((w) => w.escapedName === "query")!;

        return getRequestTypeDefinitions(checker, bs, qs);
      }
    }

    return createTypeDeclarationForUnknown("");
  }

  if (type === "next/NextApiResponse") {
    let node: ts.Node = symbol.declarations[0];
    while (node.parent !== undefined) {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (ts.isStringLiteral(specifier) && specifier.text === module) {
          return getResponseTypeDefinition(checker, parameter.type);
        }
      } else {
        node = node.parent;
      }
    }
  }

  return type === "next/NextApiRequest"
    ? getRequestTypeDefinitions(checker)
    : createTypeDeclarationForUnknown("");
};

/**
 *
 * check the specified function is compatible with NextApiHandler<T = any>
 */
const getReferencedHandlerReqResSignature = (
  checker: ts.TypeChecker,
  func: ts.Identifier
): TypedApiHandler | undefined => {
  const symbol = checker.getTypeAtLocation(func).symbol;
  if (!symbol.declarations) {
    return undefined;
  }

  const declaration = symbol.declarations[0];
  if (ts.isFunctionLike(declaration)) {
    const parameters = declaration.parameters;

    if (parameters.length !== 2) {
      return undefined;
    }

    const req = parameters[0];
    const res = parameters[1];

    return [
      isParameterTypeInheritFrom(checker, req, "next/NextApiRequest"),
      isParameterTypeInheritFrom(checker, res, "next/NextApiResponse"),
    ];
  }

  return undefined;
};

const getResolvedSatisfiesHandler = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol
): TypedApiHandlerWithMethod | undefined => {
  const handler = symbol.valueDeclaration;

  if (!handler || !ts.isPropertyAssignment(handler)) {
    return undefined;
  }

  const name = handler.name.getText();
  if (!(DETECTING_REQUIRED_MEMBERS as readonly string[]).includes(name)) {
    return undefined;
  }

  if (ts.isCallExpression(handler.initializer)) {
    const isHandlerIsSatisfiesFunction = (
      node: ts.Node
    ): [any, any] | undefined => {
      if (ts.isIdentifier(node)) {
        return getReferencedHandlerReqResSignature(checker, node);
      }

      if (ts.isCallExpression(node)) {
        return node.arguments.map(isHandlerIsSatisfiesFunction).find((w) => w);
      }

      return undefined;
    };

    const signatures = handler.initializer.arguments
      .map(isHandlerIsSatisfiesFunction)
      .find((w) => w);

    if (signatures) {
      return [name as HttpMethods, ...signatures];
    }
  }

  if (ts.isIdentifier(handler.initializer)) {
    const signatures = getReferencedHandlerReqResSignature(
      checker,
      handler.initializer
    );
    if (signatures) {
      return [name as HttpMethods, ...signatures];
    }
  }

  return undefined;
};

/**
 * nextpida maps the methods and functions specified in the options to type definitions, if default exported, for the return value of function with the following signatures:
 *
 * @example
 * type NextApiHandler<T = any> = (req: NextApiRequest, res: NextApiResponse<T>);
 *
 * type HttpMethods = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
 * type HttpHandlers = { [TMethod in HttpMethods]?: NextApiHandler };
 * type NextpidaSatisfiedFunctionSignature = <THandlers extends HttpHandlers>(handlers: THandlers) => unknown | Promise<unknown>;
 *
 * const handler: NextpidaSatisfiedFunctionSignature = (...);
 *
 * export default handler;
 */
const getSatisfiesHandlerSignatures = (
  checker: ts.TypeChecker,
  expr: ts.CallExpression
): TypedApiHandlerWithMethod[] => {
  const signature = checker.getResolvedSignature(expr);
  const parameter = signature!.parameters[0]!;
  const symbol = checker.getTypeOfSymbolAtLocation(parameter, expr).symbol;

  if (!symbol.members || symbol.members.size === 0) {
    return []; // unknown object
  }

  const signatures: any[] = [];

  symbol.members.forEach((value) => {
    signatures.push(getResolvedSatisfiesHandler(checker, value));
  });

  return signatures.filter((w) => w);
};

const findMethodDeclarationSignature = (
  checker: ts.TypeChecker,
  node: ts.Node
): TypedApiHandlerWithMethod[] => {
  if (ts.isExportAssignment(node)) {
    return findMethodDeclarationSignature(checker, node.expression);
  }

  if (ts.isCallExpression(node)) {
    const firstArgument = node.arguments[0];

    if (ts.isObjectLiteralExpression(firstArgument)) {
      return getSatisfiesHandlerSignatures(checker, node);
    }

    if (ts.isCallExpression(firstArgument)) {
      return findMethodDeclarationSignature(checker, firstArgument);
    }
  }

  return [];
};

type ExtractArgs = {
  program: ts.Program;
  source: string;
};

const extract = (args: ExtractArgs): TypedApiHandlerWithMethod[] => {
  const checker = args.program.getTypeChecker();
  const source = args.program.getSourceFile(args.source)!;

  const handler = getDefaultExportNode(source, checker);
  if (handler) {
    return findMethodDeclarationSignature(checker, handler);
  }

  return [];
};

export { extract };
