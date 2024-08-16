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
  customProperties: {
    authRequired: true,
  },
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