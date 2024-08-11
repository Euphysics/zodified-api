import { ApiError } from "@/error";
import type {
  ApiConfig,
  ApiEndpoint,
  GenericRequest,
  GenericResponse,
  Handler,
  Middleware,
} from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GenericApiServer } from "./generic";

// Define mock types for the test
interface TestRequest extends GenericRequest {}
interface TestResponse extends GenericResponse {
  status(code: number): this;
  json(data: unknown): void;
}

// Test data
const testQuerySchema = z.object({ id: z.string() });
const testBodySchema = z.object({ name: z.string() });
const testResponseSchema = z.object({ success: z.boolean() });

const apiConfig: ApiConfig<Record<string, ApiEndpoint>> = {
  baseUrl: "/api",
  endpoints: {
    testEndpoint: {
      method: "POST",
      url: "/test",
      authRequired: false,
      requestQuerySchema: testQuerySchema,
      requestBodySchema: testBodySchema,
      responseBodySchema: testResponseSchema,
    },
  },
};

// Mock response object
const createResponse = (): TestResponse => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe("GenericApiServer", () => {
  let server: GenericApiServer<typeof apiConfig>;
  let req: TestRequest;
  let res: TestResponse;

  beforeEach(() => {
    server = new GenericApiServer(apiConfig);
    req = {
      method: "POST",
      url: "/test",
      headers: {},
      query: { id: "123" },
      body: { name: "Test" },
    } as TestRequest;
    res = createResponse();
  });

  it("should return 405 for incorrect HTTP methods", async () => {
    req.method = "GET"; // Incorrect method

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle valid requests and call the handler", async () => {
    const handler: Handler<
      z.infer<typeof testQuerySchema>,
      z.infer<typeof testBodySchema>,
      z.infer<typeof testResponseSchema>,
      TestRequest,
      TestResponse
    > = vi.fn().mockResolvedValue({ success: true });

    // @ts-expect-error
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(handler).toHaveBeenCalledWith(
      { ...req, parsedQuery: { id: "123" }, parsedBody: { name: "Test" } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should return 400 for invalid query parameters", async () => {
    // @ts-expect-error: Invalid type test
    req.query = { id: 123 }; // Invalid type

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid request bodies", async () => {
    req.body = { name: 123 }; // Invalid type

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("should return 500 if response validation fails", async () => {
    const handler: Handler<
      z.infer<typeof testQuerySchema>,
      z.infer<typeof testBodySchema>,
      // biome-ignore lint/suspicious/noExplicitAny: Test case
      any,
      TestRequest,
      TestResponse
    > = vi.fn().mockResolvedValue({ success: "not a boolean" }); // Invalid response

    // @ts-expect-error: Invalid response type
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("should handle ApiError correctly", async () => {
    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn().mockRejectedValue(new ApiError(404, "Not Found"));

    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Request failed" });
  });

  it("should handle unexpected errors correctly", async () => {
    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn().mockRejectedValue(new Error("Unexpected Error"));

    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});

describe("GenericApiServer with Middleware", () => {
  let server: GenericApiServer<typeof apiConfig>;
  let req: TestRequest;
  let res: TestResponse;

  beforeEach(() => {
    server = new GenericApiServer(apiConfig);
    req = {
      method: "POST",
      url: "/test",
      headers: {},
      query: { id: "123" },
      body: { name: "Test" },
    } as TestRequest;
    res = createResponse();
  });

  it("should execute middleware and modify request", async () => {
    const middleware: Middleware<TestRequest, TestResponse> = vi.fn(
      (req, _, next) => {
        req.query.id = "456"; // Modify the request
        next();
      },
    );

    server.use(middleware);

    const handler: Handler<
      z.infer<typeof testQuerySchema>,
      z.infer<typeof testBodySchema>,
      z.infer<typeof testResponseSchema>,
      TestRequest,
      TestResponse
    > = vi.fn().mockResolvedValue({ success: true });

    // @ts-expect-error
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(middleware).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(
      { ...req, parsedQuery: { id: "456" }, parsedBody: { name: "Test" } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should stop execution if middleware does not call next()", async () => {
    const middleware: Middleware<TestRequest, TestResponse> = vi.fn(
      (_, res, __) => {
        res.status(401).json({ error: "Unauthorized" });
        // next() is not called, so handler should not execute
      },
    );

    server.use(middleware);

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(middleware).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("should execute multiple middlewares in order", async () => {
    const middleware1: Middleware<TestRequest, TestResponse> = vi.fn(
      (req, _, next) => {
        req.query.id = "modified-by-mw1";
        next();
      },
    );

    const middleware2: Middleware<TestRequest, TestResponse> = vi.fn(
      (req, _, next) => {
        req.body.name = "modified-by-mw2";
        next();
      },
    );

    server.use(middleware1);
    server.use(middleware2);

    const handler: Handler<
      z.infer<typeof testQuerySchema>,
      z.infer<typeof testBodySchema>,
      z.infer<typeof testResponseSchema>,
      TestRequest,
      TestResponse
    > = vi.fn().mockResolvedValue({ success: true });

    // @ts-expect-error
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(
      {
        ...req,
        parsedQuery: { id: "modified-by-mw1" },
        parsedBody: { name: "modified-by-mw2" },
      },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should handle errors thrown in middleware", async () => {
    const middleware: Middleware<TestRequest, TestResponse> = vi.fn(() => {
      throw new Error("Middleware error");
    });

    server.use(middleware);

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(middleware).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(handler).not.toHaveBeenCalled();
  });
});
