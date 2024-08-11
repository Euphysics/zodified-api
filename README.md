# ZodifiedAPI

ZodifiedAPI is a library that provides a type-safe, framework-agnostic solution for building and consuming APIs using TypeScript. It supports integration with popular frameworks like Express, Next.js, and others, ensuring that your API is robust, maintainable, and type-safe.

## Features

- **Type Safety**: Ensures type safety throughout your API, from request validation to response handling.
- **Middleware Support**: Easily add and manage middleware functions.
- **Zod Integration**: Uses Zod for schema validation, making it easy to define and validate your API schemas.
- **Framework Agnostic**: Provides a generic API server class that can be integrated with common server frameworks.
- **Retry Mechanism**: Includes automatic retry functionality for network errors and temporary server errors.
- **Custom Error Handling**: Provides dedicated error classes for API and network errors.

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
import { createApiConfig } from '@zodified-api/core';

const apiConfig = createApiConfig('https://api.example.com', {
  getUser: {
    method: 'GET',
    path: '/user',
    query: z.object({ id: z.string() }),
    response: z.object({ id: z.string(), name: z.string() }),
  },
});
```

### 2. Create an API Server

You can create a framework-agnostic API server using the `GenericApiServer` class:

```typescript
import { GenericApiServer } from '@zodified-api/core';

const apiServer = new GenericApiServer(apiConfig);

apiServer.handle('getUser', async (req, res) => {
  const user = { id: req.parsedQuery.id, name: 'John Doe' };
  return user;
});
```

### 3. Create an API Client

You can also create a type-safe API client that matches your API configuration:

```typescript
import { ApiClient } from '@zodified-api/core';

const client = new ApiClient(apiConfig, {
  baseUrl: 'https://api.example.com',
  headers: { 'X-Custom-Header': 'value' },
  retryConfig: { count: 3, delay: 1000 },
});

const userData = await client.request('getUser', { query: { id: '123' } });
console.log(userData); // { id: '123', name: 'John Doe' }
```

## API Reference

### `createApiConfig(baseUrl: string, endpoints: Record)`

Creates an API configuration object used by both the server and client.

### `GenericApiServer`

A class for handling API requests in a framework-agnostic manner.

- **Methods**:
  - `use(middleware: Middleware)`: Adds middleware to the server.
  - `handle(endpointKey: string, handler: Handler)`: Handles a specific API endpoint.

### `ApiClient`

A class for making type-safe API requests.

- **Methods**:
  - `request(endpointKey: string, request?: { query?: object, body?: object })`: Makes a request to the specified API endpoint and returns the type-safe response.

## Error Handling

ZodifiedAPI provides dedicated error classes for handling API and network errors:

- `ApiError`: Represents an API error with an HTTP status code and error message.
- `NetworkError`: Represents network-related issues.

Properly handling these errors can improve the robustness of your application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## License

This project is licensed under the MIT License.