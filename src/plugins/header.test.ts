import { describe, expect, it } from "vitest";
import { z } from "zod";
import { headerPlugin } from "./header";

import type {
  AnyZodifiedRequestOptions,
  ReadonlyDeep,
  ZodifiedEndpointDefinitions,
} from "@/types";

// 仮のZodifiedEndpointDefinitionsデータを定義
const mockApi: ZodifiedEndpointDefinitions = [
  {
    method: "get",
    path: "/example",
    alias: "getExample",
    parameters: [],
    response: z.object({
      message: z.string(),
    }),
  },
];

describe("headerPlugin", () => {
  it("should add the specified header to the request", async () => {
    const key = "X-Custom-Header";
    const value = "customValue";
    const plugin = headerPlugin(key, value);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      headers: {},
      url: "/example",
      method: "get",
    };

    const result = await plugin.request?.(mockApi, config); // mockApiを渡す

    expect(result).toEqual({
      ...config,
      headers: {
        [key]: value,
      },
    });
  });

  it("should not overwrite existing headers", async () => {
    const key = "X-Custom-Header";
    const value = "customValue";
    const plugin = headerPlugin(key, value);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      headers: {
        "Existing-Header": "existingValue",
      },
      url: "/example",
      method: "get",
    };

    const result = await plugin.request?.(mockApi, config); // mockApiを渡す

    expect(result).toEqual({
      ...config,
      headers: {
        "Existing-Header": "existingValue",
        [key]: value,
      },
    });
  });

  it("should overwrite the header if the key already exists", async () => {
    const key = "X-Custom-Header";
    const value = "customValue";
    const plugin = headerPlugin(key, value);

    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      headers: {
        "X-Custom-Header": "oldValue",
      },
      url: "/example",
      method: "get",
    };

    const result = await plugin.request?.(mockApi, config); // mockApiを渡す

    expect(result).toEqual({
      ...config,
      headers: {
        "X-Custom-Header": value,
      },
    });
  });
});
