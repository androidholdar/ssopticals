import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreatePresetRequest } from "@shared/routes";

export function usePresets() {
  return useQuery({
    queryKey: [api.presets.list.path],
    queryFn: async () => {
      const res = await fetch(api.presets.list.path);
      if (!res.ok) throw new Error("Failed to fetch presets");
      return api.presets.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePresetRequest) => {
      const res = await fetch(api.presets.create.path, {
        method: api.presets.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create preset");
      return api.presets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.presets.list.path] }),
  });
}

export function useUpdatePresetFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: number; fields: { id: number; isEnabled: boolean; orderIndex: number }[] }) => {
      const url = buildUrl(api.presets.updateFields.path, { id });
      const res = await fetch(url, {
        method: api.presets.updateFields.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error("Failed to update fields");
      return api.presets.updateFields.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.presets.list.path] }),
  });
}

export function useSetActivePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.presets.setActive.path, { id });
      const res = await fetch(url, {
        method: api.presets.setActive.method,
      });
      if (!res.ok) throw new Error("Failed to set active preset");
      return api.presets.setActive.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.presets.list.path] }),
  });
}
