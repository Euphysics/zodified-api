import type {
  Method,
  ZodifiedEndpointDefinition,
  ZodifiedPathsByMethod,
} from "@zodified-api/core";
import type { NextRequest, NextResponse } from "next/server";
import { NextRequestAdapter, NextResponseAdapter } from "./app";
import { ApiServer } from "./server";
import type { ZodifiedHandler } from "./types";

export class NextJsAppRouter<
  Api extends ZodifiedEndpointDefinition[],
> extends ApiServer<
  NextResponse,
  Api,
  NextRequestAdapter,
  NextResponseAdapter
> {
  handleAppRoute<M extends Method, Path extends ZodifiedPathsByMethod<Api, M>>(
    method: M,
    path: Path,
    handler: ZodifiedHandler<
      NextResponse,
      Api,
      M,
      Path,
      NextRequestAdapter,
      NextResponseAdapter
    >,
  ): (
    req: NextRequest,
    params: Record<string, string | undefined> | undefined,
  ) => Promise<NextResponse> {
    return async (
      req: NextRequest,
      params: Record<string, string | undefined> | undefined,
    ) => {
      const adaptedReq = new NextRequestAdapter(req, params);
      await adaptedReq.initialize();
      const adaptedRes = new NextResponseAdapter();
      return await this.handleByPathAndMethod(
        method,
        path,
        handler,
      )(adaptedReq, adaptedRes);
    };
  }
}
