import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CreatePresetRequest } from "@shared/routes";
import { supabase } from "@/lib/supabase";

export function usePresets() {
  return useQuery({
    queryKey: ["presets"],
    queryFn: async () => {
      const { data: presets, error: presetsError } = await supabase
        .from('form_presets')
        .select('*');

      if (presetsError) throw presetsError;

      const { data: fields, error: fieldsError } = await supabase
        .from('form_preset_fields')
        .select('*')
        .order('order_index', { ascending: true });

      if (fieldsError) throw fieldsError;

      return presets.map(p => ({
        ...p,
        fields: fields.filter(f => f.preset_id === p.id).map(f => ({
          ...f,
          presetId: f.preset_id,
          fieldKey: f.field_key,
          isEnabled: f.is_enabled,
          orderIndex: f.order_index
        }))
      }));
    },
  });
}

export function useCreatePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePresetRequest) => {
      const { data: preset, error: presetError } = await supabase
        .from('form_presets')
        .insert([{ name: data.name }])
        .select()
        .single();

      if (presetError) throw presetError;

      const defaultFields = [
        { field_key: "name", label: "Full Name" },
        { field_key: "age", label: "Age" },
        { field_key: "address", label: "Address" },
        { field_key: "mobile", label: "Mobile Number" },
        { field_key: "newPower", label: "New Power" },
        { field_key: "oldPower", label: "Old Power" },
        { field_key: "notes", label: "Notes" },
      ];

      const fieldsToInsert = defaultFields.map((f, index) => ({
        ...f,
        preset_id: preset.id,
        is_enabled: true,
        order_index: index,
      }));

      const { error: fieldsError } = await supabase
        .from('form_preset_fields')
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      return preset;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
  });
}

export function useUpdatePresetFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fields }: { id: number; fields: { id: number; isEnabled: boolean; orderIndex: number }[] }) => {
      for (const field of fields) {
        const { error } = await supabase
          .from('form_preset_fields')
          .update({ is_enabled: field.isEnabled, order_index: field.orderIndex })
          .eq('id', field.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
  });
}

export function useSetActivePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error: deactiveError } = await supabase
        .from('form_presets')
        .update({ is_active: false })
        .neq('id', id);

      if (deactiveError) throw deactiveError;

      const { error: activeError } = await supabase
        .from('form_presets')
        .update({ is_active: true })
        .eq('id', id);

      if (activeError) throw activeError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
  });
}
