import type {
  AnyZodifiedRequestOptions,
  ZodifiedEndpointDefinitions,
  ZodifiedPlugin,
  ZodifiedResponse,
} from "@/types";

interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  progress: number;
}

export class LargeFileDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LargeFileDownloadError";
  }
}

export const largeFileDownloadPlugin = (options: {
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: DownloadProgress) => void;
}): ZodifiedPlugin => {
  const { retryAttempts = 3, retryDelay = 1000, onProgress } = options;

  return {
    async response(
      _api: ZodifiedEndpointDefinitions,
      _config: AnyZodifiedRequestOptions,
      response: ZodifiedResponse,
    ): Promise<ZodifiedResponse> {
      if (
        !response.headers
          .get("content-type")
          ?.includes("application/octet-stream")
      ) {
        return response;
      }

      const contentLength = Number.parseInt(
        response.headers.get("content-length") || "0",
        10,
      );

      if (contentLength === 0) {
        throw new LargeFileDownloadError("Content length is missing or zero");
      }

      let downloadedBytes = 0;
      let currentAttempt = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new LargeFileDownloadError(
          "Failed to get reader from response body",
        );
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          downloadedBytes += value.length;

          if (onProgress) {
            onProgress({
              totalBytes: contentLength,
              downloadedBytes,
              progress: (downloadedBytes / contentLength) * 100,
            });
          }

          currentAttempt = 0; // Reset attempt counter on successful read
        } catch (error) {
          currentAttempt++;

          if (currentAttempt > retryAttempts) {
            throw new LargeFileDownloadError("Max retry attempts reached");
          }

          console.warn(
            `Download attempt ${currentAttempt} failed. Retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      const concatenated = new Uint8Array(downloadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, offset);
        offset += chunk.length;
      }

      // Create a new ReadableStream from the concatenated data
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(concatenated);
          controller.close();
        },
      });

      // Create a new Response object with the stream
      const newResponse = new Response(stream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });

      // Add the parsed body to the response
      (newResponse as ZodifiedResponse).parsedBody = concatenated.buffer;

      return newResponse as ZodifiedResponse;
    },
  };
};
