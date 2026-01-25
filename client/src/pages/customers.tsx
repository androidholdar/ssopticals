import { useState, useRef } from "react";
import { useCustomers, useCreateCustomer, useUploadPhoto, useDeleteCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import { usePresets } from "@/hooks/use-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Calendar as CalendarIcon, Camera, Upload, User, Users, MapPin, Phone, Eye, Trash2, ExternalLink, Edit2, X, ZoomIn, ZoomOut, Maximize2, Share2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import QuickPinchZoom from "react-quick-pinch-zoom";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useWholesale } from "@/hooks/use-wholesale";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type GroupedCustomers = {
  today: any[];
  yesterday: any[];
  older: any[];
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { isUnlocked } = useWholesale();
  const { data: customers = [], isLoading } = useCustomers({ search: isUnlocked ? search : "" });
  const { data: presets = [] } = usePresets();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const uploadMutation = useUploadPhoto();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<any>({
    name: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    mobile: "",
    address: "",
    age: "",
    newPowerRightSph: "",
    newPowerRightCyl: "",
    newPowerRightAxis: "",
    newPowerRightAdd: "",
    newPowerLeftSph: "",
    newPowerLeftCyl: "",
    newPowerLeftAxis: "",
    newPowerLeftAdd: "",
    oldPowerRightSph: "",
    oldPowerRightCyl: "",
    oldPowerRightAxis: "",
    oldPowerRightAdd: "",
    oldPowerLeftSph: "",
    oldPowerLeftCyl: "",
    oldPowerLeftAxis: "",
    oldPowerLeftAdd: "",
    notes: "",
    prescriptionPhotoPath: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Determine active preset fields
  const activePreset = presets.find(p => p.isActive) || presets[0];
  const fields = activePreset?.fields?.filter(f => f.isEnabled).sort((a, b) => a.orderIndex - b.orderIndex) || [];

  // Group customers
  const grouped = customers.reduce((acc: GroupedCustomers, customer) => {
    const date = new Date(customer.date);
    if (isToday(date)) acc.today.push(customer);
    else if (isYesterday(date)) acc.yesterday.push(customer);
    else acc.older.push(customer);
    return acc;
  }, { today: [], yesterday: [], older: [] });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await uploadMutation.mutateAsync(file);
      if (isEdit) {
        setSelectedCustomer((prev: any) => ({ ...prev, prescriptionPhotoPath: url }));
      } else {
        setNewCustomer((prev: any) => ({ ...prev, prescriptionPhotoPath: url }));
      }
      toast({ title: "Photo Uploaded", description: "Prescription attached successfully." });
      
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    } catch (error) {
      toast({ title: "Upload Failed", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newCustomer.mobile && newCustomer.mobile.length !== 10) {
        return toast({ 
          title: "Invalid Mobile Number", 
          description: "Mobile number must be exactly 10 digits.", 
          variant: "destructive" 
        });
      }

      // Check for duplicate locally first for better UX
      const isDuplicate = customers.some(c => 
        c.name.toLowerCase() === newCustomer.name.toLowerCase() && 
        c.mobile === newCustomer.mobile
      );

      if (isDuplicate) {
        return toast({
          title: "Duplicate Entry",
          description: "A customer with this name and mobile number already exists.",
          variant: "destructive"
        });
      }

      await createMutation.mutateAsync({
        ...newCustomer,
        age: newCustomer.age ? parseInt(newCustomer.age) : undefined,
      });
      setIsDialogOpen(false);
      setNewCustomer({
        name: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        mobile: "",
        address: "",
        age: "",
        newPowerRightSph: "",
        newPowerRightCyl: "",
        newPowerRightAxis: "",
        newPowerRightAdd: "",
        newPowerLeftSph: "",
        newPowerLeftCyl: "",
        newPowerLeftAxis: "",
        newPowerLeftAdd: "",
        oldPowerRightSph: "",
        oldPowerRightCyl: "",
        oldPowerRightAxis: "",
        oldPowerRightAdd: "",
        oldPowerLeftSph: "",
        oldPowerLeftCyl: "",
        oldPowerLeftAxis: "",
        oldPowerLeftAdd: "",
        notes: "",
        prescriptionPhotoPath: ""
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create customer.", variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      if (selectedCustomer.mobile && selectedCustomer.mobile.length !== 10) {
        return toast({ 
          title: "Invalid Mobile Number", 
          description: "Mobile number must be exactly 10 digits.", 
          variant: "destructive" 
        });
      }

      // Check for duplicate (excluding the current customer being edited)
      const isDuplicate = customers.some(c => 
        c.id !== selectedCustomer.id &&
        c.name.toLowerCase() === selectedCustomer.name.toLowerCase() && 
        c.mobile === selectedCustomer.mobile
      );

      if (isDuplicate) {
        return toast({
          title: "Duplicate Entry",
          description: "Another customer with this name and mobile number already exists.",
          variant: "destructive"
        });
      }

      const { id, createdAt, ...updates } = selectedCustomer;
      await updateMutation.mutateAsync({
        id,
        ...updates,
        age: updates.age ? parseInt(updates.age) : undefined,
      });
      setIsEditMode(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer record?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedCustomer(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" });
    }
  };

  const renderField = (key: string, label: string, isEdit: boolean = false) => {
    const currentData = isEdit ? selectedCustomer : newCustomer;
    const setter = (val: any) => {
      if (isEdit) {
        setSelectedCustomer((prev: any) => ({ ...prev, [key === 'lens_power' ? 'lensPowerCurrent' : key]: val }));
      } else {
        setNewCustomer((prev: any) => ({ ...prev, [key === 'lens_power' ? 'lensPowerCurrent' : key]: val }));
      }
    };

    switch(key) {
      case 'name':
        return (
          <div className="space-y-2 col-span-2">
            <Label>{label}</Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                className="pl-9"
                value={currentData.name} 
                onChange={e => setter(e.target.value)}
                required 
              />
            </div>
          </div>
        );
      case 'mobile':
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                className="pl-9"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="10 digit number"
                value={currentData.mobile} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) {
                    setter(val);
                  }
                }} 
              />
            </div>
          </div>
        );
      case 'address':
        return (
          <div className="space-y-2 col-span-2">
            <Label>{label}</Label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                className="pl-9"
                value={currentData.address} 
                onChange={e => setter(e.target.value)} 
              />
            </div>
          </div>
        );
      case 'age':
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <Input 
              type="number"
              value={currentData.age} 
              onChange={e => setter(e.target.value)} 
            />
          </div>
        );
      case 'newPower':
        return (
          <div className="col-span-2 space-y-4 pt-2 border-t mt-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">New Power</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Right Eye (R)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <Input 
                      placeholder="SPH"
                      value={currentData.newPowerRightSph || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerRightSph: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerRightSph: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <Input 
                      placeholder="CYL"
                      value={currentData.newPowerRightCyl || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerRightCyl: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerRightCyl: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <Input 
                      placeholder="AXIS"
                      value={currentData.newPowerRightAxis || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerRightAxis: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerRightAxis: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <Input 
                      placeholder="Add."
                      value={currentData.newPowerRightAdd || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerRightAdd: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerRightAdd: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Left Eye (L)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <Input 
                      placeholder="SPH"
                      value={currentData.newPowerLeftSph || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerLeftSph: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerLeftSph: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <Input 
                      placeholder="CYL"
                      value={currentData.newPowerLeftCyl || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerLeftCyl: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerLeftCyl: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <Input 
                      placeholder="AXIS"
                      value={currentData.newPowerLeftAxis || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerLeftAxis: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerLeftAxis: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <Input 
                      placeholder="Add."
                      value={currentData.newPowerLeftAdd || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, newPowerLeftAdd: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, newPowerLeftAdd: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'oldPower':
        return (
          <div className="col-span-2 space-y-4 pt-2 border-t mt-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Old Power</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Right Eye (R)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <Input 
                      placeholder="SPH"
                      value={currentData.oldPowerRightSph || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerRightSph: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerRightSph: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <Input 
                      placeholder="CYL"
                      value={currentData.oldPowerRightCyl || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerRightCyl: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerRightCyl: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <Input 
                      placeholder="AXIS"
                      value={currentData.oldPowerRightAxis || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerRightAxis: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerRightAxis: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <Input 
                      placeholder="Add."
                      value={currentData.oldPowerRightAdd || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerRightAdd: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerRightAdd: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Left Eye (L)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <Input 
                      placeholder="SPH"
                      value={currentData.oldPowerLeftSph || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerLeftSph: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerLeftSph: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <Input 
                      placeholder="CYL"
                      value={currentData.oldPowerLeftCyl || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerLeftCyl: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerLeftCyl: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <Input 
                      placeholder="AXIS"
                      value={currentData.oldPowerLeftAxis || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerLeftAxis: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerLeftAxis: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <Input 
                      placeholder="Add."
                      value={currentData.oldPowerLeftAdd || ""} 
                      onChange={e => {
                        if (isEdit) {
                          setSelectedCustomer((prev: any) => ({ ...prev, oldPowerLeftAdd: e.target.value }));
                        } else {
                          setNewCustomer((prev: any) => ({ ...prev, oldPowerLeftAdd: e.target.value }));
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
       case 'notes':
        return (
          <div className="space-y-2 col-span-2">
            <Label>{label}</Label>
            <Textarea 
              value={currentData.notes} 
              onChange={e => setter(e.target.value)} 
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customer records and prescriptions.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input 
          className="pl-9 h-12 rounded-xl border-muted-foreground/20" 
          placeholder="Search by name or mobile..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {grouped.today.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Today</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.today.map(c => <CustomerCard key={c.id} customer={c} onClick={() => setSelectedCustomer(c)} />)}
            </div>
          </section>
        )}

        {grouped.yesterday.length > 0 && (
          <section>
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Yesterday</h3>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.yesterday.map(c => <CustomerCard key={c.id} customer={c} onClick={() => setSelectedCustomer(c)} />)}
            </div>
          </section>
        )}

        {grouped.older.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-1">Older</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.older.map(c => <CustomerCard key={c.id} customer={c} onClick={() => setSelectedCustomer(c)} />)}
            </div>
          </section>
        )}

        {customers.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No customers found</p>
          </div>
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Customer Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Date</Label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="pl-9"
                    value={newCustomer.date}
                    onChange={e => setNewCustomer({ ...newCustomer, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {fields.map(field => (
                <div key={field.id} className={cn(
                  field.fieldKey === 'name' || field.fieldKey === 'address' || field.fieldKey === 'notes' ? "col-span-2" : "col-span-2 sm:col-span-1"
                )}>
                  {renderField(field.fieldKey, field.label, false)}
                </div>
              ))}

              <div className="col-span-2 space-y-2">
                <Label>Prescription Photo</Label>
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {newCustomer.prescriptionPhotoPath ? (
                      <div className="relative">
                        <img 
                          src={newCustomer.prescriptionPhotoPath} 
                          alt="Prescription" 
                          className="max-h-32 object-contain rounded-md" 
                        />
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewCustomer({ ...newCustomer, prescriptionPhotoPath: "" });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Attach Prescription</span>
                      </>
                    )}
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e, false)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || uploadMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && (setSelectedCustomer(null), setIsEditMode(false))}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{isEditMode ? "Edit Customer" : "Customer Details"}</DialogTitle>
              {!isEditMode && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsEditMode(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedCustomer.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedCustomer && (
            isEditMode ? (
              <form onSubmit={handleUpdate} className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Date</Label>
                    <div className="relative">
                      <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input 
                        type="date"
                        className="pl-9"
                        value={selectedCustomer.date}
                        onChange={e => setSelectedCustomer({ ...selectedCustomer, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  {fields.map(field => (
                    <div key={field.id} className={cn(
                      field.fieldKey === 'name' || field.fieldKey === 'address' || field.fieldKey === 'notes' ? "col-span-2" : "col-span-2 sm:col-span-1"
                    )}>
                      {renderField(field.fieldKey, field.label, true)}
                    </div>
                  ))}
                  <div className="col-span-2 space-y-2">
                    <Label>Prescription Photo</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => editFileInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {selectedCustomer.prescriptionPhotoPath ? (
                          <div className="relative">
                            <img 
                              src={selectedCustomer.prescriptionPhotoPath} 
                              alt="Prescription" 
                              className="max-h-32 object-contain rounded-md" 
                            />
                            <Button 
                              size="icon" 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer({ ...selectedCustomer, prescriptionPhotoPath: "" });
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Select Photo</span>
                          </>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-12 w-12"
                        onClick={() => {
                          if (editFileInputRef.current) {
                            editFileInputRef.current.setAttribute('capture', 'environment');
                            editFileInputRef.current.click();
                          }
                        }}
                      >
                        <Camera className="w-5 h-5" />
                      </Button>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={editFileInputRef}
                      onChange={(e) => handleFileChange(e, true)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending || uploadMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Record"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Date</Label>
                    <p className="text-lg font-medium">{format(new Date(selectedCustomer.date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Name</Label>
                    <p className="text-lg font-medium">{selectedCustomer.name}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Mobile</Label>
                    {isUnlocked ? (
                      <p className="text-lg font-medium">{selectedCustomer.mobile || 'No mobile'}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-lg font-medium tracking-widest">••••••••••</span>
                      </div>
                    )}
                  </div>
                  {selectedCustomer.age && (
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Age</Label>
                      <p className="text-lg font-medium">{selectedCustomer.age}</p>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Address</Label>
                      <p className="text-lg font-medium">{selectedCustomer.address}</p>
                    </div>
                  )}
                  
                  <div className="col-span-2 border-t pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-4">New Power</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Right Eye (R)</Label>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><span className="text-[10px] text-muted-foreground uppercase block">SPH</span><span className="font-medium">{selectedCustomer.newPowerRightSph || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">CYL</span><span className="font-medium">{selectedCustomer.newPowerRightCyl || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">AXIS</span><span className="font-medium">{selectedCustomer.newPowerRightAxis || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">Add.</span><span className="font-medium">{selectedCustomer.newPowerRightAdd || '-'}</span></div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Left Eye (L)</Label>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div><span className="text-[10px] text-muted-foreground uppercase block">SPH</span><span className="font-medium">{selectedCustomer.newPowerLeftSph || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">CYL</span><span className="font-medium">{selectedCustomer.newPowerLeftCyl || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">AXIS</span><span className="font-medium">{selectedCustomer.newPowerLeftAxis || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">Add.</span><span className="font-medium">{selectedCustomer.newPowerLeftAdd || '-'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Old Power</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Right Eye (R)</Label>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div><span className="text-[10px] text-muted-foreground uppercase block">SPH</span><span className="font-medium">{selectedCustomer.oldPowerRightSph || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">CYL</span><span className="font-medium">{selectedCustomer.oldPowerRightCyl || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">AXIS</span><span className="font-medium">{selectedCustomer.oldPowerRightAxis || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">Add.</span><span className="font-medium">{selectedCustomer.oldPowerRightAdd || '-'}</span></div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Left Eye (L)</Label>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div><span className="text-[10px] text-muted-foreground uppercase block">SPH</span><span className="font-medium">{selectedCustomer.oldPowerLeftSph || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">CYL</span><span className="font-medium">{selectedCustomer.oldPowerLeftCyl || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">AXIS</span><span className="font-medium">{selectedCustomer.oldPowerLeftAxis || '-'}</span></div>
                          <div><span className="text-[10px] text-muted-foreground uppercase block">Add.</span><span className="font-medium">{selectedCustomer.oldPowerLeftAdd || '-'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedCustomer.notes && (
                    <div className="col-span-2 border-t pt-4">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Notes</Label>
                      <p className="whitespace-pre-wrap mt-1">{selectedCustomer.notes}</p>
                    </div>
                  )}
                  
                  {selectedCustomer.prescriptionPhotoPath && (
                    <div className="col-span-2 border-t pt-4">
                      <Label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Prescription Photo</Label>
                      <div 
                        className="relative group cursor-zoom-in rounded-xl overflow-hidden border bg-muted"
                        onClick={() => setIsPhotoViewerOpen(true)}
                      >
                        <img 
                          src={selectedCustomer.prescriptionPhotoPath} 
                          alt="Prescription" 
                          className="w-full h-auto max-h-[300px] object-contain transition-transform group-hover:scale-[1.02]" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Record
                  </Button>
                  <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setSelectedCustomer(null)}>Close</Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={isPhotoViewerOpen} onOpenChange={setIsPhotoViewerOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>Prescription Photo Viewer</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-full flex flex-col">
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <Button 
                size="icon" 
                variant="secondary" 
                className="rounded-full bg-white/10 hover:bg-white/20 border-none text-white"
                onClick={() => setIsPhotoViewerOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              <QuickPinchZoom onUpdate={({ x, y, scale }) => {
                const img = document.getElementById('zoom-img');
                if (img) img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
              }}>
                <img 
                  id="zoom-img"
                  src={selectedCustomer?.prescriptionPhotoPath} 
                  alt="Full Prescription" 
                  className="max-w-full max-h-full object-contain"
                />
              </QuickPinchZoom>
            </div>
            
            <div className="bg-black/50 backdrop-blur-md p-4 flex items-center justify-between text-white border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold leading-none">{selectedCustomer?.name}</p>
                  <p className="text-xs text-white/60 mt-1">{format(new Date(selectedCustomer?.date || new Date()), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  onClick={async () => {
                    try {
                      const response = await fetch(selectedCustomer.prescriptionPhotoPath);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `prescription_${selectedCustomer.name}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      toast({ title: "Download Failed", variant: "destructive" });
                    }
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerCard({ customer, onClick }: { customer: any, onClick: () => void }) {
  const { isUnlocked } = useWholesale();
  return (
    <Card 
      className="group hover-elevate active-elevate-2 cursor-pointer border-muted-foreground/10 overflow-hidden transition-all hover:border-primary/50" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-lg truncate leading-tight">{customer.name}</h4>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter shrink-0">{format(new Date(customer.date), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{isUnlocked ? (customer.mobile || 'No mobile') : '••••••••••'}</span>
              </div>
              {customer.age && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>Age {customer.age}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {customer.prescriptionPhotoPath && (
          <div className="h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
        )}
      </CardContent>
    </Card>
  );
}
