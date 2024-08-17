import { describe, expect, it } from "vitest";
import { formURLPlugin } from "./form-url";

describe("formURLPlugin", () => {
  const plugin = formURLPlugin();

  it("should throw an error if body is not an object", async () => {
    const config = {
      body: "string",
      headers: {},
    };

    // @ts-expect-error: Testing invalid body
    await expect(plugin.request?.({}, config)).rejects.toThrowError(
      "Zodified: application/x-www-form-urlencoded body must be an object",
    );
  });

  it("should throw an error if body is an array", async () => {
    const config = {
      body: ["array"],
      headers: {},
    };

    // @ts-expect-error: Testing invalid body
    await expect(plugin.request?.({}, config)).rejects.toThrowError(
      "Zodified: application/x-www-form-urlencoded body must be an object",
    );
  });

  it("should transform object body to URLSearchParams", async () => {
    const mockBody = {
      userName: "user",
      password: "password",
    };

    const config = {
      body: mockBody,
      headers: {},
    };

    // @ts-expect-error: Testing valid body
    const result = await plugin.request?.({}, config);

    expect(result).toEqual({
      ...config,
      data: new URLSearchParams(mockBody).toString(),
      headers: {
        ...config.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  });
});
