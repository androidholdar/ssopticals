import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [api.auth.user.path],
    queryFn: async () => {
      const res = await fetch(api.auth.user.path);
      if (!res.ok) {
        if (res.status === 401) return { email: null };
        throw new Error("Failed to fetch user");
      }
      return res.json() as Promise<{ email: string | null }>;
    },
    retry: false,
  });

  const ALLOWED_EMAILS = ["iamsanjaysaini@gmail.com", "sumitsainibrd@gmail.com"];
  const isWhitelisted = data?.email ? ALLOWED_EMAILS.includes(data.email.toLowerCase()) : false;

  return {
    user: data,
    isLoading,
    error,
    isAuthenticated: !!data?.email,
    isWhitelisted,
    refetch,
  };
}
