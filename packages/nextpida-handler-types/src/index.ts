import type { NextApiRequest, NextApiResponse } from "next";

// default handler
type NextApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => unknown;

// handler with request body
type NextApiRequestWithBody<T = unknown> = Omit<NextApiRequest, "body"> & {
  body: T;
};
type NextApiHandlerWithBody<TResponse = unknown, TRequestBody = unknown> = (
  req: NextApiRequestWithBody<TRequestBody>,
  res: NextApiResponse<TResponse>
) => unknown;

// handler with request query params
type NextApiRequestWithQuery<T = unknown> = Omit<NextApiRequest, "query"> & {
  query: T;
};
type NextApiHandlerWithQuery<
  TResponse = unknown,
  TRequestQueryParam = unknown
> = (
  req: NextApiRequestWithQuery<TRequestQueryParam>,
  res: NextApiResponse<TResponse>
) => unknown;

// handler with request body and query params
type NextApiRequestWithBodyAndQuery<
  TRequestBody = unknown,
  TQueryParameter = unknown
> = Omit<NextApiRequest, "body" | "query"> & {
  body: TRequestBody;
  query: TQueryParameter;
};
type NextApiHandlerWithBodyAndQuery<
  TResponse = unknown,
  TRequestBodyParam = unknown,
  TRequestQueryParam = unknown
> = (
  req: NextApiRequestWithBodyAndQuery<TRequestBodyParam, TRequestQueryParam>,
  res: NextApiResponse<TResponse>
) => unknown;

type NextApiHandlers<
  TResponse = unknown,
  TRequestBody = unknown,
  TRequestQuery = unknown
> =
  | NextApiHandler<TResponse>
  | NextApiHandlerWithBody<TResponse, TRequestBody>
  | NextApiHandlerWithQuery<TResponse, TRequestQuery>
  | NextApiHandlerWithBodyAndQuery<TResponse, TRequestBody, TRequestQuery>;

type HttpMethods =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";

type HttpHandlers = { [TMethod in HttpMethods]?: NextApiHandlers };

type NextpidaSatisfiedFunctionSignature = <THandlers extends HttpHandlers>(
  handlers: THandlers
) => unknown | Promise<unknown>;

export type {
  // handlers
  NextApiHandler,
  NextApiHandlers,
  NextApiHandlerWithBody,
  NextApiHandlerWithQuery,
  NextApiHandlerWithBodyAndQuery,

  // request
  NextApiRequestWithBody,
  NextApiRequestWithQuery,
  NextApiRequestWithBodyAndQuery,

  // supported methods
  HttpMethods,

  // signature
  NextpidaSatisfiedFunctionSignature,
};
