import type {
  AnyZodifiedRequestOptions,
  ReadonlyDeep,
  ZodifiedEndpointDefinitions,
  ZodifiedOptions,
  ZodifiedResponse,
} from "@/types";
import { findEndpoint } from "@/utils";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { zodValidationPlugin } from "./zod-validation";

vi.mock("@/utils", () => ({
  findEndpoint: vi.fn(),
}));

describe("zodValidationPlugin", () => {
  const mockApi: ZodifiedEndpointDefinitions = [
    {
      method: "get",
      path: "/users",
      alias: "getUsers",
      parameters: [{ name: "id", type: "Query", schema: z.number() }],
      response: z.array(z.object({ id: z.number(), name: z.string() })),
    },
  ];

  const options: ZodifiedOptions = {
    validate: "all",
    transform: "request",
    sendDefaults: false,
  };

  it("should validate and transform request parameters", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      queries: { id: 1 }, // id should be a number, not a string
      headers: {},
      params: {},
    };

    const transformedConfig = await plugin.request?.(mockApi, config);

    expect(mockFindEndpoint).toHaveBeenCalledWith(mockApi, "get", "/users");
    expect(transformedConfig?.queries?.id).toBe(1); // id should be transformed to a number
  });

  it("should throw an error if request validation fails", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      queries: { id: "invalid" }, // id should be a number
      headers: {},
      params: {},
    };

    await expect(plugin.request?.(mockApi, config)).rejects.toThrowError(
      "Zodified: Invalid Query parameter 'id'",
    );
  });

  it("should validate and transform response body", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const response = new Response(
      JSON.stringify([{ id: 1, name: "John Doe" }]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ) as ZodifiedResponse;

    const transformedResponse = await plugin.response?.(
      mockApi,
      config,
      response,
    );

    expect(mockFindEndpoint).toHaveBeenCalledWith(mockApi, "get", "/users");
    expect(transformedResponse?.parsedBody).toEqual([
      { id: 1, name: "John Doe" },
    ]);
  });

  it("should throw an error if response validation fails", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const response = new Response(
      JSON.stringify([{ id: "invalid", name: "John Doe" }]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ) as ZodifiedResponse;

    await expect(
      plugin.response?.(mockApi, config, response),
    ).rejects.toThrowError(
      "Zodified: Invalid response from endpoint 'get /users'",
    );
  });

  it("should throw error if endpoint is not found", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(undefined);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/unknown",
      queries: { id: "1" },
      headers: {},
      params: {},
    };

    await expect(plugin.request?.(mockApi, config)).rejects.toThrowError(
      "No endpoint found for get /unknown",
    );
  });

  it("should handle non-JSON response gracefully", async () => {
    // @ts-expect-error: Testing invalid options
    const plugin = zodValidationPlugin(options);
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const response = new Response("Non-JSON response", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }) as ZodifiedResponse;

    const result = await plugin.response?.(mockApi, config, response);
    expect(result).toBe(response);
  });

  it("should skip transformation if not requested", async () => {
    const plugin = zodValidationPlugin({
      validate: true,
      transform: false,
      sendDefaults: false,
    });
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      queries: { id: 1 },
      headers: {},
      params: {},
    };

    const transformedConfig = await plugin.request?.(mockApi, config);

    expect(mockFindEndpoint).toHaveBeenCalledWith(mockApi, "get", "/users");
    expect(transformedConfig?.queries?.id).toBe(1); // 変換されないべき
  });

  it("should handle response transform when enabled", async () => {
    const plugin = zodValidationPlugin({
      validate: true,
      transform: true,
      sendDefaults: false,
    });
    const mockFindEndpoint = vi.mocked(findEndpoint);
    mockFindEndpoint.mockReturnValueOnce(mockApi[0]);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/users",
      headers: {},
    };

    const response = new Response(
      JSON.stringify([{ id: 1, name: "John Doe" }]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ) as ZodifiedResponse;

    const transformedResponse = await plugin.response?.(
      mockApi,
      config,
      response,
    );

    expect(transformedResponse?.parsedBody).toEqual([
      { id: 1, name: "John Doe" },
    ]);
  });
});
