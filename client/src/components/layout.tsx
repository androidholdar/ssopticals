import { Link, useLocation } from "wouter";
import { Users, Box, Settings as SettingsIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/categories", label: "Lens", icon: Box },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
  const minSwipeDistance = 50;
  const maxVerticalDistance = 100; // Vertical threshold
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
    const isStrictlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 2; // X movement must be 2x Y movement

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
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
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

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex flex-col z-50">
        <div className="flex justify-between items-center px-4 py-1.5 border-b bg-muted/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Navigation</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-destructive/20 text-destructive text-[10px] font-bold transition-all hover:bg-destructive/10"
          >
            <LogOut className="w-3 h-3" />
            LOGOUT
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
