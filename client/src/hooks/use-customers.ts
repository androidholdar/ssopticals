import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateCustomerRequest, type UpdateCustomerRequest } from "@shared/routes";

type CustomerFilters = {
  search?: string;
  from?: string;
  to?: string;
};

export function useCustomers(filters?: CustomerFilters) {
  const queryKey = [api.customers.list.path, filters];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(window.location.origin + api.customers.list.path);
      if (filters?.search) url.searchParams.set("search", filters.search);
      if (filters?.from) url.searchParams.set("from", filters.from);
      if (filters?.to) url.searchParams.set("to", filters.to);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: [api.customers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.customers.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch customer");
      return api.customers.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      const validated = api.customers.create.input.parse(data);
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCustomerRequest) => {
      const validated = api.customers.update.input.parse(updates);
      const url = buildUrl(api.customers.update.path, { id });
      const res = await fetch(url, {
        method: api.customers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return api.customers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(api.customers.uploadPhoto.path, {
        method: api.customers.uploadPhoto.method,
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return api.customers.uploadPhoto.responses[200].parse(await res.json());
    },
  });
}
