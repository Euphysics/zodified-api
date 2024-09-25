import type {
  Method,
  ZodifiedBodyByAlias,
  ZodifiedBodyByPath,
  ZodifiedEndpointDefinition,
  ZodifiedPathParamByAlias,
  ZodifiedPathParamsByPath,
  ZodifiedPathsByMethod,
  ZodifiedQueryParamsByAlias,
  ZodifiedQueryParamsByPath,
  ZodifiedResponseByAlias,
  ZodifiedResponseByPath,
} from "@zodified-api/core";

export interface BaseRequest {
  zodifiedMethod: Method;
  zodifiedUrl: string;
  zodifiedHeaders: Record<string, string | undefined>;
  zodifiedParams: Record<string, string | undefined>;
  zodifiedQuery: Record<string, string | undefined>;
  zodifiedBody: unknown;
}

export interface BaseResponse<R extends Response = Response> {
  status(code: number): this;
  json(data: unknown): R;
}

export type Middleware<
  R extends Response,
  Req extends BaseRequest,
  Res extends BaseResponse<R>,
> = (
  req: Req,
  res: Res,
  next: () => Promise<void> | void,
) => Promise<void> | void;

export type Handler<
  R extends Response,
  Req extends BaseRequest,
  Res extends BaseResponse<R>,
  ResponseData,
> = (req: Req, res: Res) => Promise<ResponseData> | ResponseData;

export type ZodifiedHandler<
  R extends Response,
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Req extends BaseRequest,
  Res extends BaseResponse<R>,
> = Handler<
  R,
  Req & {
    parsedParams: ZodifiedPathParamsByPath<Api, M, Path>;
    parsedQuery: ZodifiedQueryParamsByPath<Api, M, Path>;
    parsedBody: ZodifiedBodyByPath<Api, M, Path>;
  },
  Res,
  ZodifiedResponseByPath<Api, M, Path>
>;

export type ZodifiedHandlerByAlias<
  R extends Response,
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Req extends BaseRequest,
  Res extends BaseResponse<R>,
> = Handler<
  R,
  Req & {
    parsedParams: ZodifiedPathParamByAlias<Api, Alias>;
    parsedQuery: ZodifiedQueryParamsByAlias<Api, Alias>;
    parsedBody: ZodifiedBodyByAlias<Api, Alias>;
  },
  Res,
  ZodifiedResponseByAlias<Api, Alias>
>;
