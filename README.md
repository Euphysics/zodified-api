# ZodifiedAPI

ZodifiedAPI is a library that provides a type-safe, framework-agnostic solution for building and consuming APIs using TypeScript. It features an interface similar to [Zodios](https://www.zodios.org/) but wraps around `fetch` instead of `axios`. Additionally, it includes a powerful mocking feature that is particularly useful for testing and development.

## Features

- **Type Safety**: Ensures type safety throughout your API, from request validation to response handling.
- **Plugin Support**: Easily add and manage middleware functions with support for custom plugins.
- **Zod Integration**: Leverages Zod for schema validation, making it easy to define and validate your API schemas.
- **Framework Agnostic**: Provides a generic API server class that can be integrated with common server frameworks.
- **Mocking Capabilities**: Use the `useMock` function to simulate API responses during testing or development.
- **Fetch Wrapper**: Unlike Zodios, ZodifiedAPI wraps around `fetch` instead of `axios`.
- **Retry Mechanism**: Includes automatic retry functionality for network errors and temporary server issues.

## Installation

You can install the library via npm:

```bash
npm install @zodified-api/core
```

or via yarn:

```bash
yarn add @zodified-api/core
```

## Usage

### 1. Define API Configuration

First, define your API configuration using `zod` for schema validation.

```typescript
import { z } from 'zod';
import { makeApi, makeEndpoint } from '@zodified-api/core';

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const getUser = makeEndpoint({
  method: 'get',
  path: '/user',
  alias: 'getUser',
  description: 'Get user',
  parameters: [
    {
      type: 'Query',
      name: 'id',
      schema: z.number(),
      description: 'User ID',
    },
  ],
  response: userSchema,
});

export const api = makeApi([getUser]);
```

### 2. Create an API Client

Based on the API configuration, you can create a type-safe API client.

```typescript
import { Zodified } from '@zodified-api/core';
import { api } from './api-config';

const ApiClient = new Zodified('https://api.example.com', api);

const userData = await ApiClient.get('/user', { queries: { id: 1 } });
console.log(userData); // { id: 1, name: 'John Doe' }
```

### 3. Using the Mocking Feature

The `useMock` function allows you to simulate API responses, which is useful during testing or when the backend is not yet implemented.

```typescript
ApiClient.useMock({
  get: {
    '/user': {
      response: { id: 1, name: 'John Doe' },
      delay: 100,
    },
  },
  post: {
    '/user': {
      response: { id: 2, name: 'Jane Doe' },
    },
  },
}, 500); // Adds a 500ms delay
```

### 4. Making Requests

ZodifiedAPI allows you to make requests to API endpoints using methods like `get`, `post`, `put`, `patch`, and `delete`.

```typescript
const updatedUser = await ApiClient.put('/user', { payload: { id: 1, name: 'New Name' } });
console.log(updatedUser); // { id: 1, name: 'New Name' }
```

## Release & CI/CD

The repository ships npm packages via two GitHub Actions workflows:

- [Create Release PR](.github/workflows/create-release-pr.yml) — manually trigger this workflow from the **Actions** tab, pick a semantic version bump (`patch`, `minor`, or `major`), and it will update the root workspace plus the `@zodified-api/core` and `@zodified-api/next` packages to the same version, then open a pull request labelled `release`.
- [Publish Release](.github/workflows/release.yml) — when the release PR is merged into `main` (or when the workflow is run manually), the job installs dependencies, builds the monorepo, publishes both npm packages (skipping ones that already exist), tags the commit (`vX.Y.Z`), and creates a GitHub Release with categorized notes.

### Required secrets and variables

- `APP_ID` (repository variable) and `PRIVATE_KEY` (repository secret) for the GitHub App that `Create Release PR` uses to open branches.
- `NPM_TOKEN` (repository secret) with publish access to the `@zodified-api/*` scope so that `Publish Release` can run `npm publish --provenance`.

### Typical release flow

1. Run **Create Release PR** and review the generated changelog in the PR body.
2. Merge the PR once the code is ready; the `release` label keeps the publish workflow scoped to intentional releases.
3. Monitor the **Publish Release** workflow run: it will build, publish, push the `vX.Y.Z` tag, and open the GitHub Release automatically.
4. If needed, you can re-run or manually dispatch **Publish Release** after fixing any issues; already-published package versions are skipped safely.

## API Reference

### `makeApi(endpoints: ZodifiedEndpointDefinition[])`

Creates an API configuration object based on the provided endpoint definitions.

### `makeEndpoint(config: ZodifiedEndpointConfig)`

Defines an API endpoint. You can specify the HTTP method, path, validation schema, and more.

### `Zodified`

A class for making type-safe API requests.

- **Methods**:
  - `get(path: string, config?: RequestConfig)`: Sends a GET request to the specified API endpoint and returns a type-safe response.
  - `post(path: string, data: object, config?: RequestConfig)`: Sends a POST request to the specified API endpoint and returns a type-safe response.
  - `put(path: string, data: object, config?: RequestConfig)`: Sends a PUT request to the specified API endpoint and returns a type-safe response.
  - `patch(path: string, data: object, config?: RequestConfig)`: Sends a PATCH request to the specified API endpoint and returns a type-safe response.
  - `delete(path: string, config?: RequestConfig)`: Sends a DELETE request to the specified API endpoint and returns a type-safe response.
  - `useMock(mockData: MockData<Api>, delay?: number)`: Uses mock data to simulate API responses.

## Contributing

Contributions are welcome! Feel free to submit a Pull Request or open an Issue.

## License

This project is licensed under the MIT License.
