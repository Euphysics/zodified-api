import type {
  AnyZodifiedRequestOptions,
  ZodifiedEndpointDefinition,
  ZodifiedEndpointDefinitions,
} from "@/types";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  capitalize,
  findEndpoint,
  findEndpointByAlias,
  findEndpointErrors,
  findEndpointErrorsByAlias,
  findEndpointErrorsByPath,
  omit,
  pathMatchesUrl,
  pick,
  replacePathParams,
  replaceQueryParams,
} from "./utils";

describe("Utils functions", () => {
  describe("omit", () => {
    it("should omit specified properties", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ["b"]);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should return the original object if keys are not found", () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ["c" as keyof typeof obj]);
      expect(result).toEqual(obj);
    });

    it("should handle undefined object", () => {
      // @ts-expect-error: intentionally passing undefined
      const result = omit(undefined, ["a"]);
      expect(result).toEqual({});
    });
  });

  describe("pick", () => {
    it("should pick specified properties", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ["a", "c"]);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should return an empty object if keys are not found", () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ["c" as keyof typeof obj]);
      expect(result).toEqual({});
    });

    it("should handle undefined object", () => {
      // @ts-expect-error: intentionally passing undefined
      const result = pick(undefined, ["a"]);
      expect(result).toEqual({});
    });
  });

  describe("capitalize", () => {
    it("should capitalize the first letter of the string", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("should handle an empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("should not change already capitalized string", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });

    it("should handle single character string", () => {
      expect(capitalize("h")).toBe("H");
    });
  });

  describe("replaceQueryParams", () => {
    it("should replace query parameters in the URL", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test",
        method: "get",
        queries: { a: "1", b: "2" },
      };
      const result = replaceQueryParams(config);
      expect(result).toBe("/test?a=1&b=2");
    });

    it("should encode query parameters correctly", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test",
        method: "get",
        queries: { "a b": "c d", e: "f&g" },
      };
      const result = replaceQueryParams(config);
      expect(result).toBe("/test?a%20b=c%20d&e=f%26g");
    });

    it("should return the original URL if no queries are provided", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test",
        method: "get",
      };
      const result = replaceQueryParams(config);
      expect(result).toBe("/test");
    });

    it("should handle empty queries object", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test",
        method: "get",
        queries: {},
      };
      const result = replaceQueryParams(config);
      expect(result).toBe("/test");
    });
  });

  describe("replacePathParams", () => {
    it("should replace path parameters in the URL", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test/:id/:name",
        method: "get",
        params: { id: "123", name: "john" },
      };
      const result = replacePathParams(config);
      expect(result).toBe("/test/123/john");
    });

    it("should leave unmatched params intact", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test/:id/:name",
        method: "get",
        params: { id: "123" },
      };
      const result = replacePathParams(config);
      expect(result).toBe("/test/123/:name");
    });

    it("should return the original URL if no params are provided", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test/:id",
        method: "get",
      };
      const result = replacePathParams(config);
      expect(result).toBe("/test/:id");
    });

    it("should handle URLs without params", () => {
      const config: AnyZodifiedRequestOptions = {
        url: "/test",
        method: "get",
        params: { id: "123" },
      };
      const result = replacePathParams(config);
      expect(result).toBe("/test");
    });
  });

  describe("findEndpoint", () => {
    const api: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/test",
        alias: "getTest",
        parameters: [],
        response: z.object({ message: z.string() }),
        errors: [],
      },
      {
        method: "post",
        path: "/test",
        alias: "postTest",
        parameters: [],
        response: z.object({ success: z.boolean() }),
        errors: [],
      },
    ];

    it("should find an endpoint by method and path", () => {
      const result = findEndpoint(api, "get", "/test");
      expect(result).toEqual(api[0]);
    });

    it("should return undefined if no endpoint matches", () => {
      const result = findEndpoint(api, "delete", "/test");
      expect(result).toBeUndefined();
    });

    it("should handle multiple endpoints with same path but different methods", () => {
      const result = findEndpoint(api, "post", "/test");
      expect(result).toEqual(api[1]);
    });
  });

  describe("findEndpointByAlias", () => {
    const api: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/test",
        alias: "getTest",
        parameters: [],
        response: z.object({ message: z.string() }),
        errors: [],
      },
      {
        method: "post",
        path: "/test",
        alias: "postTest",
        parameters: [],
        response: z.object({ success: z.boolean() }),
        errors: [],
      },
    ];

    it("should find an endpoint by alias", () => {
      const result = findEndpointByAlias(api, "postTest");
      expect(result).toEqual(api[1]);
    });

    it("should return undefined if no endpoint matches the alias", () => {
      const result = findEndpointByAlias(api, "unknownAlias");
      expect(result).toBeUndefined();
    });
  });

  describe("findEndpointErrors", () => {
    const errorSchema = z.object({ error: z.string() });
    const endpoint: ZodifiedEndpointDefinition = {
      method: "get",
      path: "/test",
      alias: "getTest",
      parameters: [],
      response: z.object({ message: z.string() }),
      errors: [
        {
          status: 404,
          description: "Not Found",
          schema: errorSchema,
        },
        {
          status: 500,
          description: "Server Error",
          schema: errorSchema,
        },
        {
          status: "default",
          description: "Default Error",
          schema: errorSchema,
        },
      ],
    };

    it("should find matching errors by exact status code", () => {
      const result = findEndpointErrors(endpoint, 404);
      expect(result).toEqual([
        {
          status: 404,
          description: "Not Found",
          schema: errorSchema,
        },
      ]);
    });

    it("should return default errors if no matching status", () => {
      const result = findEndpointErrors(endpoint, 401);
      expect(result).toEqual([
        {
          status: "default",
          description: "Default Error",
          schema: errorSchema,
        },
      ]);
    });

    it("should return undefined if no errors are defined", () => {
      const endpointWithoutErrors: ZodifiedEndpointDefinition = {
        method: "get",
        path: "/test",
        alias: "getTest",
        parameters: [],
        response: z.object({ message: z.string() }),
        errors: [],
      };
      const result = findEndpointErrors(endpointWithoutErrors, 404);
      expect(result).toEqual([]);
    });
  });

  describe("findEndpointErrorsByPath", () => {
    const errorSchema = z.object({ error: z.string() });
    const api: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/test/:id",
        alias: "getTest",
        parameters: [],
        response: z.object({ message: z.string() }),
        errors: [
          {
            status: 404,
            description: "Not Found",
            schema: errorSchema,
          },
        ],
      },
    ];

    it("should find endpoint errors by method, path, and status", () => {
      const result = findEndpointErrorsByPath(
        api,
        "get",
        // @ts-expect-error: intentionally passing wrong type
        "/test/:id",
        404,
        "/test/123",
      );
      expect(result).toEqual([
        {
          status: 404,
          description: "Not Found",
          schema: errorSchema,
        },
      ]);
    });

    it("should return undefined if URL does not match the endpoint path", () => {
      const result = findEndpointErrorsByPath(
        api,
        "get",
        // @ts-expect-error: intentionally passing wrong type
        "/test/:id",
        404,
        "/different/123",
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined if no endpoint matches method and path", () => {
      const result = findEndpointErrorsByPath(
        api,
        "post",
        // @ts-expect-error: intentionally passing wrong type
        "/test/:id",
        404,
        "/test/123",
      );
      expect(result).toBeUndefined();
    });
  });

  describe("findEndpointErrorsByAlias", () => {
    const errorSchema = z.object({ error: z.string() });
    const api: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/test/:id",
        alias: "getTest",
        parameters: [],
        response: z.object({ message: z.string() }),
        errors: [
          {
            status: 404,
            description: "Not Found",
            schema: errorSchema,
          },
        ],
      },
    ];

    it("should find endpoint errors by alias and status", () => {
      const result = findEndpointErrorsByAlias(
        api,
        "getTest",
        404,
        "/test/123",
      );
      expect(result).toEqual([
        {
          status: 404,
          description: "Not Found",
          schema: errorSchema,
        },
      ]);
    });

    it("should return undefined if URL does not match the endpoint path", () => {
      const result = findEndpointErrorsByAlias(
        api,
        "getTest",
        404,
        "/different/123",
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined if no endpoint matches the alias", () => {
      const result = findEndpointErrorsByAlias(
        api,
        "unknownAlias",
        404,
        "/test/123",
      );
      expect(result).toBeUndefined();
    });
  });

  describe("pathMatchesUrl", () => {
    it("should return true if path matches the URL with parameters", () => {
      const result = pathMatchesUrl("/test/:id", "/test/123");
      expect(result).toBe(true);
    });

    it("should return false if path does not match the URL", () => {
      const result = pathMatchesUrl("/test/:id", "/different/123");
      expect(result).toBe(false);
    });

    it("should handle multiple parameters correctly", () => {
      const result = pathMatchesUrl(
        "/test/:id/details/:detailId",
        "/test/123/details/456",
      );
      expect(result).toBe(true);
    });

    it("should return false if number of segments do not match", () => {
      const result = pathMatchesUrl("/test/:id", "/test/123/extra");
      expect(result).toBe(false);
    });

    it("should handle paths without parameters", () => {
      const result = pathMatchesUrl("/test", "/test");
      expect(result).toBe(true);
    });
  });
});
