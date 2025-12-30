import type { ReadonlyDeep } from "#core/types/utils";
import type {
  AnyZodifiedRequestOptions,
  Method,
  ZodifiedEndpointDefinitions,
  ZodifiedPlugin,
  ZodifiedResponse,
} from "#core/types/zodified";

export type PluginId = {
  key: string;
  value: number;
};

/**
 * A list of plugins that can be used by the Zodified client.
 */
export class ZodifiedPlugins {
  public readonly key: string;
  private plugins: Array<ZodifiedPlugin | undefined> = [];

  /**
   * Constructor
   * @param method - http method of the endpoint where the plugins are registered
   * @param path - path of the endpoint where the plugins are registered
   */
  constructor(method: Method | "any", path: string) {
    this.key = `${method}-${path}`;
  }

  /**
   * Get the index of a plugin by name
   * @param name - name of the plugin
   * @returns the index of the plugin if found, -1 otherwise
   */
  indexOf(name: string) {
    return this.plugins.findIndex((p) => p?.name === name);
  }

  /**
   * register a plugin
   * if the plugin has a name it will be replaced if it already exists
   * @param plugin - plugin to register
   * @returns unique id of the plugin
   */
  use(plugin: ZodifiedPlugin): PluginId {
    if (plugin.name) {
      const id = this.indexOf(plugin.name);
      if (id !== -1) {
        this.plugins[id] = plugin;
        return { key: this.key, value: id };
      }
    }
    this.plugins.push(plugin);
    return { key: this.key, value: this.plugins.length - 1 };
  }

  /**
   * unregister a plugin
   * @param plugin - plugin to unregister
   */
  eject(plugin: PluginId | string) {
    if (typeof plugin === "string") {
      const id = this.indexOf(plugin);
      if (id === -1) {
        throw new Error(`Plugin with name '${plugin}' not found`);
      }
      this.plugins[id] = undefined;
    } else {
      if (plugin.key !== this.key) {
        throw new Error(
          `Plugin with key '${plugin.key}' is not registered for endpoint '${this.key}'`,
        );
      }
      this.plugins[plugin.value] = undefined;
    }
  }

  /**
   * Intercept the request config by applying all plugins
   * before using it to send a request to the server
   * @param config - request config
   * @returns the modified config
   */
  async interceptRequest(
    api: ZodifiedEndpointDefinitions,
    config: ReadonlyDeep<AnyZodifiedRequestOptions>,
  ) {
    let pluginConfig = config;
    for (const plugin of this.plugins) {
      if (plugin?.request) {
        pluginConfig = await plugin.request(api, pluginConfig);
      }
    }
    return pluginConfig;
  }

  /**
   * Intercept the response from server by applying all plugins
   * @param api - endpoint descriptions
   * @param config - request config
   * @param response - response from the server
   * @returns the modified response
   */
  async interceptResponse(
    api: ZodifiedEndpointDefinitions,
    config: ReadonlyDeep<AnyZodifiedRequestOptions>,
    response: ZodifiedResponse,
  ): Promise<ZodifiedResponse> {
    let pluginResponse: ZodifiedResponse = response;
    for (let index = this.plugins.length - 1; index >= 0; index--) {
      const plugin = this.plugins[index];
      if (plugin) {
        if (plugin.response) {
          pluginResponse = await plugin.response(api, config, pluginResponse);
        }
      }
    }
    return pluginResponse;
  }

  /**
   * Get the number of plugins registered
   * @returns the number of plugins registered
   */
  count() {
    return this.plugins.reduce(
      (count, plugin) => (plugin ? count + 1 : count),
      0,
    );
  }
}
