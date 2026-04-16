import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CreateCategoryRequest, type UpdateCategoryRequest } from "@shared/routes";
import { supabase } from "@/lib/supabase";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      // Mapping JS camelCase to DB snake_case for Supabase SDK
      const dbData = {
        name: data.name,
        type: data.type,
        parent_id: data.parentId,
        customer_price: data.customerPrice,
        wholesale_price: data.wholesalePrice,
        sort_order: data.sortOrder
      };

      const { data: result, error } = await supabase
        .from('categories')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCategoryRequest) => {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      if (updates.customerPrice !== undefined) dbUpdates.customer_price = updates.customerPrice;
      if (updates.wholesalePrice !== undefined) dbUpdates.wholesale_price = updates.wholesalePrice;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { data: result, error } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}
