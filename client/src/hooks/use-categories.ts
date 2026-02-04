import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateCategoryRequest, type UpdateCategoryRequest } from "@shared/routes";
import { useWholesale } from "./use-wholesale";

export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      console.log("Fetched categories:", data);
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      const validated = api.categories.create.input.parse(data);
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: {
          "Content-Type": "application/json",
          "X-Wholesale-Password": wholesalePassword || "",
        },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to create category");
      }
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCategoryRequest) => {
      const validated = api.categories.update.input.parse(updates);
      const url = buildUrl(api.categories.update.path, { id });
      const res = await fetch(url, {
        method: api.categories.update.method,
        headers: {
          "Content-Type": "application/json",
          "X-Wholesale-Password": wholesalePassword || "",
        },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to update category");
      }
      return api.categories.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.categories.delete.path, { id });
      const res = await fetch(url, {
        method: api.categories.delete.method,
        headers: {
          "X-Wholesale-Password": wholesalePassword || "",
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to delete category");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}
