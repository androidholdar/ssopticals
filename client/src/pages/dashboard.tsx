import { useState, useEffect } from "react";
import { 
  Plus, 
  Folder, 
  FolderOpen, 
  FileText, 
  Search, 
  Lock, 
  Unlock, 
  Box, 
  ChevronRight,
  ChevronLeft,
  DollarSign
} from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useWholesale } from "@/hooks/use-wholesale";
import { type Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVerifyPassword } from "@/hooks/use-settings";

type CategoryNode = Category & { children: CategoryNode[] };

function buildTree(items: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortFn = (a: CategoryNode, b: CategoryNode) => {
    if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  };

  const sortRecursive = (nodes: CategoryNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach(node => sortRecursive(node.children));
  };

  sortRecursive(roots);
  return roots;
}

export default function Dashboard() {
  const { data: categories = [], isLoading } = useCategories();
  const { isUnlocked, lock, unlock } = useWholesale();
  const { toast } = useToast();
  const verify = useVerifyPassword();

  const [search, setSearch] = useState("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [currentPath, setCurrentPath] = useState<number[]>([]);

  // Get current node and its children
  const currentId = currentPath[currentPath.length - 1] || null;
  
  // Filter categories to show only immediate children of current path
  const displayCategories = categories.filter(c => {
    const nameMatches = c.name.toLowerCase().includes(search.toLowerCase());
    const isChild = c.parentId === currentId;
    return isChild && nameMatches;
  }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleBack = () => {
    setCurrentPath(prev => prev.slice(0, -1));
  };

  const handleNavigate = (id: number) => {
    setCurrentPath(prev => [...prev, id]);
  };

  // Sync with browser history for back button support
  useEffect(() => {
    const handlePopState = () => {
      if (currentPath.length > 0) {
        handleBack();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPath]);

  const handleUnlock = async () => {
    try {
      const { valid } = await verify.mutateAsync({ password });
      if (valid) {
        unlock();
        setShowUnlockDialog(false);
        setPassword("");
        toast({ title: "Wholesale Mode Unlocked", description: "You can now view wholesale prices." });
      } else {
        toast({ title: "Invalid Password", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error verifying password", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading lens prices...</div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Lens Prices</h1>
          <p className="text-muted-foreground">Browse lens retail and wholesale prices.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant={isUnlocked ? "outline" : "default"}
            className={cn("flex-1 sm:flex-none", isUnlocked && "text-green-600 border-green-200")}
            onClick={() => isUnlocked ? lock() : setShowUnlockDialog(true)}
          >
            {isUnlocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {isUnlocked ? "Wholesale Unlocked" : "Unlock Wholesale"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            {currentPath.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input 
                className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Search lens by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {currentPath.length > 0 && (
          <div className="px-4 py-2 bg-muted/10 border-b flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hover:text-primary cursor-pointer" onClick={() => setCurrentPath([])}>Lens</span>
            {currentPath.map((id, index) => {
              const cat = categories.find(c => c.id === id);
              return (
                <div key={id} className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  <span 
                    className={cn(
                      "cursor-pointer hover:text-primary",
                      index === currentPath.length - 1 && "font-medium text-foreground"
                    )}
                    onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                  >
                    {cat?.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="p-4 min-h-[400px]">
          {displayCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No items found in this category.</p>
              {currentPath.length > 0 && (
                <Button variant="ghost" onClick={handleBack} className="mt-2">
                  Go Back
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {displayCategories.map(node => (
                <div 
                  key={node.id}
                  className={cn(
                    "group flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-border",
                    node.type === 'ITEM' && "cursor-default"
                  )}
                  onClick={() => node.type === 'FOLDER' && handleNavigate(node.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {node.type === 'FOLDER' ? (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Folder className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden pr-2">
                      <div className="marquee-container">
                        <span className={cn(
                          "font-semibold text-base",
                          node.name.length > 20 ? "animate-marquee" : "truncate block w-full"
                        )}>
                          {node.name}
                        </span>
                        {node.name.length > 20 && (
                          <span className="font-semibold text-base animate-marquee">
                            {node.name}
                          </span>
                        )}
                      </div>
                      {node.type === 'ITEM' ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-sm">
                            Retail: <span className="font-bold text-primary">${node.customerPrice}</span>
                          </span>
                          {isUnlocked && (
                            <span className="text-sm text-green-600 font-medium bg-green-50 px-2 rounded-full border border-green-100">
                              Wholesale: ${node.wholesalePrice}
                            </span>
                          )}
                          {node.sph && (
                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md self-center">
                              SPH: {node.sph}
                            </span>
                          )}
                          {node.cyl && (
                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md self-center">
                              CYL: {node.cyl}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Category</span>
                      )}
                    </div>
                  </div>
                  {node.type === 'FOLDER' && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Wholesale Mode</DialogTitle>
            <DialogDescription>Enter the wholesale password to view wholesale prices.</DialogDescription>
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
    </div>
  );
}
