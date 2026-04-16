import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type SetPasswordRequest, type ChangePasswordRequest, type CheckPasswordRequest } from "@shared/routes";
import { supabase } from "@/lib/supabase";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('id, wholesale_password_hash, master_password_hash')
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
      const { error } = await supabase
        .from('settings')
        .upsert([{ id: 1, wholesale_password_hash: data.password }]);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('settings')
        .update({ wholesale_password_hash: "" })
        .eq('id', 1);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: async (data: CheckPasswordRequest) => {
      const { data: isValid, error } = await supabase
        .rpc('verify_wholesale_password', { input_password: data.password });

      if (error) throw error;
      return { valid: !!isValid };
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      // In a real app, master password check should happen in an RPC for security
      const { error } = await supabase
        .from('settings')
        .upsert([{ id: 1, wholesale_password_hash: data.newPassword }]);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useSetupMasterPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const { error } = await supabase
        .from('settings')
        .upsert([{ id: 1, master_password_hash: data.password }]);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
