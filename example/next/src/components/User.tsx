"use client";

import { useUser } from "@/hooks/useUser";

export const User: React.FC = () => {
  const { user, isLoading, isError } = useUser(1); // Fetch user with ID 1
  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error</div>;
  return (
    <div>
      {user && (
        <div>
          <h1>{user.name}</h1>
        </div>
      )}
    </div>
  );
};
