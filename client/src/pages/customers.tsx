import { useState, useRef } from "react";
import { useCustomers, useCreateCustomer, useUploadPhoto, useDeleteCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import { usePresets } from "@/hooks/use-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Calendar as CalendarIcon, Camera, Upload, User, Users, MapPin, Phone, Eye, Trash2, ExternalLink, Edit2, X } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type GroupedCustomers = {
  today: any[];
  yesterday: any[];
  older: any[];
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers({ search });
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
    lensPowerCurrent: "",
    lensPowerPrevious: "",
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
        lensPowerCurrent: "",
        lensPowerPrevious: "",
        notes: "",
        prescriptionPhotoPath: ""
      });
      toast({ title: "Success", description: "Customer record created." });
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
      const { id, createdAt, ...updates } = selectedCustomer;
      await updateMutation.mutateAsync({
        id,
        ...updates,
        age: updates.age ? parseInt(updates.age) : undefined,
      });
      setIsEditMode(false);
      toast({ title: "Success", description: "Customer record updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer record?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedCustomer(null);
      toast({ title: "Success", description: "Customer record deleted." });
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
      case 'lens_power':
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <div className="relative">
              <Eye className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                className="pl-9"
                placeholder="R / L"
                value={currentData.lensPowerCurrent} 
                onChange={e => setter(e.target.value)} 
              />
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
              {/* Always show Date */}
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

              {/* Dynamic Fields from Preset */}
              {fields.map(field => (
                <div key={field.id} className={cn(
                  field.fieldKey === 'name' || field.fieldKey === 'address' || field.fieldKey === 'notes' ? "col-span-2" : "col-span-2 sm:col-span-1"
                )}>
                  {renderField(field.fieldKey, field.label)}
                </div>
              ))}
              
              {/* Photo Upload */}
              <div className="col-span-2 space-y-2">
                <Label>Prescription Photo</Label>
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {newCustomer.prescriptionPhotoPath ? (
                      <img 
                        src={newCustomer.prescriptionPhotoPath} 
                        alt="Prescription" 
                        className="max-h-32 object-contain rounded-md" 
                      />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload or take photo</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e, false)}
                    />
                  </div>
                </div>
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
                <Button variant="ghost" size="icon" onClick={() => setIsEditMode(true)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
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
                            <span className="text-sm text-muted-foreground">Click to upload or take photo</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={editFileInputRef}
                          onChange={(e) => handleFileChange(e, true)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending || uploadMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                    <p className="text-muted-foreground">{format(new Date(selectedCustomer.date), 'MMMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {selectedCustomer.mobile && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Number</Label>
                      <div className="flex items-center gap-2 font-medium">
                        <Phone className="w-4 h-4 text-primary" />
                        {selectedCustomer.mobile}
                      </div>
                    </div>
                  )}
                  {selectedCustomer.age && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Age</Label>
                      <div className="font-medium">{selectedCustomer.age} years</div>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Address</Label>
                      <div className="flex items-start gap-2 font-medium">
                        <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        {selectedCustomer.address}
                      </div>
                    </div>
                  )}
                  {selectedCustomer.lensPowerCurrent && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Lens Power</Label>
                      <div className="font-medium bg-secondary/50 p-2 rounded-md">{selectedCustomer.lensPowerCurrent}</div>
                    </div>
                  )}
                  {selectedCustomer.lensPowerPrevious && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Previous Lens Power</Label>
                      <div className="font-medium bg-secondary/30 p-2 rounded-md">{selectedCustomer.lensPowerPrevious}</div>
                    </div>
                  )}
                  {selectedCustomer.notes && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
                      <div className="font-medium bg-muted p-3 rounded-lg text-sm">{selectedCustomer.notes}</div>
                    </div>
                  )}
                </div>

                {selectedCustomer.prescriptionPhotoPath && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prescription Photo</Label>
                    </div>
                    <div 
                      className="border rounded-xl overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => setIsPhotoViewerOpen(true)}
                    >
                      <img 
                        src={selectedCustomer.prescriptionPhotoPath} 
                        alt="Prescription" 
                        className="w-full h-auto max-h-[300px] object-contain bg-muted/50" 
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-4">
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:text-destructive" 
                    onClick={() => handleDelete(selectedCustomer.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Record
                  </Button>
                  <Button onClick={() => setSelectedCustomer(null)}>Close</Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Photo Viewer Modal */}
      <Dialog open={isPhotoViewerOpen} onOpenChange={setIsPhotoViewerOpen}>
        <DialogContent className="max-w-[95vw] w-fit p-1 bg-black/90 border-none">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setIsPhotoViewerOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedCustomer?.prescriptionPhotoPath && (
              <img 
                src={selectedCustomer.prescriptionPhotoPath} 
                alt="Prescription Full View" 
                className="max-w-full max-h-[90vh] object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerCard({ customer, onClick }: { customer: any, onClick: () => void }) {
  return (
    <Card onClick={onClick} className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{customer.name}</h3>
            <p className="text-xs text-muted-foreground">{format(new Date(customer.date), 'MMM d, yyyy')}</p>
          </div>
          {customer.lensPowerCurrent && (
            <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
              {customer.lensPowerCurrent}
            </span>
          )}
        </div>
        
        <div className="space-y-1 text-sm text-muted-foreground">
          {customer.mobile && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              {customer.mobile}
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
