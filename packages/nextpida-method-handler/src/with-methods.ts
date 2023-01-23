import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

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

type HttpHandlers = { [TMethod in HttpMethods]?: NextApiHandler };

const withMethods = <THandlers extends HttpHandlers>(handlers: THandlers) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const handler = handlers[req.method as HttpMethods] as
      | NextApiHandler
      | undefined;
    if (handler) {
      return handler(req, res);
    }

    res.status(405).end();
  };
};

export { withMethods };

export type { HttpMethods, HttpHandlers };
