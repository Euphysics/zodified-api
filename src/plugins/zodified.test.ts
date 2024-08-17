import type {
  AnyZodifiedRequestOptions,
  ReadonlyDeep,
  ZodifiedEndpointDefinitions,
  ZodifiedPlugin,
  ZodifiedResponse,
} from "@/types";
import { describe, expect, it, vi } from "vitest";
import { type PluginId, ZodifiedPlugins } from "./zodified";

describe("ZodifiedPlugins", () => {
  const createTestPlugin = (name?: string): ZodifiedPlugin => ({
    name,
    request: vi.fn(async (_, config) => config),
    response: vi.fn(async (_, __, response) => response),
  });

  it("should register and replace a plugin by name", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");
    const pluginB = createTestPlugin("pluginA");

    const idA = plugins.use(pluginA);
    expect(plugins.count()).toBe(1);

    const idB = plugins.use(pluginB);
    expect(plugins.count()).toBe(1);
    expect(idA.value).toBe(idB.value); // pluginA should be replaced by pluginB
  });

  it("should register plugins without a name", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin();
    const pluginB = createTestPlugin();

    const idA = plugins.use(pluginA);
    const idB = plugins.use(pluginB);

    expect(plugins.count()).toBe(2);
    expect(idA.value).not.toBe(idB.value); // different plugins should have different IDs
  });

  it("should unregister a plugin by name", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");

    plugins.use(pluginA);
    expect(plugins.count()).toBe(1);

    plugins.eject("pluginA");
    expect(plugins.count()).toBe(0);
  });

  it("should throw an error when trying to unregister a non-existent plugin by name", () => {
    const plugins = new ZodifiedPlugins("get", "/test");

    expect(() => plugins.eject("nonExistentPlugin")).toThrowError(
      "Plugin with name 'nonExistentPlugin' not found",
    );
  });

  it("should unregister a plugin by ID", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");

    const id = plugins.use(pluginA);
    expect(plugins.count()).toBe(1);

    plugins.eject(id);
    expect(plugins.count()).toBe(0);
  });

  it("should throw an error when trying to unregister a plugin with an invalid key", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");

    const id = plugins.use(pluginA);

    const invalidId: PluginId = { key: "invalidKey", value: id.value };

    expect(() => plugins.eject(invalidId)).toThrowError(
      `Plugin with key 'invalidKey' is not registered for endpoint 'get-/test'`,
    );
  });

  it("should intercept request and apply all plugins", async () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");
    const pluginB = createTestPlugin("pluginB");

    plugins.use(pluginA);
    plugins.use(pluginB);

    const api: ZodifiedEndpointDefinitions = [];
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/test",
      headers: {},
    };

    const result = await plugins.interceptRequest(api, config);

    expect(pluginA.request).toHaveBeenCalledWith(api, config);
    expect(pluginB.request).toHaveBeenCalledWith(api, config);
    expect(result).toEqual(config);
  });

  it("should intercept response and apply all plugins in reverse order", async () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");
    const pluginB = createTestPlugin("pluginB");

    plugins.use(pluginA);
    plugins.use(pluginB);

    const api: ZodifiedEndpointDefinitions = [];
    const config: ReadonlyDeep<AnyZodifiedRequestOptions> = {
      method: "get",
      url: "/test",
      headers: {},
    };
    const response = new Response() as ZodifiedResponse;

    const result = await plugins.interceptResponse(api, config, response);

    expect(pluginB.response).toHaveBeenCalledWith(api, config, response);
    expect(pluginA.response).toHaveBeenCalledWith(api, config, response);
    expect(result).toEqual(response);
  });

  it("should return the correct count of registered plugins", () => {
    const plugins = new ZodifiedPlugins("get", "/test");
    const pluginA = createTestPlugin("pluginA");
    const pluginB = createTestPlugin("pluginB");

    expect(plugins.count()).toBe(0);

    plugins.use(pluginA);
    expect(plugins.count()).toBe(1);

    plugins.use(pluginB);
    expect(plugins.count()).toBe(2);

    plugins.eject("pluginA");
    expect(plugins.count()).toBe(1);

    plugins.eject("pluginB");
    expect(plugins.count()).toBe(0);
  });
});
