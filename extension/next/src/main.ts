import { AbstractApiServer } from "@zodified-api/core";
import type {
  ApiConfig,
  ApiEndpoint,
  GenericRequest,
  GenericResponse,
  Handler,
} from "@zodified-api/core";
import type { NextApiRequest, NextApiResponse } from "next";
import type { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { NextRequestAdapter, NextResponseAdapter } from "./app";
import { NextApiRequestAdapter, NextApiResponseAdapter } from "./pages";

export class NextJsApiServer<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
> extends AbstractApiServer<C, GenericRequest, GenericResponse> {
  handle<T extends keyof C["endpoints"]>(
    endpointKey: T,
    handler: Handler<
      z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["responseBodySchema"]>>,
      GenericRequest,
      GenericResponse
    >,
  ): (req: GenericRequest, res: GenericResponse) => Promise<void> {
    return async (req: GenericRequest, res: GenericResponse) => {
      await this.handleRequest(endpointKey, handler, req, res);
    };
  }

  // Handler for App Router
  handleAppRoute<T extends keyof C["endpoints"]>(
    endpointKey: T,
    handler: Handler<
      z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["responseBodySchema"]>>,
      GenericRequest,
      GenericResponse
    >,
  ): (req: NextRequest) => Promise<NextResponse> {
    return async (req: NextRequest) => {
      const adaptedReq = new NextRequestAdapter(req);
      await adaptedReq.parseBody();
      const adaptedRes = new NextResponseAdapter();
      await this.handleRequest(endpointKey, handler, adaptedReq, adaptedRes);
      return adaptedRes.getResponse();
    };
  }

  // Handler for Pages Router
  handlePagesRoute<T extends keyof C["endpoints"]>(
    endpointKey: T,
    handler: Handler<
      z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["responseBodySchema"]>>,
      GenericRequest,
      GenericResponse
    >,
  ): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const adaptedReq = new NextApiRequestAdapter(req);
      const adaptedRes = new NextApiResponseAdapter(res);
      await this.handleRequest(endpointKey, handler, adaptedReq, adaptedRes);
    };
  }

  private async handleRequest<T extends keyof C["endpoints"]>(
    endpointKey: T,
    handler: Handler<
      z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["responseBodySchema"]>>,
      GenericRequest,
      GenericResponse
    >,
    req: GenericRequest,
    res: GenericResponse,
  ): Promise<void> {
    const endpoint = this.config.endpoints[endpointKey as string];

    if (req.method !== endpoint.method) {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    let nextCalled = false;
    try {
      for (const middleware of this.middlewares) {
        await middleware(req, res, () => {
          nextCalled = true;
        });
        if (!nextCalled) {
          return;
        }
        nextCalled = false; // Reset for the next middleware
      }
    } catch (error) {
      console.error("Middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let parsedQuery: unknown = req.query;
    if (endpoint.requestQuerySchema) {
      const result = endpoint.requestQuerySchema.safeParse(parsedQuery);
      if (!result.success) {
        res.status(400).json({ error: "Invalid request query" });
        return;
      }
      parsedQuery = result.data;
    }

    let parsedBody: unknown = req.body;
    if (endpoint.requestBodySchema) {
      const result = endpoint.requestBodySchema.safeParse(parsedBody);
      if (!result.success) {
        res.status(400).json({ error: "Invalid request body" });
        return;
      }
      parsedBody = result.data;
    }

    try {
      const response = await handler(
        { ...req, parsedQuery, parsedBody } as GenericRequest & {
          parsedQuery: typeof parsedQuery;
          parsedBody: typeof parsedBody;
        },
        res,
      );

      res.status(200).json(response);
    } catch (error) {
      console.error("Handler error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
