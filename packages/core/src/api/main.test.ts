import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type {
  ZodifiedEndpointDefinition,
  ZodifiedEndpointDefinitions,
  ZodifiedEndpointError,
  ZodifiedEndpointParameter,
} from "#core/types/zodified";
import {
  checkApi,
  findEndpointByAlias,
  findEndpointByMethodAndPath,
  makeApi,
  makeEndpoint,
  makeErrors,
  makeParameters,
  mergeApis,
  prefixApi,
} from "./main";

let mockApi: ZodifiedEndpointDefinitions;

beforeEach(() => {
  mockApi = [
    {
      method: "get",
      path: "/users",
      alias: "getUsers",
      parameters: [],
      response: z.object({ id: z.number() }),
    },
    {
      method: "post",
      path: "/users",
      alias: "createUser",
      parameters: [
        {
          name: "body",
          type: "Body",
          schema: z.object({ name: z.string() }),
        } as ZodifiedEndpointParameter,
      ],
      response: z.object({ id: z.number() }),
    },
  ];
});

describe("checkApi", () => {
  it("should not throw error for valid API", () => {
    expect(() => checkApi(mockApi)).not.toThrow();
  });

  it("should throw error for duplicate paths", () => {
    const invalidApi = [
      ...mockApi,
      {
        method: "get",
        path: "/users",
        alias: "getUsersAgain",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    // @ts-expect-error: Testing invalid API
    expect(() => checkApi(invalidApi)).toThrowError(
      "Zodified: Duplicate path 'get /users'",
    );
  });

  it("should throw error for duplicate aliases", () => {
    const invalidApi = [
      ...mockApi,
      {
        method: "get",
        path: "/anotherPath",
        alias: "getUsers",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    // @ts-expect-error: Testing invalid API
    expect(() => checkApi(invalidApi)).toThrowError(
      "Zodified: Duplicate alias 'getUsers'",
    );
  });

  it("should throw error for multiple body parameters", () => {
    const invalidApi = [
      {
        method: "post",
        path: "/users",
        alias: "createUser",
        parameters: [
          {
            name: "body1",
            type: "Body",
            schema: z.object({ name: z.string() }),
          } as ZodifiedEndpointParameter,
          {
            name: "body2",
            type: "Body",
            schema: z.object({ age: z.number() }),
          } as ZodifiedEndpointParameter,
        ],
        response: z.object({ id: z.number() }),
      },
    ];
    // @ts-expect-error: Testing invalid API
    expect(() => checkApi(invalidApi)).toThrowError(
      "Zodified: Multiple body parameters in endpoint '/users'",
    );
  });
});

describe("makeApi", () => {
  it("should return the same API definitions", () => {
    const result = makeApi(mockApi);
    expect(result).toEqual(mockApi);
  });
});

describe("makeParameters", () => {
  it("should return the same parameter definitions", () => {
    const parameters: ZodifiedEndpointParameter[] = [
      { name: "param1", type: "Query", schema: z.string() },
    ];
    const result = makeParameters(parameters);
    expect(result).toEqual(parameters);
  });
});

describe("makeErrors", () => {
  it("should return the same error definitions", () => {
    const errors: ZodifiedEndpointError[] = [
      {
        status: 400,
        description: "Bad Request",
        schema: z.object({ message: z.string() }),
      },
    ];
    const result = makeErrors(errors);
    expect(result).toEqual(errors);
  });
});

describe("makeEndpoint", () => {
  it("should return the same endpoint definition", () => {
    const endpoint: ZodifiedEndpointDefinition = {
      method: "get",
      path: "/test",
      alias: "testEndpoint",
      parameters: [],
      response: z.object({ id: z.number() }),
    };
    const result = makeEndpoint(endpoint);
    expect(result).toEqual(endpoint);
  });
});

describe("prefixApi", () => {
  it("should prefix all paths with the given prefix", () => {
    const prefixedApi = prefixApi("/api", mockApi);
    const expectedApi: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/api/users",
        alias: "getUsers",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
      {
        method: "post",
        path: "/api/users",
        alias: "createUser",
        parameters: [
          {
            name: "body",
            type: "Body",
            schema: z.object({ name: z.string() }),
          },
        ],
        response: z.object({ id: z.number() }),
      },
    ];

    // Strip the response schema for comparison
    const stripResponseAndParameters = (api: ZodifiedEndpointDefinitions) =>
      api.map(({ response, parameters, ...rest }) => rest);

    expect(stripResponseAndParameters(prefixedApi)).toEqual(
      stripResponseAndParameters(expectedApi),
    );
  });
});

describe("mergeApis", () => {
  it("should merge multiple APIs correctly", () => {
    const api1: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/users",
        alias: "getUsers",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    const api2: ZodifiedEndpointDefinitions = [
      {
        method: "post",
        path: "/posts",
        alias: "createPost",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    const mergedApi = mergeApis({
      "/api1": api1,
      "/api2": api2,
    });

    const expectedApi: ZodifiedEndpointDefinitions = [
      {
        method: "get",
        path: "/api1/users",
        alias: "getUsers",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
      {
        method: "post",
        path: "/api2/posts",
        alias: "createPost",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];

    // Strip the response schema for comparison
    const stripResponse = (api: ZodifiedEndpointDefinitions) =>
      api.map(({ response, ...rest }) => rest);

    expect(stripResponse(mergedApi)).toEqual(stripResponse(expectedApi));
  });
});

describe("findEndpointByAlias", () => {
  it("should find the endpoint by alias", () => {
    // @ts-expect-error: Testing error
    const endpoint = findEndpointByAlias(mockApi, "getUsers");
    expect(endpoint).toEqual(mockApi[0]);
  });

  it("should throw error if alias is not found", () => {
    // @ts-expect-error: Invalid alias
    expect(() => findEndpointByAlias(mockApi, "nonExistentAlias")).toThrowError(
      "Zodified: alias 'nonExistentAlias' not found",
    );
  });

  it("should throw error if alias is not unique", () => {
    const invalidApi = [
      ...mockApi,
      {
        method: "get",
        path: "/anotherPath",
        alias: "getUsers",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    // @ts-expect-error: Testing invalid API
    expect(() => findEndpointByAlias(invalidApi, "getUsers")).toThrowError(
      "Zodified: alias 'getUsers' is not unique",
    );
  });
});

describe("findEndpointByMethodAndPath", () => {
  it("should find the endpoint by method and path", () => {
    // @ts-expect-error: Testing error
    const endpoint = findEndpointByMethodAndPath(mockApi, "get", "/users");
    expect(endpoint).toEqual(mockApi[0]);
  });

  it("should throw error if method and path combination is not found", () => {
    expect(() =>
      // @ts-expect-error: Invalid path
      findEndpointByMethodAndPath(mockApi, "post", "/nonexistent"),
    ).toThrowError("Zodified: endpoint 'post /nonexistent' not found");
  });

  it("should throw error if method and path combination is not unique", () => {
    const invalidApi = [
      ...mockApi,
      {
        method: "get",
        path: "/users",
        alias: "getUsersAgain",
        parameters: [],
        response: z.object({ id: z.number() }),
      },
    ];
    expect(() =>
      // @ts-expect-error: Testing invalid API
      findEndpointByMethodAndPath(invalidApi, "get", "/users"),
    ).toThrowError("Zodified: endpoint 'get /users' is not unique");
  });
});
