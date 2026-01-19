import { useSettings, useSetupPassword, useChangePassword, useVerifyPassword } from "@/hooks/use-settings";
import { usePresets, useUpdatePresetFields, useSetActivePreset } from "@/hooks/use-presets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, FormInput } from "lucide-react";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const setupPassword = useSetupPassword();
  const changePassword = useChangePassword();
  const { toast } = useToast();

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences.</p>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="w-full md:w-auto grid grid-cols-2">
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="presets">Form Presets</TabsTrigger>
        </TabsList>
        
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

                <Button type="submit" disabled={setupPassword.isPending || changePassword.isPending}>
                  {setupPassword.isPending || changePassword.isPending ? "Saving..." : "Save Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="presets" className="mt-6">
          <PresetEditor />
        </TabsContent>
      </Tabs>
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
      f.id === fieldId ? { id: f.id, isEnabled: !current, orderIndex: f.orderIndex } : { id: f.id, isEnabled: f.isEnabled, orderIndex: f.orderIndex }
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
                checked={field.isEnabled} 
                onCheckedChange={() => toggleField(field.id, field.isEnabled || false)}
                disabled={field.fieldKey === 'name'} // Name is mandatory
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
