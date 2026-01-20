import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useWholesale } from "@/hooks/use-wholesale";
import { type Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, FileText, Plus, Pencil, Trash2, ChevronRight, ChevronDown, DollarSign, Box, Search, Lock, Unlock } from "lucide-react";
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
import { useState } from "react";
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

const CategoryItem = ({ 
  node, 
  level = 0 
}: { 
  node: CategoryNode, 
  level?: number 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isUnlocked } = useWholesale();
  
  const hasChildren = node.children.length > 0;
  const isFolder = node.type === 'FOLDER';

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer",
          level > 0 && "ml-4 border-l border-border pl-4"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (isFolder) setIsOpen(!isOpen);
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {isFolder ? (
            isOpen ? <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" /> : <Folder className="w-5 h-5 text-primary/70 flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
          
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{node.name}</span>
            {!isFolder && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  Retail: <span className="font-semibold text-foreground">${node.customerPrice}</span>
                </span>
                {isUnlocked && (
                  <span className="flex items-center gap-0.5 text-green-600 font-medium bg-green-50 px-1 rounded">
                    Wholesale: ${node.wholesalePrice}
                  </span>
                )}
                {node.fromPower && (
                  <span className="text-xs border px-1 rounded bg-background">
                    {node.fromPower} to {node.toPower}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOpen && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map(child => (
            <CategoryItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { data: categories = [], isLoading } = useCategories();
  const { isUnlocked, lock, unlock } = useWholesale();
  const { toast } = useToast();
  const verify = useVerifyPassword();

  const [search, setSearch] = useState("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [password, setPassword] = useState("");

  const tree = buildTree(categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));

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
          <p className="text-muted-foreground">Browse and view lens retail and wholesale prices.</p>
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
        <div className="p-4 border-b bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input 
              className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Search lens by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-4 min-h-[400px]">
          {tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No lens categories found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map(node => (
                <CategoryItem 
                  key={node.id} 
                  node={node} 
                />
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

