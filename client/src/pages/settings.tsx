import { useSettings, useSetupPassword, useChangePassword, useVerifyPassword } from "@/hooks/use-settings";
import { usePresets, useUpdatePresetFields, useSetActivePreset } from "@/hooks/use-presets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, FormInput, Download, Upload, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const setupPassword = useSetupPassword();
  const changePassword = useChangePassword();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [masterInput, setMasterInput] = useState("");

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
        await changePassword.mutateAsync({ oldPassword, newPassword });
        toast({ title: "Password Changed", description: "Wholesale password updated." });
      }
      setNewPassword("");
      setOldPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleMasterPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword !== confirmMasterPassword) {
      toast({ title: "Master passwords do not match", variant: "destructive" });
      return;
    }

    try {
      await apiRequest("POST", "/api/settings/master-password", { password: masterPassword });
      toast({ title: "Master Password Set", description: "Security reset protection enabled." });
      setMasterPassword("");
      setConfirmMasterPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (settings?.hasMasterPassword) {
      setShowMasterDialog(true);
      return;
    }

    performReset();
  };

  const performReset = async (mPass?: string) => {
    if (!confirm("Are you sure you want to reset the wholesale password? This will remove password protection from wholesale prices until a new one is set.")) {
      return;
    }

    try {
      await apiRequest("POST", "/api/settings/reset", { masterPassword: mPass });
      toast({ title: "Password Reset", description: "Wholesale password has been cleared." });
      setShowMasterDialog(false);
      setMasterInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBackup = () => {
    window.location.href = "/api/backup";
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("backup", file);

    setIsRestoring(true);
    try {
      const response = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({ title: "Restore Successful", description: "Application data has been restored." });
        // Invalidate all queries to refresh the app data
        queryClient.invalidateQueries();
      } else {
        const err = await response.json();
        throw new Error(err.message || "Restore failed");
      }
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
        <TabsList className="w-full md:w-auto grid grid-cols-2">
          <TabsTrigger value="data">Backup & Restore</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
        
        <TabsContent value="security" className="mt-6">
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
                    <Label>Current Password</Label>
                    <Input 
                      type="password" 
                      value={oldPassword} 
                      onChange={e => setOldPassword(e.target.value)} 
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

          <Card className="mt-6 border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Lock className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle>Master Password</CardTitle>
                  <CardDescription>
                    {settings?.hasMasterPassword
                      ? "Security protection is enabled. The master password cannot be changed."
                      : "Security protection for resetting the wholesale password."}
                  </CardDescription>
                </div>
                {settings?.hasMasterPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (confirm("Are you sure you want to reset the master password? You can only do this once to set a new strong password.")) {
                        try {
                          await apiRequest("POST", "/api/settings/reset-master-once", {});
                          toast({ title: "Master Password Reset", description: "You can now set a new master password." });
                          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                      }
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            {!settings?.hasMasterPassword && (
              <CardContent>
                <form onSubmit={handleMasterPasswordSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Master Password</Label>
                    <Input
                      type="password"
                      value={masterPassword}
                      onChange={e => setMasterPassword(e.target.value)}
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
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" variant="destructive">
                    Set Master Password
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showMasterDialog} onOpenChange={setShowMasterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Master Password</DialogTitle>
            <DialogDescription>Please provide the master password to authorize this reset.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="password" 
              placeholder="Master Password" 
              value={masterInput}
              onChange={e => setMasterInput(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMasterDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => performReset(masterInput)}>Verify & Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresetEditor() {
  const { data: presets = [] } = usePresets();
  const updateFields = useUpdatePresetFields();
  const setActive = useSetActivePreset();
  const { toast } = useToast();

  const activePreset = presets.find(p => p.isActive) || presets[0];

  if (!activePreset) return <div>Loading presets...</div>;

  const toggleField = async (fieldId: number, current: boolean) => {
    const fields = activePreset.fields.map(f => 
      f.id === fieldId ? { id: f.id, isEnabled: !current, orderIndex: f.orderIndex } : { id: f.id, isEnabled: !!f.isEnabled, orderIndex: f.orderIndex }
    );
    
    try {
      await updateFields.mutateAsync({ id: activePreset.id, fields });
      toast({ title: "Updated", description: "Field visibility updated." });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <FormInput className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Customer Form Configuration</CardTitle>
            <CardDescription>Customize which fields appear when adding a new customer.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Field Name</span>
            <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Visible</span>
          </div>
          
          {activePreset.fields.sort((a, b) => a.orderIndex - b.orderIndex).map(field => (
            <div key={field.id} className="flex items-center justify-between py-2">
              <span className="font-medium">{field.label}</span>
              <Switch 
                checked={!!field.isEnabled} 
                onCheckedChange={() => toggleField(field.id, !!field.isEnabled)}
                disabled={field.fieldKey === 'name'} // Name is mandatory
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
