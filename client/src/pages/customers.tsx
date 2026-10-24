import { useState, useRef, useEffect } from "react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer, useBulkDeleteCustomers } from "@/hooks/use-customers";
import { usePresets } from "@/hooks/use-presets";
import { type Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Calendar as CalendarIcon, User, Users, MapPin, Phone, Eye, Trash2, Edit2, X, Lock, ArrowUpDown, ArrowDown } from "lucide-react";
import { format, parse } from "date-fns";
import { useWholesale } from "@/hooks/use-wholesale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn, sanitizeMobileInput, isValidMobile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { OpticalPowerInput, cleanAndFormat } from "@/components/optical-power-input";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const { isUnlocked } = useWholesale();
  const { data: customers = [], isLoading } = useCustomers({ search: isUnlocked ? search : "" }, { enabled: isUnlocked });
  const { data: presets = [] } = usePresets();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const bulkDeleteMutation = useBulkDeleteCustomers();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isDialogOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDialogOpen]);

  const emptyCustomerState = {
    name: "",
    date: format(new Date(), 'dd/MM/yyyy'),
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
    notes: ""
  };

  const [newCustomer, setNewCustomer] = useState<any>(emptyCustomerState);

  // Helper to validate optical powers before save/update
  const validateOpticalPowers = (data: any): string | null => {
    const pairs = [
      { name: "New Power Right Eye", cyl: data.newPowerRightCyl, axis: data.newPowerRightAxis },
      { name: "New Power Left Eye", cyl: data.newPowerLeftCyl, axis: data.newPowerLeftAxis },
      { name: "Old Power Right Eye", cyl: data.oldPowerRightCyl, axis: data.oldPowerRightAxis },
      { name: "Old Power Left Eye", cyl: data.oldPowerLeftCyl, axis: data.oldPowerLeftAxis },
    ];

    for (const p of pairs) {
      const formattedCyl = cleanAndFormat("cyl", p.cyl || "");
      const formattedAxis = cleanAndFormat("axis", p.axis || "");

      if (formattedCyl !== "") {
        if (formattedAxis === "") {
          return `${p.name} has a CYL value but is missing a valid AXIS (5-180 in multiples of 5).`;
        }
        const axisNum = parseInt(formattedAxis, 10);
        if (isNaN(axisNum) || axisNum < 5 || axisNum > 180 || axisNum % 5 !== 0) {
          return `${p.name} AXIS must be between 5 and 180 in multiples of 5.`;
        }
      }
    }
    return null;
  };

  // Helper to format all optical fields in a customer object before saving
  const formatCustomerPowerFields = (data: any) => {
    return {
      ...data,
      newPowerRightSph: cleanAndFormat("sph", data.newPowerRightSph || ""),
      newPowerRightCyl: cleanAndFormat("cyl", data.newPowerRightCyl || ""),
      newPowerRightAxis: cleanAndFormat("cyl", data.newPowerRightCyl || "") === "" ? "" : cleanAndFormat("axis", data.newPowerRightAxis || ""),
      newPowerRightAdd: cleanAndFormat("add", data.newPowerRightAdd || ""),

      newPowerLeftSph: cleanAndFormat("sph", data.newPowerLeftSph || ""),
      newPowerLeftCyl: cleanAndFormat("cyl", data.newPowerLeftCyl || ""),
      newPowerLeftAxis: cleanAndFormat("cyl", data.newPowerLeftCyl || "") === "" ? "" : cleanAndFormat("axis", data.newPowerLeftAxis || ""),
      newPowerLeftAdd: cleanAndFormat("add", data.newPowerLeftAdd || ""),

      oldPowerRightSph: cleanAndFormat("sph", data.oldPowerRightSph || ""),
      oldPowerRightCyl: cleanAndFormat("cyl", data.oldPowerRightCyl || ""),
      oldPowerRightAxis: cleanAndFormat("cyl", data.oldPowerRightCyl || "") === "" ? "" : cleanAndFormat("axis", data.oldPowerRightAxis || ""),
      oldPowerRightAdd: cleanAndFormat("add", data.oldPowerRightAdd || ""),

      oldPowerLeftSph: cleanAndFormat("sph", data.oldPowerLeftSph || ""),
      oldPowerLeftCyl: cleanAndFormat("cyl", data.oldPowerLeftCyl || ""),
      oldPowerLeftAxis: cleanAndFormat("cyl", data.oldPowerLeftAxis || "") === "" ? "" : cleanAndFormat("axis", data.oldPowerLeftAxis || ""),
      oldPowerLeftAdd: cleanAndFormat("add", data.oldPowerLeftAdd || ""),
    };
  };

  // Move to Old Power implementation
  const handleMoveToOldPower = (isEdit: boolean) => {
    const currentData = isEdit ? selectedCustomer : newCustomer;
    if (!currentData) return;

    // Check CYL/AXIS validation for NEW POWER before moving
    const newRightCyl = cleanAndFormat("cyl", currentData.newPowerRightCyl || "");
    const newRightAxis = cleanAndFormat("axis", currentData.newPowerRightAxis || "");
    if (newRightCyl !== "" && newRightAxis === "") {
      return toast({
        title: "Incomplete New Power",
        description: "New Power Right Eye has CYL but no valid AXIS. Please enter AXIS before moving.",
        variant: "destructive"
      });
    }

    const newLeftCyl = cleanAndFormat("cyl", currentData.newPowerLeftCyl || "");
    const newLeftAxis = cleanAndFormat("axis", currentData.newPowerLeftAxis || "");
    if (newLeftCyl !== "" && newLeftAxis === "") {
      return toast({
        title: "Incomplete New Power",
        description: "New Power Left Eye has CYL but no valid AXIS. Please enter AXIS before moving.",
        variant: "destructive"
      });
    }

    const updateMap = {
      // Transfer to Old Power
      oldPowerRightSph: cleanAndFormat("sph", currentData.newPowerRightSph || ""),
      oldPowerRightCyl: newRightCyl,
      oldPowerRightAxis: newRightCyl === "" ? "" : newRightAxis,
      oldPowerRightAdd: cleanAndFormat("add", currentData.newPowerRightAdd || ""),

      oldPowerLeftSph: cleanAndFormat("sph", currentData.newPowerLeftSph || ""),
      oldPowerLeftCyl: newLeftCyl,
      oldPowerLeftAxis: newLeftCyl === "" ? "" : newLeftAxis,
      oldPowerLeftAdd: cleanAndFormat("add", currentData.newPowerLeftAdd || ""),

      // Clear New Power
      newPowerRightSph: "",
      newPowerRightCyl: "",
      newPowerRightAxis: "",
      newPowerRightAdd: "",

      newPowerLeftSph: "",
      newPowerLeftCyl: "",
      newPowerLeftAxis: "",
      newPowerLeftAdd: "",
    };

    if (isEdit) {
      setSelectedCustomer((prev: any) => prev ? ({ ...prev, ...updateMap }) : null);
    } else {
      setNewCustomer((prev: any) => ({ ...prev, ...updateMap }));
    }

    toast({
      title: "Moved to Old Power",
      description: "New Power values transferred to Old Power and cleared.",
    });
  };

  // Determine active preset fields
  const activePreset = presets.find(p => p.isActive) || presets[0];
  const fields = activePreset?.fields?.filter(f => f.isEnabled).sort((a, b) => a.orderIndex - b.orderIndex) || [];

  // Sort customers
  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      const dateA = a.date.includes('/') ? parse(a.date, 'dd/MM/yyyy', new Date()) : new Date(a.date);
      const dateB = b.date.includes('/') ? parse(b.date, 'dd/MM/yyyy', new Date()) : new Date(b.date);
      return dateB.getTime() - dateA.getTime(); // Newest first
    }
  });

  const validateDate = (dateStr: string) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(dateStr);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const form = (e.currentTarget as HTMLElement).closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!validateDate(newCustomer.date)) {
        return toast({
          title: "Invalid Date Format",
          description: "Please use dd/mm/yyyy format.",
          variant: "destructive"
        });
      }

      if (newCustomer.mobile && !isValidMobile(newCustomer.mobile)) {
        return toast({ 
          title: "Invalid Mobile Number", 
          description: "Mobile number must be 10 digits (or +91 followed by 10 digits).",
          variant: "destructive" 
        });
      }

      const opticalValidationError = validateOpticalPowers(newCustomer);
      if (opticalValidationError) {
        return toast({
          title: "Incomplete Prescription",
          description: opticalValidationError,
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

      const formattedData = formatCustomerPowerFields(newCustomer);
      const { age, ...rest } = formattedData;
      await createMutation.mutateAsync({
        ...rest,
        name: formattedData.name || "",
        date: formattedData.date || format(new Date(), 'dd/MM/yyyy'),
        age: age ? parseInt(age.toString()) : undefined,
      });
      setIsDialogOpen(false);
      setNewCustomer(emptyCustomerState);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create customer.", variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      if (!validateDate(selectedCustomer.date)) {
        return toast({
          title: "Invalid Date Format",
          description: "Please use dd/mm/yyyy format.",
          variant: "destructive"
        });
      }

      if (selectedCustomer.mobile && !isValidMobile(selectedCustomer.mobile)) {
        return toast({ 
          title: "Invalid Mobile Number", 
          description: "Mobile number must be 10 digits (or +91 followed by 10 digits).",
          variant: "destructive" 
        });
      }

      const opticalValidationError = validateOpticalPowers(selectedCustomer);
      if (opticalValidationError) {
        return toast({
          title: "Incomplete Prescription",
          description: opticalValidationError,
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

      const formattedData = formatCustomerPowerFields(selectedCustomer);
      const { id, createdAt, age, ...updates } = formattedData as any;
      await updateMutation.mutateAsync({
        id,
        ...updates,
        age: age ? parseInt(age.toString()) : undefined,
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected customer records?`)) return;
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      toast({ title: "Success", description: "Selected records deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete records.", variant: "destructive" });
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size === 0) setIsSelectionMode(false);
  };

  const handleLongPress = (id: number) => {
    if (!isUnlocked) return;
    setIsSelectionMode(true);
    const newSelected = new Set(selectedIds);
    newSelected.add(id);
    setSelectedIds(newSelected);
    window.navigator.vibrate?.(50);
  };

  const handlePowerChange = (
    fieldKey: string,
    val: string,
    isEdit: boolean
  ) => {
    const updateObj: any = { [fieldKey]: val };

    // If CYL is cleared, clear corresponding AXIS immediately
    if (fieldKey.endsWith("Cyl")) {
      const cleanCyl = cleanAndFormat("cyl", val);
      if (cleanCyl === "") {
        const axisKey = fieldKey.replace("Cyl", "Axis");
        updateObj[axisKey] = "";
      }
    }

    if (isEdit) {
      setSelectedCustomer((prev: any) => prev ? ({ ...prev, ...updateObj }) : null);
    } else {
      setNewCustomer((prev: any) => ({ ...prev, ...updateObj }));
    }
  };

  const handleCopyAdd = (isOld: boolean, isEdit: boolean) => {
    const currentData = isEdit ? selectedCustomer : newCustomer;
    if (!currentData) return;

    if (isOld) {
      const rightCyl = cleanAndFormat("cyl", currentData.oldPowerRightCyl || "");
      const rightAxis = cleanAndFormat("axis", currentData.oldPowerRightAxis || "");
      const updateMap: any = {
        oldPowerLeftAdd: currentData.oldPowerRightAdd || "",
      };
      if (rightCyl !== "") {
        updateMap.oldPowerLeftCyl = rightCyl;
        updateMap.oldPowerLeftAxis = rightAxis;
      } else {
        updateMap.oldPowerLeftCyl = "";
        updateMap.oldPowerLeftAxis = "";
      }
      if (isEdit) {
        setSelectedCustomer((prev: any) => prev ? ({ ...prev, ...updateMap }) : null);
      } else {
        setNewCustomer((prev: any) => ({ ...prev, ...updateMap }));
      }
    } else {
      const rightCyl = cleanAndFormat("cyl", currentData.newPowerRightCyl || "");
      const rightAxis = cleanAndFormat("axis", currentData.newPowerRightAxis || "");
      const updateMap: any = {
        newPowerLeftAdd: currentData.newPowerRightAdd || "",
      };
      if (rightCyl !== "") {
        updateMap.newPowerLeftCyl = rightCyl;
        updateMap.newPowerLeftAxis = rightAxis;
      } else {
        updateMap.newPowerLeftCyl = "";
        updateMap.newPowerLeftAxis = "";
      }
      if (isEdit) {
        setSelectedCustomer((prev: any) => prev ? ({ ...prev, ...updateMap }) : null);
      } else {
        setNewCustomer((prev: any) => ({ ...prev, ...updateMap }));
      }
    }
  };

  const renderField = (key: string, label: string, isEdit: boolean = false) => {
    const currentData = isEdit ? selectedCustomer : newCustomer;
    if (!currentData) return null;

    const setter = (val: any) => {
      if (isEdit) {
        setSelectedCustomer((prev: any) => prev ? ({ ...prev, [key]: val }) : null);
      } else {
        setNewCustomer((prev: any) => ({ ...prev, [key]: val }));
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
                ref={!isEdit ? nameInputRef : undefined}
                className="pl-9"
                value={currentData.name} 
                onChange={e => setter(e.target.value)}
                autoFocus={!isEdit}
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
                placeholder="10 digit or +91XXXXXXXXXX"
                value={currentData.mobile} 
                onChange={e => {
                  const val = sanitizeMobileInput(e.target.value);
                  setter(val);
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
                    <OpticalPowerInput
                      type="sph"
                      placeholder="SPH"
                      value={currentData.newPowerRightSph || ""}
                      onChange={(val) => handlePowerChange("newPowerRightSph", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <OpticalPowerInput
                      type="cyl"
                      placeholder="CYL"
                      value={currentData.newPowerRightCyl || ""}
                      onChange={(val) => handlePowerChange("newPowerRightCyl", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <OpticalPowerInput
                      type="axis"
                      placeholder="AXIS"
                      value={currentData.newPowerRightAxis || ""}
                      cylValue={currentData.newPowerRightCyl || ""}
                      onChange={(val) => handlePowerChange("newPowerRightAxis", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <OpticalPowerInput
                      type="add"
                      placeholder="Add."
                      value={currentData.newPowerRightAdd || ""}
                      onChange={(val) => handlePowerChange("newPowerRightAdd", val, isEdit)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Left Eye (L)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2.5 py-0 border border-foreground/60 font-medium hover:bg-accent"
                    onClick={() => handleCopyAdd(false, isEdit)}
                  >
                    Copy
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <OpticalPowerInput
                      type="sph"
                      placeholder="SPH"
                      value={currentData.newPowerLeftSph || ""}
                      onChange={(val) => handlePowerChange("newPowerLeftSph", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <OpticalPowerInput
                      type="cyl"
                      placeholder="CYL"
                      value={currentData.newPowerLeftCyl || ""}
                      onChange={(val) => handlePowerChange("newPowerLeftCyl", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <OpticalPowerInput
                      type="axis"
                      placeholder="AXIS"
                      value={currentData.newPowerLeftAxis || ""}
                      cylValue={currentData.newPowerLeftCyl || ""}
                      onChange={(val) => handlePowerChange("newPowerLeftAxis", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <OpticalPowerInput
                      type="add"
                      placeholder="Add."
                      value={currentData.newPowerLeftAdd || ""}
                      onChange={(val) => handlePowerChange("newPowerLeftAdd", val, isEdit)}
                    />
                  </div>
                </div>
              </div>

              {/* Move to Old Power Button */}
              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto font-medium text-xs shadow-sm border-primary/30 hover:bg-primary/5 hover:border-primary"
                  onClick={() => handleMoveToOldPower(isEdit)}
                >
                  <ArrowDown className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Move to Old Power
                </Button>
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
                    <OpticalPowerInput
                      type="sph"
                      placeholder="SPH"
                      value={currentData.oldPowerRightSph || ""}
                      onChange={(val) => handlePowerChange("oldPowerRightSph", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <OpticalPowerInput
                      type="cyl"
                      placeholder="CYL"
                      value={currentData.oldPowerRightCyl || ""}
                      onChange={(val) => handlePowerChange("oldPowerRightCyl", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <OpticalPowerInput
                      type="axis"
                      placeholder="AXIS"
                      value={currentData.oldPowerRightAxis || ""}
                      cylValue={currentData.oldPowerRightCyl || ""}
                      onChange={(val) => handlePowerChange("oldPowerRightAxis", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <OpticalPowerInput
                      type="add"
                      placeholder="Add."
                      value={currentData.oldPowerRightAdd || ""}
                      onChange={(val) => handlePowerChange("oldPowerRightAdd", val, isEdit)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Left Eye (L)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2.5 py-0 border border-foreground/60 font-medium hover:bg-accent"
                    onClick={() => handleCopyAdd(true, isEdit)}
                  >
                    Copy
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">SPH</Label>
                    <OpticalPowerInput
                      type="sph"
                      placeholder="SPH"
                      value={currentData.oldPowerLeftSph || ""}
                      onChange={(val) => handlePowerChange("oldPowerLeftSph", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">CYL</Label>
                    <OpticalPowerInput
                      type="cyl"
                      placeholder="CYL"
                      value={currentData.oldPowerLeftCyl || ""}
                      onChange={(val) => handlePowerChange("oldPowerLeftCyl", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">AXIS</Label>
                    <OpticalPowerInput
                      type="axis"
                      placeholder="AXIS"
                      value={currentData.oldPowerLeftAxis || ""}
                      cylValue={currentData.oldPowerLeftCyl || ""}
                      onChange={(val) => handlePowerChange("oldPowerLeftAxis", val, isEdit)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Add.</Label>
                    <OpticalPowerInput
                      type="add"
                      placeholder="Add."
                      value={currentData.oldPowerLeftAdd || ""}
                      onChange={(val) => handlePowerChange("oldPowerLeftAdd", val, isEdit)}
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

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display">Locked Content</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Please unlock the application from the sidebar or status bar to view customer records and prescriptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customer records and prescriptions.</p>
        </div>
        <div className="flex gap-2">
          {isSelectionMode && isUnlocked ? (
            <>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedIds.size})
              </Button>
              <Button variant="outline" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>
                Cancel
              </Button>
            </>
          ) : isUnlocked && (
            <Button onClick={() => setIsDialogOpen(true)} className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Customer
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-12 rounded-xl border-muted-foreground/20"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-muted-foreground/20">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 shadow-xl border-muted-foreground/20">
            <DropdownMenuItem onClick={() => setSortBy("date")}>
              Sort by Date {sortBy === "date" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("name")}>
              Sort by Name {sortBy === "name" && "✓"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedCustomers.map(c => (
            <CustomerCard
              key={c.id}
              customer={c}
              onClick={() => isSelectionMode ? toggleSelection(c.id) : setSelectedCustomer(c)}
              onLongPress={() => handleLongPress(c.id)}
              isSelected={selectedIds.has(c.id)}
              isSelectionMode={isSelectionMode}
            />
          ))}
        </div>

        {customers.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No customers found</p>
          </div>
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            nameInputRef.current?.focus();
          }}
          onKeyDown={handleKeyDown}
        >
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
                    type="text"
                    placeholder="dd/mm/yyyy"
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

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && (setSelectedCustomer(null), setIsEditMode(false))}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
          onKeyDown={isEditMode ? handleKeyDown : undefined}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{isEditMode ? "Edit Customer" : "Customer Details"}</DialogTitle>
              {!isEditMode && (
                <div className="flex gap-4 mr-8">
                  {isUnlocked && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditMode(true)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {isUnlocked && (
                    <Button variant="ghost" size="icon" onClick={() => selectedCustomer && handleDelete(selectedCustomer.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
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
                        type="text"
                        placeholder="dd/mm/yyyy"
                        className="pl-9"
                    value={selectedCustomer?.date || ""}
                    onChange={e => setSelectedCustomer(prev => prev ? ({ ...prev, date: e.target.value }) : null)}
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
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Record"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Date</Label>
                    <p className="text-lg font-medium">
                      {selectedCustomer?.date.includes('/')
                        ? selectedCustomer?.date
                        : format(new Date(selectedCustomer?.date || ""), 'dd/MM/yyyy')}
                    </p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Right Eye (R)</Label>
                        <div className="grid grid-cols-4 gap-2 text-center">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-4 mt-6">
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

    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
  onLongPress,
  isSelected,
  isSelectionMode
}: {
  customer: Customer,
  onClick: () => void,
  onLongPress: () => void,
  isSelected: boolean,
  isSelectionMode: boolean
}) {
  const { isUnlocked } = useWholesale();
  const displayDate = customer.date.includes('/')
    ? customer.date
    : format(new Date(customer.date), 'dd/MM/yyyy');

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // Cancel long-press if the window is scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    touchStartRef.current = coords;

    longPressTimer.current = setTimeout(onLongPress, 500);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const coords = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    const dx = Math.abs(coords.x - touchStartRef.current.x);
    const dy = Math.abs(coords.y - touchStartRef.current.y);

    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  };

  const handleEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    touchStartRef.current = null;
  };

  return (
    <Card 
      className={cn(
        "group hover-elevate active-elevate-2 cursor-pointer border-muted-foreground/10 overflow-hidden transition-all hover:border-primary/50 select-none",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
      )}
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          {isSelectionMode ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <Checkbox checked={isSelected} onCheckedChange={onClick} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <User className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <h4 className="font-bold text-lg break-words leading-tight flex-1">{customer.name}</h4>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter shrink-0 pt-1">{displayDate}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
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

      </CardContent>
    </Card>
  );
}
