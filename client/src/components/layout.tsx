import { Link, useLocation } from "wouter";
import { Users, Box, Settings as SettingsIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Top Header with Logout */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between md:justify-end">
          <div className="md:hidden flex flex-col">
            <span className="text-sm font-bold text-primary leading-none">S.S. OPTICALS</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Narbada eye care</span>
          </div>

          <div className="hidden md:flex flex-1 justify-center absolute left-0 right-0 pointer-events-none">
            <span className="text-xl font-bold text-muted-foreground tracking-[0.2em] uppercase">
              S.S. OPTICALS
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogoutClick}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all font-bold gap-2 rounded-full px-4 h-9 z-50 pointer-events-auto"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 pt-4 md:pt-6">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex flex-col z-50">
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

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to login again to access your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
