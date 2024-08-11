import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "./main";

describe("ApiError", () => {
  it("should create an instance of ApiError with the correct status and message", () => {
    const error = new ApiError(404, "Not Found");

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not Found");
    expect(error.name).toBe("ApiError");
  });

  it("should handle non-standard status codes and empty messages", () => {
    const error = new ApiError(999, "");

    expect(error.status).toBe(999);
    expect(error.message).toBe("");
  });

  it("should have the correct prototype chain", () => {
    const error = new ApiError(500, "Server Error");

    expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype);
  });
});

describe("NetworkError", () => {
  it("should create an instance of NetworkError with the correct message", () => {
    const error = new NetworkError("Network is down");

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Network is down");
    expect(error.name).toBe("NetworkError");
  });

  it("should handle empty error messages", () => {
    const error = new NetworkError("");

    expect(error.message).toBe("");
  });

  it("should have the correct prototype chain", () => {
    const error = new NetworkError("Request failed");

    expect(Object.getPrototypeOf(error)).toBe(NetworkError.prototype);
  });
});
