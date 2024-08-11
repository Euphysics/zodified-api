import { ApiError } from "@/error";
import type {
  ApiConfig,
  ApiEndpoint,
  GenericRequest,
  GenericResponse,
  Handler,
} from "@/types";
import type { z } from "zod";
import { AbstractApiServer } from "./abst";

export class GenericApiServer<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
> extends AbstractApiServer<C, GenericRequest, GenericResponse> {
  private sendResponse(
    res: GenericResponse,
    data: unknown,
    responseBodySchema: z.ZodType<unknown, z.ZodTypeDef, unknown>,
  ): void {
    const validation = responseBodySchema.safeParse(data);
    if (!validation.success) {
      console.error("Response validation failed:", validation.error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.status(200).json(validation.data);
  }

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
    const endpoint = this.config.endpoints[endpointKey as string];

    return async (req, res) => {
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
          res.status(400).json({ error: "Invalid request" });
          return;
        }
        parsedQuery = result.data;
      }

      let parsedBody: unknown = req.body;
      if (endpoint.requestBodySchema) {
        const result = endpoint.requestBodySchema.safeParse(parsedBody);
        if (!result.success) {
          res.status(400).json({ error: "Invalid request" });
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

        this.sendResponse(res, response, endpoint.responseBodySchema);
      } catch (error) {
        console.error("Handler error:", error);
        if (error instanceof ApiError) {
          res.status(error.status).json({ error: "Request failed" });
        } else {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    };
  }
}
