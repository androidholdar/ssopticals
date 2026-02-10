import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type SetPasswordRequest, type ChangePasswordRequest, type CheckPasswordRequest } from "@shared/routes";

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });
}

export function useSetupPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SetPasswordRequest) => {
      const res = await fetch(api.settings.setup.path, {
        method: api.settings.setup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to setup password");
      return api.settings.setup.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.settings.get.path] }),
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: async (data: CheckPasswordRequest) => {
      const res = await fetch(api.settings.verify.path, {
        method: api.settings.verify.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Verification failed");
      return api.settings.verify.responses[200].parse(await res.json());
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const res = await fetch(api.settings.changePassword.path, {
        method: api.settings.changePassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 401) {
          const err = await res.json();
          throw new Error(err.message || "Incorrect master password");
        }
        throw new Error("Failed to change password");
      }
      return api.settings.changePassword.responses[200].parse(await res.json());
    },
  });
}

export function useSetupMasterPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const res = await fetch("/api/settings/master-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to setup master password");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.settings.get.path] }),
  });
}
