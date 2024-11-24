import type { ReadonlyDeep } from "@/types/utils";
import type {
  AnyZodifiedRequestOptions,
  MockData,
  ZodifiedEndpointDefinitions,
  ZodifiedResponse,
} from "@/types/zodified";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mockPlugin } from "./mock";

describe("mockPlugin", () => {
  const mockApi: ZodifiedEndpointDefinitions = [
    {
      method: "get",
      path: "/users",
      alias: "getUsers",
      parameters: [],
      response: z.array(z.object({ id: z.number(), name: z.string() })),
    },
    {
      method: "post",
      path: "/users",
      alias: "createUser",
      parameters: [],
      response: z.object({ id: z.number(), name: z.string() }),
    },
  ];

  const mockData: MockData<typeof mockApi> = {
    get: {
      "/users": {
        response: [{ id: 1, name: "John Doe" }],
      },
    },
    post: {
      "/users": {
        response: { id: 2, name: "Jane Doe" },
        status: 201,
      },
    },
  };

  it("should return mock GET response", async () => {
    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const result = await plugin.request?.(mockApi, config);

    expect(result?.mockResponse).toBeInstanceOf(Response);
    const jsonResponse = await result?.mockResponse?.json();
    expect(jsonResponse).toEqual([{ id: 1, name: "John Doe" }]);
  });

  it("should return mock POST response with correct status", async () => {
    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "post",
      url: "/users",
      headers: {},
    };

    const result = await plugin.request?.(mockApi, config);

    expect(result?.mockResponse).toBeInstanceOf(Response);
    const jsonResponse = await result?.mockResponse?.json();
    expect(jsonResponse).toEqual({ id: 2, name: "Jane Doe" });
    expect(result?.mockResponse?.status).toBe(201);
  });

  it("should handle no matching mock data", async () => {
    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "delete",
      url: "/users/1",
      headers: {},
    };

    const result = await plugin.request?.(mockApi, config);

    expect(result?.mockResponse).toBeUndefined();
  });

  it("should simulate delay", async () => {
    const delay = 100; // 100ms delay
    const plugin = mockPlugin(mockData, delay);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const start = Date.now();
    await plugin.request?.(mockApi, config);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(delay);
  });

  it("should return mock response if present", async () => {
    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
      mockResponse: new Response(
        JSON.stringify([{ id: 1, name: "John Doe" }]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ) as ZodifiedResponse,
    };

    const response = new Response("This is not the mock response", {
      status: 500,
    }) as ZodifiedResponse;

    const result = await plugin.response?.(mockApi, config, response);

    expect(result).toBe(config.mockResponse);
    const jsonResponse = await result?.json();
    expect(jsonResponse).toEqual([{ id: 1, name: "John Doe" }]);
  });

  it("should return original response if mockResponse is not present", async () => {
    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const originalResponse = new Response("This is the original response", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }) as ZodifiedResponse;

    const result = await plugin.response?.(mockApi, config, originalResponse);

    expect(result).toBe(originalResponse);
    const textResponse = await result?.text();
    expect(textResponse).toBe("This is the original response");
  });

  it("should call response function and return its value", async () => {
    const mockResponseFunction = vi
      .fn()
      .mockReturnValue([{ id: 1, name: "John Doe" }]);

    const mockData: MockData<typeof mockApi> = {
      get: {
        "/dynamic": {
          response: mockResponseFunction,
        },
      },
    };

    const plugin = mockPlugin(mockData);
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/dynamic",
      headers: {},
    };

    const result = await plugin.request?.(mockApi, config);

    expect(mockResponseFunction).toHaveBeenCalled();
    expect(result?.mockResponse).toBeInstanceOf(Response);

    const jsonResponse = await result?.mockResponse?.json();
    expect(jsonResponse).toEqual([{ id: 1, name: "John Doe" }]);
  });
});
