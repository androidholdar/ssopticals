import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Box, Settings as SettingsIcon, Lock, Unlock, Palette } from "lucide-react";
import { useWholesale } from "@/hooks/use-wholesale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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

// ── Theme definitions ──
const THEMES = [
  { id: "",           label: "Purple",      emoji: "💜", color: "#7c3aed" },
  { id: "blue-gold",  label: "Blue+Gold",   emoji: "✨", color: "#1a4a7a" },
  { id: "emerald",    label: "Emerald",     emoji: "🌿", color: "#065f46" },
  { id: "dark",       label: "Dark",        emoji: "🌙", color: "#1a1a2e" },
  { id: "saffron",    label: "Saffron",     emoji: "🪔", color: "#b45309" },
  { id: "purple-pro", label: "Pro Purple",  emoji: "💫", color: "#4a0080" },
];

function useTheme() {
  const [theme, setThemeState] = useState<string>(() => {
    return localStorage.getItem("ss-theme") || "";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("ss-theme", theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

// ── Theme Switcher Popup ──
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
        title="Change Theme"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          
          {/* Popup */}
          <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-2xl shadow-2xl p-3 w-64">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              🎨 Choose Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left",
                    theme === t.id
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : "border-border hover:border-primary/40 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-white/30"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs font-semibold truncate">{t.label}</span>
                  {theme === t.id && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isUnlocked, lock, unlock } = useWholesale();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [password, setPassword] = useState("");
  const verify = useVerifyPassword();
  const { toast } = useToast();

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("ss-theme") || "";
    const root = document.documentElement;
    if (saved) {
      root.setAttribute("data-theme", saved);
    } else {
      root.removeAttribute("data-theme");
    }
  }, []);

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
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/categories", label: "Lens", icon: Box },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
  const minSwipeDistance = 50;
  const maxVerticalDistance = 100;
  const [, setLocation] = useLocation();

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > minSwipeDistance && Math.abs(distanceY) < maxVerticalDistance;
    const isStrictlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 2;
    if (isHorizontalSwipe && isStrictlyHorizontal) {
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;
      const currentIndex = navItems.findIndex(item => location.startsWith(item.href));
      if (currentIndex !== -1) {
        if (isLeftSwipe && currentIndex < navItems.length - 1) {
          setLocation(navItems[currentIndex + 1].href);
        } else if (isRightSwipe && currentIndex > 0) {
          setLocation(navItems[currentIndex - 1].href);
        }
      }
    }
  };

  return (
    <div
      className="flex h-screen bg-muted/20"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-display font-bold leading-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
            S.S. Opticals
            <span className="block text-xs font-normal mt-1" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>
              (Narbada eye care)
            </span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (location !== "/" && item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-white/10"
                )}
                style={!isActive ? { color: 'hsl(var(--sidebar-foreground) / 0.7)' } : {}}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => isUnlocked ? lock() : setShowUnlockDialog(true)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium",
              isUnlocked
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-white/10 border-white/20 hover:bg-white/20"
            )}
            style={!isUnlocked ? { color: 'hsl(var(--sidebar-foreground) / 0.7)' } : {}}
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
        {/* Top Bar with S.S. OPTICALS + Theme Switcher */}
        <div className="flex justify-between items-center px-4 pt-3 pb-1">
          <div className="flex-1" />
          <span className="text-xl font-bold text-muted-foreground tracking-[0.2em] uppercase">
            S.S. OPTICALS
          </span>
          <div className="flex-1 flex justify-end">
            <ThemeSwitcher />
          </div>
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

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex flex-col z-50">
        <div className="flex justify-between items-center px-4 py-2 border-b bg-muted/30">
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

          {/* Theme switcher in mobile status bar */}
          <ThemeSwitcher />
        </div>
        <div className="flex justify-around p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
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
