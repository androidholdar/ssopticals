import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Box, Settings as SettingsIcon, LogOut, Lock, Unlock } from "lucide-react";
import { useWholesale } from "@/hooks/use-wholesale";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useVerifyPassword } from "@/hooks/use-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isUnlocked, lock, unlock } = useWholesale();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [password, setPassword] = useState("");
  const verify = useVerifyPassword();
  const { toast } = useToast();

  const handleUnlock = async () => {
    try {
      const { valid } = await verify.mutateAsync({ password });
      if (valid) {
        unlock(password);
        setShowUnlockDialog(false);
        setPassword("");
      } else {
        toast({ title: "Invalid Password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error verifying password", variant: "destructive" });
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/categories", label: "Lens", icon: Box },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col hidden md:flex">
        <div className="p-6 border-b">
          <h1 className="text-xl font-display font-bold text-primary leading-tight">
            S.S. Opticals
            <span className="block text-xs font-normal text-muted-foreground mt-1">(Narbada eye care)</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (location !== "/" && item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t bg-muted/50">
          <button 
            onClick={() => isUnlocked ? lock() : setShowUnlockDialog(true)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium",
              isUnlocked 
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="flex items-center gap-2">
              {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isUnlocked ? "Unlocked" : "Locked"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="flex justify-center pt-2">
          <span className="text-xl font-bold text-muted-foreground tracking-[0.2em] uppercase">
            S.S. OPTICALS
          </span>
        </div>
        <div className="max-w-7xl mx-auto p-4 md:p-8 pt-2 md:pt-4">
          {children}
        </div>
      </main>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Mode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>Cancel</Button>
            <Button onClick={handleUnlock} disabled={verify.isPending}>
              {verify.isPending ? "Verifying..." : "Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex flex-col z-50">
        <div className="flex justify-between items-center px-4 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
          <button 
            onClick={() => isUnlocked ? lock() : setShowUnlockDialog(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all",
              isUnlocked 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-background border-border text-muted-foreground"
            )}
          >
            {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isUnlocked ? "UNLOCKED" : "LOCKED"}
          </button>
        </div>
        <div className="flex justify-around p-2">
          {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <Icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                  {item.label}
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
