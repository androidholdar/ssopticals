import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useWholesale } from "@/hooks/use-wholesale";
import { type Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, FileText, Plus, Pencil, Trash2, ChevronRight, ChevronDown, DollarSign, Box } from "lucide-react";
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

  // Sort by folder first, then sortOrder
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
  onAdd, 
  onEdit, 
  onDelete, 
  level = 0 
}: { 
  node: CategoryNode, 
  onAdd: (id: number) => void, 
  onEdit: (node: Category) => void, 
  onDelete: (id: number) => void, 
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

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFolder && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isOpen && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map(child => (
            <CategoryItem 
              key={child.id} 
              node={child} 
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingNode, setEditingNode] = useState<Partial<Category> | null>(null);
  const [parentIdForAdd, setParentIdForAdd] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const tree = buildTree(categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));

  const handleAdd = (parentId: number | null) => {
    setEditingNode({ type: 'FOLDER', parentId, name: '', sortOrder: 0 });
    setParentIdForAdd(parentId);
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingNode(category);
    setParentIdForAdd(category.parentId);
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
        // Edit
        await updateMutation.mutateAsync({ id: editingNode.id, ...editingNode });
        toast({ title: "Updated", description: "Category updated successfully." });
      } else {
        // Create
        await createMutation.mutateAsync(editingNode as any);
        toast({ title: "Created", description: "Category created successfully." });
      }
      setIsDialogOpen(false);
      setEditingNode(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading inventory...</div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Lens</h1>
          <p className="text-muted-foreground">Manage lens categories and pricing.</p>
        </div>
        <Button onClick={() => handleAdd(null)} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Root Category
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <div className="relative">
            <input 
              className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Box className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          </div>
        </div>
        
        <div className="p-4 min-h-[400px]">
          {tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No categories found. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map(node => (
                <CategoryItem 
                  key={node.id} 
                  node={node} 
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
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
                    <Label>Power From</Label>
                    <Input 
                      type="number" step="0.25"
                      value={editingNode?.fromPower || ''} 
                      onChange={e => setEditingNode(prev => ({ ...prev, fromPower: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Power To</Label>
                    <Input 
                      type="number" step="0.25"
                      value={editingNode?.toPower || ''} 
                      onChange={e => setEditingNode(prev => ({ ...prev, toPower: parseFloat(e.target.value) }))}
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
