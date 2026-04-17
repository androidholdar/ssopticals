import { useSettings, useResetSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const resetSettings = useResetSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");

      const { data: categories } = await supabase.from('categories').select('*');
      const { data: customers } = await supabase.from('customers').select('*');
      const { data: presets } = await supabase.from('form_presets').select('*');
      const { data: fields } = await supabase.from('form_preset_fields').select('*');

      const backupData = {
        categories,
        customers,
        form_presets: presets,
        form_preset_fields: fields,
        version: "2.0",
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `opticals_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Backup Successful", description: "Your data has been downloaded." });
    } catch (error: any) {
      toast({ title: "Backup Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const { supabase } = await import("@/lib/supabase");

      // 1. Clear existing data
      // We use a range delete or a filter that matches everything since RLS allows it
      await supabase.from('form_preset_fields').delete().filter('id', 'gt', 0);
      await supabase.from('form_presets').delete().filter('id', 'gt', 0);
      await supabase.from('categories').delete().filter('id', 'gt', 0);
      await supabase.from('customers').delete().filter('id', 'gt', 0);

      toast({ title: "Restore in Progress", description: "Data cleared. Inserting new records..." });

      if (data.categories?.length > 0) {
        await supabase.from('categories').insert(data.categories);
      }
      if (data.customers?.length > 0) {
        await supabase.from('customers').insert(data.customers);
      }
      if (data.form_presets?.length > 0) {
        await supabase.from('form_presets').insert(data.form_presets);
      }
      if (data.form_preset_fields?.length > 0) {
        await supabase.from('form_preset_fields').insert(data.form_preset_fields);
      }

      // 3. Sync sequences
      await supabase.rpc('sync_sequences');

      toast({ title: "Restore Successful", description: "Application data has been restored. Refreshing..." });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast({ title: "Restore Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences.</p>
      </div>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="w-full md:w-auto flex">
          <TabsTrigger value="data" className="flex-1">Backup & Restore</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Backup & Restore</CardTitle>
                  <CardDescription>Export your data as a backup file or restore from a previous one.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 max-w-md">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Backup</h3>
                  <p className="text-xs text-muted-foreground">Download a JSON file containing all your lens categories, prices, and customer records.</p>
                  <Button onClick={handleBackup} className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" /> Download Backup
                  </Button>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h3 className="font-medium text-sm">Restore</h3>
                  <p className="text-xs text-muted-foreground">Upload a previously saved backup file. <strong>Warning: This will overwrite all current data.</strong></p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                  />
                  <Button variant="outline" onClick={handleRestoreClick} className="w-full sm:w-auto" disabled={isRestoring}>
                    <Upload className="w-4 h-4 mr-2" /> {isRestoring ? "Restoring..." : "Restore from File"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
