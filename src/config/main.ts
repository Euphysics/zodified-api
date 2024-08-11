import type { ApiConfig, ApiEndpoint, HttpMethod } from "@/types";
import type { z } from "zod";

export type EndpointConfig<
  TQuery = unknown,
  TRequest = unknown,
  TResponse = unknown,
> = {
  method: HttpMethod;
  path: string;
  auth?: boolean;
  headers?: Record<string, string>;
  query?: z.ZodType<TQuery>;
  request?: z.ZodType<TRequest>;
  response: z.ZodType<TResponse>;
};

type ToApiEndpoint<T extends EndpointConfig> = ApiEndpoint<
  z.infer<NonNullable<T["query"]>>,
  z.infer<NonNullable<T["request"]>>,
  z.infer<NonNullable<T["response"]>>
>;

export function createApiConfig<T extends Record<string, EndpointConfig>>(
  baseUrl: string,
  endpoints: T,
): ApiConfig<{ [K in keyof T]: ToApiEndpoint<T[K]> }> {
  const convertedEndpoints: Record<string, ApiEndpoint> = {};

  for (const [key, endpoint] of Object.entries(endpoints)) {
    convertedEndpoints[key] = {
      method: endpoint.method,
      url: endpoint.path,
      authRequired: endpoint.auth ?? false,
      headers: endpoint.headers,
      requestQuerySchema: endpoint.query,
      requestBodySchema: endpoint.request,
      responseBodySchema: endpoint.response,
    };
  }

  return {
    baseUrl,
    endpoints: convertedEndpoints,
  } as ApiConfig<{ [K in keyof T]: ToApiEndpoint<T[K]> }>;
}
