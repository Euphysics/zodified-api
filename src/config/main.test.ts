import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type EndpointConfig, createApiConfig } from "./main";

describe("createApiConfig", () => {
  const baseUrl = "/api";

  const endpoints = {
    getUser: {
      method: "GET",
      path: "/users/:id",
      auth: true,
      query: z.object({
        includePosts: z.boolean().optional(),
      }),
      request: undefined,
      response: z.object({
        id: z.string(),
        name: z.string(),
      }),
    } as EndpointConfig,
    createUser: {
      method: "POST",
      path: "/users",
      auth: false,
      headers: {
        "Content-Type": "application/json",
      },
      query: undefined,
      request: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      response: z.object({
        id: z.string(),
      }),
    } as EndpointConfig,
  };

  it("should create a valid ApiConfig object", () => {
    const apiConfig = createApiConfig(baseUrl, endpoints);

    expect(apiConfig).toBeDefined();
    expect(apiConfig.baseUrl).toBe(baseUrl);
    expect(apiConfig.endpoints).toHaveProperty("getUser");
    expect(apiConfig.endpoints).toHaveProperty("createUser");

    const getUserEndpoint = apiConfig.endpoints.getUser;
    expect(getUserEndpoint.method).toBe("GET");
    expect(getUserEndpoint.url).toBe("/users/:id");
    expect(getUserEndpoint.authRequired).toBe(true);
    expect(getUserEndpoint.requestQuerySchema).toBe(endpoints.getUser.query);
    expect(getUserEndpoint.requestBodySchema).toBeUndefined();
    expect(getUserEndpoint.responseBodySchema).toBe(endpoints.getUser.response);

    const createUserEndpoint = apiConfig.endpoints.createUser;
    expect(createUserEndpoint.method).toBe("POST");
    expect(createUserEndpoint.url).toBe("/users");
    expect(createUserEndpoint.authRequired).toBe(false);
    expect(createUserEndpoint.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(createUserEndpoint.requestQuerySchema).toBeUndefined();
    expect(createUserEndpoint.requestBodySchema).toBe(
      endpoints.createUser.request,
    );
    expect(createUserEndpoint.responseBodySchema).toBe(
      endpoints.createUser.response,
    );
  });

  it("should handle endpoints without auth, headers, query, and request", () => {
    const apiConfig = createApiConfig(baseUrl, {
      simpleGet: {
        method: "GET",
        path: "/simple",
        response: z.object({ success: z.boolean() }),
      },
    });

    const simpleGetEndpoint = apiConfig.endpoints.simpleGet;
    expect(simpleGetEndpoint.authRequired).toBe(false);
    expect(simpleGetEndpoint.headers).toBeUndefined();
    expect(simpleGetEndpoint.requestQuerySchema).toBeUndefined();
    expect(simpleGetEndpoint.requestBodySchema).toBeUndefined();
    expect(simpleGetEndpoint.responseBodySchema).toBeDefined();
  });

  it("should throw an error if an endpoint has an invalid schema", () => {
    expect(() =>
      createApiConfig(baseUrl, {
        invalidEndpoint: {
          method: "GET",
          path: "/invalid",
          // @ts-expect-error: invalid schema for testing
          response: z.object({ invalid: z.invalid() }),
        },
      }),
    ).toThrowError();
  });
});
