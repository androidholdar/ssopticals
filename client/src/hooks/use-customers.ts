import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateCustomerRequest, type UpdateCustomerRequest } from "@shared/schema";
import { useWholesale } from "./use-wholesale";

type CustomerFilters = {
  search?: string;
  from?: string;
  to?: string;
};

export function useCustomers(filters?: CustomerFilters, options?: { enabled?: boolean }) {
  const queryKey = [api.customers.list.path, filters];
  const { wholesalePassword } = useWholesale();
  return useQuery({
    queryKey,
    ...options,
    queryFn: async () => {
      const url = new URL(window.location.origin + api.customers.list.path);
      if (filters?.search) url.searchParams.set("search", filters.search);
      if (filters?.from) url.searchParams.set("from", filters.from);
      if (filters?.to) url.searchParams.set("to", filters.to);

      const res = await fetch(url.toString(), {
        headers: {
          "X-Wholesale-Password": wholesalePassword || "",
        }
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCustomer(id: number) {
  const { wholesalePassword } = useWholesale();
  return useQuery({
    queryKey: [api.customers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.customers.get.path, { id });
      const res = await fetch(url, {
        headers: {
          "X-Wholesale-Password": wholesalePassword || "",
        }
      });
      if (!res.ok) throw new Error("Failed to fetch customer");
      return api.customers.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      const validated = api.customers.create.input.parse(data);
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: {
          "Content-Type": "application/json",
          "X-Wholesale-Password": wholesalePassword || "",
        },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to create customer");
      }
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/customers/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wholesale-Password": wholesalePassword || "",
        },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to delete customers");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCustomerRequest) => {
      const validated = api.customers.update.input.parse(updates);
      const url = buildUrl(api.customers.update.path, { id });
      const res = await fetch(url, {
        method: api.customers.update.method,
        headers: {
          "Content-Type": "application/json",
          "X-Wholesale-Password": wholesalePassword || "",
        },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to update customer");
      }
      return api.customers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { wholesalePassword } = useWholesale();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.customers.delete.path, { id });
      const res = await fetch(url, {
        method: api.customers.delete.method,
        headers: {
          "X-Wholesale-Password": wholesalePassword || "",
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied: App is locked.");
        throw new Error("Failed to delete customer");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}
