import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type SetPasswordRequest, type ChangePasswordRequest, type CheckPasswordRequest } from "@shared/routes";
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

export function useSetupPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SetPasswordRequest) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ wholesale_password_hash: data.password })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert([{ id: 1, wholesale_password_hash: data.password }]);
        if (error) throw error;
      }
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
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
          .update({ wholesale_password_hash: "" })
          .eq('id', existing.id);
        if (error) throw error;
      }
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: async (data: CheckPasswordRequest & { isMaster?: boolean }) => {
      const { data: isValid, error } = await supabase
        .rpc('verify_wholesale_password', {
          input_password: data.password,
          is_master: data.isMaster || false
        });

      if (error) throw error;
      return { valid: !!isValid };
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ wholesale_password_hash: data.newPassword })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert([{ id: 1, wholesale_password_hash: data.newPassword }]);
        if (error) throw error;
      }
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useSetupMasterPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ master_password_hash: data.password })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert([{ id: 1, master_password_hash: data.password, wholesale_password_hash: "" }]);
        if (error) throw error;
      }
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
