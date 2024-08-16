import { useMutation, useQuery } from "@tanstack/react-query";

import { useApi } from "./useApi";

import type { UpdateUserPayload, User } from "@/api";

const fetchUser = async (id: number, api: ReturnType<typeof useApi>) => {
  try {
    const response = await api.getUser({
      queries: { id },
    });
    return response;
  } catch (e) {
    console.error(e);
  }
};

export const useUser = (id: number) => {
  const api = useApi();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id, api),
  });

  const { mutate: createUser } = useMutation<User, Error, User, unknown>({
    mutationKey: ["createUser"],
    mutationFn: (payload) =>
      api.createUser({
        id,
        name: payload.name,
      }),
  });

  const { mutate: updateUser } = useMutation<
    User,
    Error,
    UpdateUserPayload,
    unknown
  >({
    mutationKey: ["updateUser"],
    mutationFn: (payload) =>
      api.put("/user", {
        id,
        name: payload.name,
      }),
  });

  return {
    user,
    isLoading,
    isError,
    createUser,
    updateUser,
  };
};
