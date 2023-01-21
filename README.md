# @natsuneko-laboratory/nextpida

nextpida is a package that TypeScript friendly apis path generator for Next.js

## Install

```bash
# required
$ yarn add @natsuneko-laboratory/nextpida --dev

# optional for using default type definitions
$ yarn add @natsuneko-laboratory/nextpida-handler-types --dev

# optional for using default `withMethods` handler
$ yarn add @natsuneko-laboratory/nextpida-method-handler
```

## Generate Type Definitions

```bash
# build
$ yarn run nextpida

# build with watch mode
$ yarn run nextpida --watch
```

## Type Detection

Nextpida generates routes and type definitions for a default exported handler with a typedefinition of the following form:

```typescript
import type { NextApiRequest, NextApiResponse } from "next";

// default handler
type NextApiHandler<T = any> = (req: NextApiRequest, res: NextApiResponse<T>) => unknown;

// handler with request body
type NextApiRequestWithBody<T = any> = Omit<NextApiRequest, "body"> & { body: T };
type NextApiHandler<TResponse = any, TRequestBody = any> = (req: NextApiRequestWithBody<TRequestBody>, res: NextApiResponse<TResponse>) => unknown;

// handler with request query params
type NextApiRequestWithQuery<T = any> = Omit<NextApiRequest, "query"> & { query: T };
type NextApiHandler<TResponse = any, TRequestQueryParam = any> = (req: NextApiRequestWithQuery<TRequestQueryParam>, res: NextApiResponse<TResponse>) => unknown;

// handler with request body and query params
type NextApiRequestWithBodyAndQuery<TRequestBody = any, TQueryParameter = any> = Omit<NextApiRequest, "body" | "query"> & { body: TRequestBody, query: TQueryParameter };
type NextApiHandler<TResponse = any, TRequestBodyParam = any, TRequestQueryParam = any> = (req: NextApiRequestWithBodyAndQuery<TRequestBodyParam, TRequestQueryParam>, res: NextApiResponse<TResponse>) => unknown;

type HttpMethods = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
type HttpHandlers = { [TMethod in HttpMethods]?: NextApiHandler };
type NextpidaSatisfiedFunctionSignature = <THandlers extends HttpHandlers>(handlers: THandlers) => unknown | Promise<unknown>;

const handler: NextpidaSatisfiedFunctionSignature = /* ... */;

export default handler;
```

You must:

- Response type must be specified in `T` of `NextApiResponse<T>`
- Request body type must be replaced in `body: any` of `NextApiRequest`
  - If it is not replaced and remains `any`, no type definitions is generated for the request body
- Request **additional** query params type must be replaced in `query: Partial<{ [key: string]: string | string[]; }>` of `NextApiRequest`
  - If it is not replaced and remains `Partial<{ [key: string]: string | string[]; }>`, no **additional** type definitions is generated for the request query params

## Import Types

By default, nextpida write type definition file into `lib/$apis.ts`

```typescript
import type { GetRequest, PostRequest } from "lib/$apis";

// GET /api/v1/users request and response typings

// full typing
type RequestBodyAndQueryParams = GetRequest["api/v1/users"];

// request body only
type RequestBody = GetRequest["api/v1/users"].body;

// request query params only
type RequestQueryParams = GetRequest["api/v1/users"].query;

// response body
type Response = GetResponse["api/v1/users"];


// POST /api/v1/users request and response typings
type Response = PostResponse["api/v1/users"];
```

## Known Issues

- if optional parameter is used, `undefined` is not given

## License

MIT by [@6jz](https://twitter.com/6jz)
