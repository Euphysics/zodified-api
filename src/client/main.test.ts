import { ApiError, NetworkError } from "@/error";
import type { ApiConfig, ApiEndpoint } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import setupFetchMock from "vitest-fetch-mock";
import { z } from "zod";
import { ApiClient } from "./main";

setupFetchMock(vi); // Set up fetch mock

describe("ApiClient", () => {
  // Define a simple response schema using Zod
  const getUserResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  const createUserResponseSchema = z.object({
    success: z.boolean(),
  });

  const apiConfig: ApiConfig<Record<string, ApiEndpoint>> = {
    baseUrl: "/api",
    endpoints: {
      getUser: {
        method: "GET",
        url: "/user",
        authRequired: true,
        responseBodySchema: getUserResponseSchema,
      },
      createUser: {
        method: "POST",
        url: "/user",
        authRequired: false,
        responseBodySchema: createUserResponseSchema,
      },
    },
  };

  const clientOptions = {
    baseUrl: "https://example.com",
    headers: {
      Authorization: "Bearer token",
    },
    onUnauthorized: vi.fn(),
    retryConfig: { count: 2, delay: 100 },
  };

  let apiClient: ApiClient<typeof apiConfig>;

  beforeEach(() => {
    apiClient = new ApiClient(apiConfig, clientOptions);
    vi.resetAllMocks(); // Reset all mocks before each test
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear all mocks after each test
  });

  it("should correctly set headers", async () => {
    // biome-ignore lint/complexity/useLiteralKeys: getHeaders is a private method
    const headers = await apiClient["getHeaders"](apiConfig.endpoints.getUser);
    expect(headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    });
  });

  it("should handle unauthorized errors and trigger onUnauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 401 }),
    );

    await expect(apiClient.request("getUser")).rejects.toThrow(ApiError);
    expect(clientOptions.onUnauthorized).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should retry on 5xx errors and succeed", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "1", name: "John Doe" }), {
          status: 200,
        }),
      );

    const response = await apiClient.request("getUser");
    expect(response).toEqual({ id: "1", name: "John Doe" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("should throw NetworkError after exceeding retries", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network failure"),
    );

    await expect(apiClient.request("getUser")).rejects.toThrow(NetworkError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });

  it("should throw NetworkError for unexpected errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );

    await expect(apiClient.request("getUser")).rejects.toThrow(NetworkError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("should correctly construct URL with query parameters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "1", name: "John Doe" }), {
        status: 200,
      }),
    );

    const response = await apiClient.request("getUser", {
      query: { id: "123" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com/api/user?id=123",
      expect.anything(),
    );
    expect(response).toEqual({ id: "1", name: "John Doe" });
  });

  it("should correctly send POST requests with a request body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const response = await apiClient.request("createUser", {
      body: { name: "John Doe" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com/api/user",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "John Doe" }),
      }),
    );
    expect(response).toEqual({ success: true });
  });

  it("should throw ApiError for non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );

    await expect(apiClient.request("getUser")).rejects.toThrow(ApiError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should use default options when no headers, onUnauthorized, or retryConfig are provided", async () => {
    const customApiClient = new ApiClient(apiConfig, {
      baseUrl: "https://example.com",
    });

    // biome-ignore lint/complexity/useLiteralKeys: getHeaders is a private method
    const headers = await customApiClient["getHeaders"](
      apiConfig.endpoints.getUser,
    );
    expect(headers).toEqual({
      "Content-Type": "application/json",
    });

    // biome-ignore lint/complexity/useLiteralKeys: options is a private property
    expect(customApiClient["options"].onUnauthorized).toBeInstanceOf(Function);

    // biome-ignore lint/complexity/useLiteralKeys: options is a private property
    expect(customApiClient["options"].retryConfig).toEqual({
      count: 3,
      delay: 1000,
    });
  });

  it("should throw NetworkError after retrying and encountering an unexpected error", async () => {
    const unexpectedError = new Error("Unexpected error");

    // biome-ignore lint/suspicious/noExplicitAny: Test case
    vi.spyOn(apiClient as any, "retryFetch").mockImplementationOnce(() => {
      throw unexpectedError;
    });

    await expect(apiClient.request("getUser")).rejects.toThrow(NetworkError);
  });
});
