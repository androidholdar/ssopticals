import { useSettings, useSetupPassword, useChangePassword, useVerifyPassword } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, Download, Upload, Database } from "lucide-react";
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

  const handleResetPassword = async () => {
    performReset();
  };

  const performReset = async () => {
    if (!confirm("Are you sure you want to reset the wholesale password? This will remove password protection from wholesale prices until a new one is set.")) {
      return;
    }

    try {
      await apiRequest("POST", "/api/settings/reset", {});
      toast({ title: "Password Reset", description: "Wholesale password has been cleared." });
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

