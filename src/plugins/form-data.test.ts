import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataPlugin } from "./form-data";
import { getFormDataStream } from "./utils";

vi.mock("./utils", () => ({
  getFormDataStream: vi.fn(),
}));

describe("formDataPlugin", () => {
  const plugin = formDataPlugin();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw an error if body is not an object", async () => {
    const config = {
      body: "string",
      headers: {},
    };

    // @ts-expect-error: Testing invalid body
    await expect(plugin.request?.({}, config)).rejects.toThrowError(
      "Zodifieds: multipart/form-data body must be an object",
    );
  });

  it("should throw an error if body is an array", async () => {
    const config = {
      body: ["array"],
      headers: {},
    };

    // @ts-expect-error: Testing invalid body
    await expect(plugin.request?.({}, config)).rejects.toThrowError(
      "Zodifieds: multipart/form-data body must be an object",
    );
  });

  it("should transform object body to form-data", async () => {
    const mockBody = {
      field1: "value1",
      field2: new Blob(["test content"], { type: "text/plain" }),
    };

    const config = {
      body: mockBody,
      headers: {},
    };

    const getFormDataStreamMock = vi.mocked(getFormDataStream);
    getFormDataStreamMock.mockReturnValue({
      // @ts-expect-error: Testing valid body
      data: new Readable(),
    });

    // @ts-expect-error: Testing valid body
    const result = await plugin.request?.({}, config);

    expect(getFormDataStreamMock).toHaveBeenCalledWith(mockBody);
    expect(result).toEqual({
      ...config,
      data: expect.any(Readable),
      headers: config.headers,
    });
  });
});
