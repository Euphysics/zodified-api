import type {
  BaseRequest,
  BaseResponse,
  Method,
  Middleware,
  ZodifiedBodyByPath,
  ZodifiedEndpointDefinition,
  ZodifiedHandler,
  ZodifiedHandlerByAlias,
  ZodifiedPathParamsByPath,
  ZodifiedPathsByMethod,
  ZodifiedQueryParamsByPath,
} from "@/types";
import { z } from "zod";

export abstract class ApiServer<
  R extends Response,
  Api extends ZodifiedEndpointDefinition[],
  Req extends BaseRequest,
  Res extends BaseResponse<R>,
> {
  protected config: Api;
  protected middlewares: Middleware<R, Req, Res>[] = [];

  constructor(config: Api) {
    this.config = config;
  }

  use(middleware: Middleware<R, Req, Res>): void {
    this.middlewares.push(middleware);
  }

  handleByAlias<Alias extends string>(
    alias: Alias,
    handler: ZodifiedHandlerByAlias<R, Api, Alias, Req, Res>,
  ): (req: Req, res: Res) => Promise<R> {
    return this.createHandler(() => this.findEndpointByAlias(alias), handler);
  }

  handleByPathAndMethod<
    M extends Method,
    Path extends ZodifiedPathsByMethod<Api, M>,
  >(
    method: M,
    path: Path,
    handler: ZodifiedHandler<R, Api, M, Path, Req, Res>,
  ): (req: Req, res: Res) => Promise<R> {
    return this.createHandler(
      () => this.findEndpointByPathAndMethod(method, path),
      handler,
    );
  }

  private createHandler<
    M extends Method,
    Path extends ZodifiedPathsByMethod<Api, M>,
  >(
    findEndpoint: (req: Req) => ZodifiedEndpointDefinition | undefined,
    handler: ZodifiedHandler<R, Api, M, Path, Req, Res>,
  ): (req: Req, res: Res) => Promise<R> {
    return async (req: Req, res: Res) => {
      const endpoint = findEndpoint(req);

      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      return await this.handleRequest(endpoint, handler, req, res);
    };
  }

  private findEndpointByAlias(
    alias: string,
  ): ZodifiedEndpointDefinition | undefined {
    return this.config.find((ep) => ep.alias === alias);
  }

  private findEndpointByPathAndMethod(
    method: Method,
    path: string,
  ): ZodifiedEndpointDefinition | undefined {
    return this.config.find((ep) => ep.method === method && ep.path === path);
  }

  private parseParameters(
    params: Record<string, string | undefined>,
    // biome-ignore lint/suspicious/noExplicitAny: This is a valid use case for any
    schema?: z.ZodObject<any>,
  ): Record<string, unknown> {
    const parsedParams: Record<string, unknown> = {};

    if (schema) {
      for (const key in schema.shape) {
        if (params[key] !== undefined) {
          try {
            const schemaType = schema.shape[key];
            let value: unknown = params[key];

            // Convert the string to the expected type
            if (schemaType instanceof z.ZodNumber) {
              value = Number(params[key]);
            } else if (schemaType instanceof z.ZodBoolean) {
              value = params[key]?.toLowerCase() === "true";
            } else if (schemaType instanceof z.ZodDate) {
              value = new Date(params[key] as string);
            } else if (schemaType instanceof z.ZodBigInt) {
              value = BigInt(params[key] as string);
            } else if (schemaType instanceof z.ZodArray) {
              value = params[key]?.split(",");
            } else if (schemaType instanceof z.ZodObject) {
              value = JSON.parse(params[key] as string);
            }
            parsedParams[key] = schemaType.parse(value);
          } catch (error) {
            parsedParams[key] = params[key];
          }
        }
      }
    } else {
      Object.assign(parsedParams, params);
    }

    return parsedParams;
  }

  protected async handleRequest<
    M extends Method,
    Path extends ZodifiedPathsByMethod<Api, M>,
  >(
    endpoint: ZodifiedEndpointDefinition,
    handler: ZodifiedHandler<R, Api, M, Path, Req, Res>,
    req: Req,
    res: Res,
  ): Promise<R> {
    if (req.zodifiedMethod !== endpoint.method) {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      await this.runMiddlewares(req, res);
    } catch (error) {
      console.error("Middleware error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    const parsedParams = this.validateParameters(
      req.zodifiedParams,
      endpoint,
      "Path",
    ) as ZodifiedPathParamsByPath<Api, M, Path>;
    const parsedQuery = this.validateParameters(
      req.zodifiedQuery,
      endpoint,
      "Query",
    ) as ZodifiedQueryParamsByPath<Api, M, Path>;
    const parsedBody = this.validateBody(
      req.zodifiedBody,
      endpoint,
    ) as ZodifiedBodyByPath<Api, M, Path>;

    try {
      const response = await handler(
        {
          ...req,
          parsedParams,
          parsedQuery,
          parsedBody,
        },
        res,
      );

      return res.status(200).json(response);
    } catch (error) {
      console.error("Handler error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  private async runMiddlewares(req: Req, res: Res): Promise<void> {
    for (const middleware of this.middlewares) {
      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });
      if (!nextCalled) {
        throw new Error("Middleware did not call next");
      }
    }
  }

  private validateParameters(
    params: Record<string, string | undefined>,
    endpoint: ZodifiedEndpointDefinition,
    type: "Path" | "Query",
  ): Record<string, unknown> {
    const paramSchema = endpoint.parameters?.find((p) => p.type === type)
      ?.schema as
      // biome-ignore lint/suspicious/noExplicitAny: This is a valid use case for any
      z.ZodObject<any> | undefined;
    return this.parseParameters(params, paramSchema);
  }

  private validateBody(
    body: unknown,
    endpoint: ZodifiedEndpointDefinition,
  ): unknown {
    const bodySchema = endpoint.parameters?.find(
      (p) => p.type === "Body",
    )?.schema;

    if (bodySchema) {
      const result = (bodySchema as z.ZodTypeAny).safeParse(body);
      if (!result.success) {
        throw new Error("Invalid request body");
      }
      return result.data;
    }

    return body;
  }
}
