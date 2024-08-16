import type { ZodifiedOptions, ZodifiedPlugin } from "@/types";
import { findEndpoint } from "@/utils";

type Options = Required<
  Pick<ZodifiedOptions, "validate" | "transform" | "sendDefaults">
>;

const shouldResponse = (option: string | boolean) =>
  [true, "response", "all"].includes(option);

const shouldRequest = (option: string | boolean) =>
  [true, "request", "all"].includes(option);

/**
 * Zod validation plugin used internally by Zodified.
 * By default zodios always validates the response.
 * @returns zod-validation plugin
 */
export const zodValidationPlugin = ({
  validate,
  transform,
  sendDefaults,
}: Options): ZodifiedPlugin => ({
  name: "zod-validation",
  request: shouldRequest(validate)
    ? async (api, config) => {
        const endpoint = findEndpoint(api, config.method, config.url);
        if (!endpoint) {
          throw new Error(
            `No endpoint found for ${config.method} ${config.url}`,
          );
        }
        const { parameters } = endpoint;
        if (!parameters) {
          return config;
        }
        const conf = {
          ...config,
          queries: {
            ...config.queries,
          },
          headers: {
            ...config.headers,
          },
          params: {
            ...config.params,
          },
        };
        const paramsOf = {
          Query: (name: string) => conf.queries?.[name],
          Body: (_: string) => conf.body,
          Header: (name: string) => conf.headers?.[name],
          Path: (name: string) => conf.params?.[name],
        };
        const setParamsOf = {
          Query: (name: string, value: unknown) => {
            conf.queries[name] = value;
          },
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          Body: (_: string, value: any) => {
            conf.body = value;
          },
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          Header: (name: string, value: any) => {
            conf.headers[name] = value;
          },
          Path: (name: string, value: unknown) => {
            conf.params[name] = value;
          },
        };
        const transformRequest = shouldRequest(transform);
        for (const parameter of parameters) {
          const { name, schema, type } = parameter;
          const value = paramsOf[type](name);
          if (sendDefaults || value !== undefined) {
            const parsed = await schema.safeParseAsync(value);
            if (!parsed.success) {
              throw new Error(`Zodified: Invalid ${type} parameter '${name}'`);
            }
            if (transformRequest) {
              setParamsOf[type](name, parsed.data);
            }
          }
        }
        return conf;
      }
    : undefined,
  response: shouldResponse(validate)
    ? async (api, config, response) => {
        const endpoint = findEndpoint(api, config.method, config.url);
        if (!endpoint) {
          throw new Error(
            `No endpoint found for ${config.method} ${config.url}`,
          );
        }
        if (
          response.headers.get("content-type")?.includes("application/json") ||
          response.headers
            .get("content-type")
            ?.includes("application/vnd.api+json")
        ) {
          const body = await response.json();
          response.parsedBody = body;
          const parsed = await endpoint.response.safeParseAsync(body);
          if (!parsed.success) {
            throw new Error(
              `Zodified: Invalid response from endpoint '${endpoint.method} ${
                endpoint.path
              }'\nstatus: ${response.status} ${
                response.statusText
              }\ncause:\n${parsed.error.message}`,
            );
          }
          if (shouldResponse(transform)) {
            response.parsedBody = parsed.data;
          }
        }
        return response;
      }
    : undefined,
});
