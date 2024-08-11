import type {
  ApiConfig,
  ApiEndpoint,
  GenericRequest,
  GenericResponse,
  Handler,
  Middleware,
} from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { AbstractApiServer } from "./abst";

// Define mock types for test purposes
interface TestRequest extends GenericRequest {}
interface TestResponse extends GenericResponse {
  status(code: number): this;
  json(data: unknown): void;
}

// Mock implementation of AbstractApiServer
class TestApiServer extends AbstractApiServer<
  ApiConfig<Record<string, ApiEndpoint>>,
  TestRequest,
  TestResponse
> {
  handle<T extends keyof ApiConfig<Record<string, ApiEndpoint>>["endpoints"]>(
    _endpointKey: T,
    handler: Handler<
      z.infer<
        NonNullable<
          ApiConfig<
            Record<string, ApiEndpoint>
          >["endpoints"][T]["requestQuerySchema"]
        >
      >,
      z.infer<
        NonNullable<
          ApiConfig<
            Record<string, ApiEndpoint>
          >["endpoints"][T]["requestBodySchema"]
        >
      >,
      z.infer<
        NonNullable<
          ApiConfig<
            Record<string, ApiEndpoint>
          >["endpoints"][T]["responseBodySchema"]
        >
      >,
      TestRequest,
      TestResponse
    >,
  ): (req: TestRequest, res: TestResponse) => Promise<void> {
    return async (req, res) => {
      // Simulate middleware execution
      for (const middleware of this.middlewares) {
        await middleware(req, res, () => {});
      }
      // Call the handler
      // biome-ignore lint/suspicious/noExplicitAny: This is a mock implementation
      await handler(req as any, res);
    };
  }
}

// Test data
const apiConfig: ApiConfig<Record<string, ApiEndpoint>> = {
  baseUrl: "/api",
  endpoints: {
    testEndpoint: {
      method: "GET",
      url: "/test",
      authRequired: false,
      // biome-ignore lint/suspicious/noExplicitAny: This is a mock implementation
      responseBodySchema: {} as z.ZodType<any>, // Dummy schema for the test
    },
  },
};

describe("AbstractApiServer", () => {
  let server: TestApiServer;

  beforeEach(() => {
    server = new TestApiServer(apiConfig);
  });

  it("should add middleware correctly", () => {
    const middleware: Middleware<TestRequest, TestResponse> = vi.fn();

    server.use(middleware);
    // biome-ignore lint/complexity/useLiteralKeys: middleware is a private property
    expect(server["middlewares"].has(middleware)).toBe(true);
  });

  it("should remove middleware correctly", () => {
    const middleware: Middleware<TestRequest, TestResponse> = vi.fn();

    server.use(middleware);
    server.removeMiddleware(middleware);
    // biome-ignore lint/complexity/useLiteralKeys: middleware is a private property
    expect(server["middlewares"].has(middleware)).toBe(false);
  });

  it("should execute middleware in correct order", async () => {
    const req = {} as TestRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as TestResponse;
    const middleware1 = vi.fn(
      (_req: TestRequest, res: TestResponse, next: () => void) => {
        res.status(200);
        next();
      },
    );
    const middleware2 = vi.fn(
      (_req: TestRequest, res: TestResponse, next: () => void) => {
        res.json({ success: true });
        next();
      },
    );

    server.use(middleware1);
    server.use(middleware2);

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();

    const endpointHandler = server.handle("testEndpoint", handler);
    await endpointHandler(req, res);

    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should call the handler after executing middlewares", async () => {
    const req = {} as TestRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as TestResponse;

    const middleware = vi.fn(
      (_req: TestRequest, _res: TestResponse, next: () => void) => next(),
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

    expect(handler).toHaveBeenCalledWith(req, res);
  });

  it("should handle scenarios where no middleware is present", async () => {
    const req = {} as TestRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as TestResponse;

    const handler: Handler<
      unknown,
      unknown,
      unknown,
      TestRequest,
      TestResponse
    > = vi.fn();
    const endpointHandler = server.handle("testEndpoint", handler);

    await endpointHandler(req, res);

    expect(handler).toHaveBeenCalledWith(req, res);
  });
});
