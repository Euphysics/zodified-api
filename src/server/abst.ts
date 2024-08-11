import type {
  ApiConfig,
  ApiEndpoint,
  GenericRequest,
  GenericResponse,
  Handler,
  Middleware,
} from "@/types";
import type { z } from "zod";

export abstract class AbstractApiServer<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
  Req extends GenericRequest,
  Res extends GenericResponse,
> {
  protected middlewares: Set<Middleware<Req, Res>> = new Set();

  constructor(protected config: C) {}

  use(middleware: Middleware<Req, Res>): void {
    this.middlewares.add(middleware);
  }

  removeMiddleware(middleware: Middleware<Req, Res>): void {
    this.middlewares.delete(middleware);
  }

  abstract handle<T extends keyof C["endpoints"]>(
    endpointKey: T,
    handler: Handler<
      z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>,
      z.infer<NonNullable<C["endpoints"][T]["responseBodySchema"]>>,
      Req,
      Res
    >,
  ): (req: Req, res: Res) => Promise<void>;
}
