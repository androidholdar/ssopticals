import { useState, useEffect } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useWholesale } from "@/hooks/use-wholesale";
import { type Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  DollarSign, 
  Box,
  Search
} from "lucide-react";
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

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();
  const { isUnlocked } = useWholesale();

  const [search, setSearch] = useState("");
  const [editingNode, setEditingNode] = useState<Partial<Category> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState<number[]>([]);

  // Navigation Logic
  const currentId = currentPath[currentPath.length - 1] || null;
  
  const displayCategories = categories.filter(c => {
    const nameMatches = c.name.toLowerCase().includes(search.toLowerCase());
    const isChild = c.parentId === currentId;
    return isChild && nameMatches;
  }).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  const handleBack = () => {
    setCurrentPath(prev => prev.slice(0, -1));
  };

  const handleNavigate = (id: number) => {
    setCurrentPath(prev => [...prev, id]);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (currentPath.length > 0) {
        handleBack();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPath]);

  const handleAdd = (parentId: number | null) => {
    setEditingNode({ type: 'FOLDER', parentId, name: '', sortOrder: 0 });
    setIsDialogOpen(true);
  };

  const handleAddLensDetail = (parentId: number | null) => {
    setEditingNode({ type: 'ITEM', parentId, name: '', sortOrder: 0, sph: '', cyl: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingNode(category);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast({ title: "Deleted", description: "Category removed successfully." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    try {
      if ('id' in editingNode && editingNode.id) {
        await updateMutation.mutateAsync({ id: editingNode.id, ...editingNode });
        toast({ title: "Updated", description: "Category updated successfully." });
      } else {
        await createMutation.mutateAsync(editingNode as any);
        toast({ title: "Created", description: "Category created successfully." });
      }
      setIsDialogOpen(false);
      setEditingNode(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading lens...</div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Lens</h1>
          <p className="text-muted-foreground">Manage lens categories and pricing.</p>
        </div>
        <Button onClick={() => handleAdd(currentId)} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New {currentId ? 'Sub-category' : 'Root Category'}
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center gap-4">
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
                placeholder="Search lens..."
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
              <p>No items found. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {displayCategories.map(node => (
                <div 
                  key={node.id}
                  className={cn(
                    "group flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-xl transition-all border border-transparent hover:border-border",
                    node.type === 'FOLDER' && "cursor-pointer"
                  )}
                  onClick={() => node.type === 'FOLDER' && handleNavigate(node.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {node.type === 'FOLDER' ? (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Folder className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-base truncate">{node.name}</span>
                      {node.type === 'ITEM' ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                          <span>Retail: <span className="font-bold text-foreground">${node.customerPrice}</span></span>
                          {isUnlocked && <span className="text-green-600 font-medium">Wholesale: ${node.wholesalePrice}</span>}
                          {node.sph && <span>SPH: {node.sph}</span>}
                          {node.cyl && <span>CYL: {node.cyl}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Category</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    {node.type === 'FOLDER' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleAdd(node.id); }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Sub-category
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                          onClick={(e) => { e.stopPropagation(); handleAddLensDetail(node.id); }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> Lens Detail
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(node); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {node.type === 'FOLDER' && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50 ml-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{'id' in (editingNode || {}) ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={editingNode?.type} 
                  onValueChange={(val) => setEditingNode(prev => ({ ...prev, type: val as "FOLDER" | "ITEM" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOLDER">Folder</SelectItem>
                    <SelectItem value="ITEM">Item (Lens)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={editingNode?.name || ''} 
                  onChange={e => setEditingNode(prev => ({ ...prev, name: e.target.value }))}
                  required 
                />
              </div>
            </div>

            {editingNode?.type === 'ITEM' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Retail Price</Label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        value={editingNode?.customerPrice || ''} 
                        onChange={e => setEditingNode(prev => ({ ...prev, customerPrice: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Wholesale Price</Label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9"
                        value={editingNode?.wholesalePrice || ''} 
                        onChange={e => setEditingNode(prev => ({ ...prev, wholesalePrice: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SPH</Label>
                    <Input 
                      placeholder="e.g. -2.00 to +2.00"
                      value={editingNode?.sph || ''} 
                      onChange={e => setEditingNode(prev => ({ ...prev, sph: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CYL</Label>
                    <Input 
                      placeholder="e.g. up to -2.00"
                      value={editingNode?.cyl || ''} 
                      onChange={e => setEditingNode(prev => ({ ...prev, cyl: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              This will permanently delete this category and all its subcategories. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
