import { Zodified, makeApi, makeEndpoint } from "@zodified-api/core";
import { z } from "zod";

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const updateUserSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
});

const getUser = makeEndpoint({
  method: "get",
  path: "/user",
  alias: "getUser",
  description: "Get user",
  parameters: [
    {
      type: "Query",
      name: "id",
      schema: z.number(),
      description: "User ID",
    },
  ],
  response: userSchema,
  customProperties: {
    authRequired: true,
  },
});

const createUser = makeEndpoint({
  method: "post",
  path: "/user",
  alias: "createUser",
  description: "Create user",
  parameters: [
    {
      name: "payload",
      type: "Body",
      schema: userSchema,
      description: "User data",
    },
  ],
  response: userSchema,
  customProperties: {
    authRequired: true,
  },
});

export type UpdateUserPayload = z.infer<typeof updateUserSchema>;
export type User = z.infer<typeof userSchema>;

const updateUser = makeEndpoint({
  method: "put",
  path: "/user",
  description: "Update user",
  parameters: [
    {
      name: "payload",
      type: "Body",
      schema: updateUserSchema,
      description: "User data",
    },
  ],
  response: userSchema,
  customProperties: {
    authRequired: true,
  },
});

const deleteUser = makeEndpoint({
  method: "delete",
  path: "/user",
  description: "Delete user",
  parameters: [
    {
      type: "Query",
      name: "id",
      schema: z.string(),
      description: "User ID",
    },
  ],
  response: z.undefined(),
  customProperties: {
    authRequired: true,
  },
});

const getTimestamp = makeEndpoint({
  method: "get",
  path: "/timestamp",
  description: "Get timestamp",
  response: z.number(),
  customProperties: {
    authRequired: false,
  },
});

export const api = makeApi([
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getTimestamp,
]);

export const ApiClient = new Zodified("http://localhost:3000/api", api);

// ApiClient.useMock(
//   {
//     get: {
//       "/user": {
//         response: { id: 1, name: "John Doe" },
//         delay: 100,
//       },
//     },
//     post: {
//       "/user": {
//         response: { id: 2, name: "Jane Doe" },
//       },
//     },
//     put: {
//       "/user": {
//         response: { id: 1, name: "J" },
//         status: 400,
//       },
//     },
//   },
//   500,
// );

// ApiClient.get("/user", { queries: { id: 1 } }).then((response) => {
//   console.log(response);
// });
