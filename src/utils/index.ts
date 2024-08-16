import type {
  AnyZodifiedRequestOptions,
  Method,
  ReadonlyDeep,
  ZodifiedEndpointDefinition,
  ZodifiedEndpointDefinitions,
  ZodifiedMatchingErrorsByAlias,
  ZodifiedMatchingErrorsByPath,
  ZodifiedPathsByMethod,
} from "@/types";

/**
 * omit properties from an object
 * @param obj - the object to omit properties from
 * @param keys - the keys to omit
 * @returns the object with the omitted properties
 */
export const omit = <T, K extends keyof T>(
  obj: T | undefined,
  keys: K[],
): Omit<T, K> => {
  const ret = { ...obj } as T;
  for (const key of keys) {
    delete ret[key];
  }
  return ret;
};

/**
 * pick properties from an object
 * @param obj - the object to pick properties from
 * @param keys - the keys to pick
 * @returns the object with the picked properties
 */
export const pick = <T, K extends keyof T>(
  obj: T | undefined,
  keys: K[],
): Pick<T, K> => {
  const ret = {} as Pick<T, K>;
  if (obj) {
    for (const key of keys) {
      ret[key] = obj[key];
    }
  }
  return ret;
};

/**
 * set first letter of a string to uppercase
 * @param str - the string to capitalize
 * @returns - the string with the first letter uppercased
 */
export const capitalize = <T extends string>(str: T): Capitalize<T> => {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
};

/**
 * replace query parameters in a URL
 * @param config - the request configuration
 * @returns the URL with the query parameters replaced
 */
export const replaceQueryParams = (
  config: ReadonlyDeep<AnyZodifiedRequestOptions>,
): string => {
  const queries = config.queries;
  if (queries) {
    const query = new URLSearchParams();
    for (const key in queries) {
      query.append(key, `${queries[key]}`);
    }
    return `${config.url}?${query.toString()}`;
  }
  return config.url;
};

const paramsRegExp = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * replace path parameters in a URL
 * @param config - the request configuration
 * @returns the URL with the path parameters replaced
 */
export const replacePathParams = (
  config: ReadonlyDeep<AnyZodifiedRequestOptions>,
): string => {
  let result: string = config.url;
  const params = config.params;
  if (params) {
    result = result.replace(paramsRegExp, (match, key) =>
      key in params ? `${params[key]}` : match,
    );
  }
  return result;
};

export const findEndpoint = (
  api: ZodifiedEndpointDefinitions,
  method: string,
  path: string,
): ZodifiedEndpointDefinition | undefined =>
  api.find((e) => e.method === method && e.path === path);

export const findEndpointByAlias = (
  api: ZodifiedEndpointDefinitions,
  alias: string,
): ZodifiedEndpointDefinition | undefined => api.find((e) => e.alias === alias);

export const findEndpointErrors = (
  endpoint: ZodifiedEndpointDefinition,
  status: number,
) => {
  const matchingErrors = endpoint.errors?.filter(
    (error) => error.status === status,
  );
  if (matchingErrors && matchingErrors.length > 0) return matchingErrors;
  return endpoint.errors?.filter((error) => error.status === "default");
};

export const findEndpointErrorsByPath = (
  api: ZodifiedEndpointDefinitions,
  method: Method,
  path: ZodifiedPathsByMethod<typeof api, typeof method>,
  status: number,
  url: string,
):
  | ZodifiedMatchingErrorsByPath<typeof api, typeof method, typeof path>
  | undefined => {
  const endpoint = findEndpoint(api, method, path);
  return endpoint && pathMatchesUrl(endpoint.path, url)
    ? (findEndpointErrors(endpoint, status) as ZodifiedMatchingErrorsByPath<
        typeof api,
        typeof method,
        typeof path
      >)
    : undefined;
};

export const findEndpointErrorsByAlias = (
  api: ZodifiedEndpointDefinitions,
  alias: string,
  status: number,
  url: string,
): ZodifiedMatchingErrorsByAlias<typeof api, typeof alias> | undefined => {
  const endpoint = findEndpointByAlias(api, alias);
  return endpoint && pathMatchesUrl(endpoint.path, url)
    ? (findEndpointErrors(endpoint, status) as ZodifiedMatchingErrorsByAlias<
        typeof api,
        typeof alias
      >)
    : undefined;
};

export const pathMatchesUrl = (path: string, url: string): boolean =>
  new RegExp(`^${path.replace(paramsRegExp, () => "([^/]*)")}$`).test(url);
