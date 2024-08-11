import type { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiEndpoint<
  TQuery = unknown,
  TRequest = unknown,
  TResponse = unknown,
> {
  method: HttpMethod;
  url: string;
  headers?: { [key: string]: string };
  authRequired: boolean;
  requestQuerySchema?: z.ZodType<TQuery>;
  requestBodySchema?: z.ZodType<TRequest>;
  responseBodySchema: z.ZodType<TResponse>;
}

export interface ApiConfig<Endpoints extends Record<string, ApiEndpoint>> {
  baseUrl: string;
  endpoints: Endpoints;
}

export type ApiEndpointKey<C extends ApiConfig<Record<string, ApiEndpoint>>> =
  keyof C["endpoints"];

export type ApiEndpointRequestQueryType<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
  T extends ApiEndpointKey<C>,
> = z.infer<NonNullable<C["endpoints"][T]["requestQuerySchema"]>>;

export type ApiEndpointRequestBodyType<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
  T extends ApiEndpointKey<C>,
> = z.infer<NonNullable<C["endpoints"][T]["requestBodySchema"]>>;

export type ApiEndpointResponseBodyType<
  C extends ApiConfig<Record<string, ApiEndpoint>>,
  T extends ApiEndpointKey<C>,
> = z.infer<C["endpoints"][T]["responseBodySchema"]>;

export interface GenericRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface GenericResponse {
  status(code: number): GenericResponse;
  json(data: unknown): void;
}

export type Middleware<Req, Res> = (
  req: Req,
  res: Res,
  next: () => void,
) => Promise<void> | void;

export type Handler<ParsedQuery, ParsedBody, ResponseData, Req, Res> = (
  request: Req & { parsedQuery: ParsedQuery; parsedBody: ParsedBody },
  response: Res,
) => Promise<ResponseData> | ResponseData;
