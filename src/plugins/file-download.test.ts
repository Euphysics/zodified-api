import type {
  AnyZodifiedRequestOptions,
  ZodifiedEndpointDefinitions,
  ZodifiedResponse,
} from "@/types/zodified";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  LargeFileDownloadError,
  largeFileDownloadPlugin,
} from "./file-download";

// ArrayBufferLikeに対応するzodスキーマを定義
const ArrayBufferLikeSchema = z.union([
  z.instanceof(ArrayBuffer),
  z.instanceof(SharedArrayBuffer),
  z.instanceof(DataView),
]);

// 仮のZodifiedEndpointDefinitionsデータを定義
const mockApi: ZodifiedEndpointDefinitions = [
  {
    method: "get",
    path: "/download",
    alias: "downloadFile",
    parameters: [],
    response: ArrayBufferLikeSchema, // ArrayBufferLikeスキーマを使用
  },
];

describe("largeFileDownloadPlugin", () => {
  const mockHeaders = new Headers({
    "content-type": "application/octet-stream",
    "content-length": "1024",
  });

  const mockResponse = (
    body: ReadableStream<Uint8Array>,
    headers = mockHeaders,
  ): ZodifiedResponse =>
    ({
      headers,
      status: 200,
      statusText: "OK",
      body,
    }) as unknown as ZodifiedResponse;

  let onProgressMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onProgressMock = vi.fn();
  });

  it("should process the response and return a new response with the downloaded data", async () => {
    const plugin = largeFileDownloadPlugin({
      onProgress: onProgressMock,
    });

    const dataChunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of dataChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const response = mockResponse(body);

    const config: AnyZodifiedRequestOptions = {
      url: "/download",
      method: "get",
      headers: {},
    };

    const result = await plugin.response?.(mockApi, config, response);

    expect(result).toBeInstanceOf(Response);
    expect(onProgressMock).toHaveBeenCalledTimes(2);
    expect(
      ArrayBufferLikeSchema.safeParse((result as ZodifiedResponse).parsedBody)
        .success,
    ).toBe(true);
  });

  it("should throw LargeFileDownloadError if content-length is zero", async () => {
    const plugin = largeFileDownloadPlugin({});

    const response = mockResponse(
      new ReadableStream(),
      new Headers({
        "content-type": "application/octet-stream",
        "content-length": "0",
      }),
    );

    const config: AnyZodifiedRequestOptions = {
      url: "/download",
      method: "get",
      headers: {},
    };

    await expect(
      plugin.response?.(mockApi, config, response),
    ).rejects.toThrowError(LargeFileDownloadError);
  });

  it("should retry if an error occurs during reading", async () => {
    const plugin = largeFileDownloadPlugin({
      retryAttempts: 3,
      retryDelay: 100,
      onProgress: onProgressMock,
    });

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.error(new Error("Test Error"));
      },
    });

    const response = mockResponse(body);

    const config: AnyZodifiedRequestOptions = {
      url: "/download",
      method: "get",
      headers: {},
    };

    await expect(
      plugin.response?.(mockApi, config, response),
    ).rejects.toThrowError(LargeFileDownloadError);
  });

  it("should not process response if content-type is not octet-stream", async () => {
    const plugin = largeFileDownloadPlugin({});

    const response = mockResponse(
      new ReadableStream(),
      new Headers({
        "content-type": "text/plain",
        "content-length": "1024",
      }),
    );

    const config: AnyZodifiedRequestOptions = {
      url: "/download",
      method: "get",
      headers: {},
    };

    const result = await plugin.response?.(mockApi, config, response);

    expect(result).toEqual(response);
  });

  it("should throw LargeFileDownloadError if response body reader is not available", async () => {
    const plugin = largeFileDownloadPlugin({});

    const response = {
      headers: mockHeaders,
      status: 200,
      statusText: "OK",
      body: null, // No body, so no reader available
    } as unknown as ZodifiedResponse;

    const config: AnyZodifiedRequestOptions = {
      url: "/download",
      method: "get",
      headers: {},
    };

    await expect(
      plugin.response?.(mockApi, config, response),
    ).rejects.toThrowError(LargeFileDownloadError);
  });
});
