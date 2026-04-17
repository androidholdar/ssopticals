import { useSettings, useSetupPassword, useChangePassword, useVerifyPassword, useSetupMasterPassword, useResetSettings } from "@/hooks/use-settings";
import { useWholesale } from "@/hooks/use-wholesale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, Download, Upload, Database } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const { wholesalePassword } = useWholesale();
  const setupPassword = useSetupPassword();
  const changePassword = useChangePassword();
  const setupMasterPassword = useSetupMasterPassword();
  const resetSettings = useResetSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Master Password Setup State
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      if (!settings?.hasPassword) {
        await setupPassword.mutateAsync({ password: newPassword });
        toast({ title: "Password Set", description: "Wholesale password created." });
      } else {
        await changePassword.mutateAsync({ masterPassword: masterPasswordInput, newPassword });
        toast({ title: "Password Changed", description: "Wholesale password updated." });
      }
      setNewPassword("");
      setMasterPasswordInput("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleMasterPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMasterPassword !== confirmMasterPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      await setupMasterPassword.mutateAsync({ password: newMasterPassword });
      toast({ title: "Master Password Set", description: "Security significantly improved." });
      setNewMasterPassword("");
      setConfirmMasterPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    const masterPass = prompt("Please enter the " + (settings?.hasMasterPassword ? "Master Password" : "Current Password") + " to reset:");
    if (masterPass === null) return;

    try {
      const { supabase } = await import("@/lib/supabase");

      // Verify password locally for simplicity in static site
      const { data: isValid } = await supabase.rpc('verify_wholesale_password', {
        input_password: masterPass,
        is_master: settings?.hasMasterPassword
      });

      if (!isValid) {
        throw new Error("Invalid master/current password");
      }

      await resetSettings.mutateAsync();
      toast({ title: "Password Reset", description: "Wholesale password has been cleared." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

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
          <TabsTrigger value="security" className="flex-1">Security</TabsTrigger>
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
        
        <TabsContent value="security" className="mt-6 space-y-6">
          {!settings?.hasMasterPassword && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Setup Master Password</CardTitle>
                    <CardDescription>The Master Password is required to change or reset the wholesale password.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMasterPasswordSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Master Password</Label>
                    <Input
                      type="password"
                      value={newMasterPassword}
                      onChange={e => setNewMasterPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Master Password</Label>
                    <Input
                      type="password"
                      value={confirmMasterPassword}
                      onChange={e => setConfirmMasterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={setupMasterPassword.isPending}>
                    {setupMasterPassword.isPending ? "Setting..." : "Set Master Password"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Note: The Master Password cannot be changed once set. Please keep it safe.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Wholesale Access</CardTitle>
                  <CardDescription>Manage the password used to unlock wholesale pricing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                {settings?.hasPassword && (
                  <div className="space-y-2">
                    <Label>{settings?.hasMasterPassword ? "Master Password" : "Current Password"}</Label>
                    <Input 
                      type="password" 
                      value={masterPasswordInput}
                      onChange={e => setMasterPasswordInput(e.target.value)}
                      required 
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{settings?.hasPassword ? "New Password" : "Create Password"}</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    minLength={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={4}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={setupPassword.isPending || changePassword.isPending}>
                    {setupPassword.isPending || changePassword.isPending ? "Saving..." : "Save Password"}
                  </Button>
                  
                  {settings?.hasPassword && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="text-destructive hover:text-destructive"
                      onClick={handleResetPassword}
                    >
                      Reset Password
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

