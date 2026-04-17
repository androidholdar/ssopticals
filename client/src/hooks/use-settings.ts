import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      // Sort by ID to ensure we consistently get the same "first" record
      const { data, error } = await supabase
        .from('settings')
        .select('id, wholesale_password_hash, master_password_hash')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return {
        id: data?.id,
        hasPassword: !!data?.wholesale_password_hash,
        hasMasterPassword: !!data?.master_password_hash
      };
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Find the first existing record
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ wholesale_password_hash: "", master_password_hash: "" })
          .eq('id', existing.id);
        if (error) throw error;
      }
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
