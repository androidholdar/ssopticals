import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CreateCustomerRequest, type UpdateCustomerRequest } from "@shared/schema";
import { supabase } from "@/lib/supabase";

type CustomerFilters = {
  search?: string;
  from?: string;
  to?: string;
};

export function useCustomers(filters?: CustomerFilters, options?: { enabled?: boolean }) {
  const queryKey = ["customers", filters];
  return useQuery({
    queryKey,
    ...options,
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
      }
      if (filters?.from) {
        query = query.gte('date', filters.from);
      }
      if (filters?.to) {
        query = query.lte('date', filters.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      // Mapping to snake_case for Supabase
      const dbData = {
        date: data.date,
        name: data.name,
        age: data.age,
        address: data.address,
        mobile: data.mobile,
        new_power_right_sph: data.newPowerRightSph,
        new_power_right_cyl: data.newPowerRightCyl,
        new_power_right_axis: data.newPowerRightAxis,
        new_power_right_add: data.newPowerRightAdd,
        new_power_left_sph: data.newPowerLeftSph,
        new_power_left_cyl: data.newPowerLeftCyl,
        new_power_left_axis: data.newPowerLeftAxis,
        new_power_left_add: data.newPowerLeftAdd,
        old_power_right_sph: data.oldPowerRightSph,
        old_power_right_cyl: data.oldPowerRightCyl,
        old_power_right_axis: data.oldPowerRightAxis,
        old_power_right_add: data.oldPowerRightAdd,
        old_power_left_sph: data.oldPowerLeftSph,
        old_power_left_cyl: data.oldPowerLeftCyl,
        old_power_left_axis: data.oldPowerLeftAxis,
        old_power_left_add: data.oldPowerLeftAdd,
        notes: data.notes
      };

      const { data: result, error } = await supabase
        .from('customers')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCustomerRequest) => {
      const dbUpdates: any = {};
      // Map only provided updates
      const mapping: any = {
        date: 'date', name: 'name', age: 'age', address: 'address', mobile: 'mobile',
        newPowerRightSph: 'new_power_right_sph', newPowerRightCyl: 'new_power_right_cyl',
        newPowerRightAxis: 'new_power_right_axis', newPowerRightAdd: 'new_power_right_add',
        newPowerLeftSph: 'new_power_left_sph', newPowerLeftCyl: 'new_power_left_cyl',
        newPowerLeftAxis: 'new_power_left_axis', newPowerLeftAdd: 'new_power_left_add',
        oldPowerRightSph: 'old_power_right_sph', oldPowerRightCyl: 'old_power_right_cyl',
        oldPowerRightAxis: 'old_power_right_axis', oldPowerRightAdd: 'old_power_right_add',
        oldPowerLeftSph: 'old_power_left_sph', oldPowerLeftCyl: 'old_power_left_cyl',
        oldPowerLeftAxis: 'old_power_left_axis', oldPowerLeftAdd: 'old_power_left_add',
        notes: 'notes'
      };

      for (const [key, dbKey] of Object.entries(mapping)) {
        if ((updates as any)[key] !== undefined) {
          dbUpdates[dbKey as string] = (updates as any)[key];
        }
      }

      const { data: result, error } = await supabase
        .from('customers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}
