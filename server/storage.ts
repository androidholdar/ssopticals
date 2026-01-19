import { db } from "./db";
import {
  categories,
  customers,
  formPresets,
  formPresetFields,
  settings,
  type Category,
  type Customer,
  type FormPreset,
  type FormPresetField,
  type Settings,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  type CreateCustomerRequest,
  type UpdateCustomerRequest,
  type CreatePresetRequest,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSettings(): Promise<Settings | undefined>;
  createSettings(passwordHash: string): Promise<Settings>;
  updateSettings(passwordHash: string): Promise<Settings>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: CreateCategoryRequest): Promise<Category>;
  updateCategory(id: number, updates: UpdateCategoryRequest): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Customers
  getCustomers(params?: { search?: string; from?: string; to?: string }): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: CreateCustomerRequest): Promise<Customer>;
  updateCustomer(id: number, updates: UpdateCustomerRequest): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Presets
  getPresets(): Promise<(FormPreset & { fields: FormPresetField[] })[]>;
  getPreset(id: number): Promise<(FormPreset & { fields: FormPresetField[] }) | undefined>;
  getActivePreset(): Promise<(FormPreset & { fields: FormPresetField[] }) | undefined>;
  createPreset(name: string): Promise<FormPreset>;
  updatePresetField(id: number, updates: Partial<FormPresetField>): Promise<void>;
  activatePreset(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).limit(1);
    return setting;
  }

  async createSettings(passwordHash: string): Promise<Settings> {
    const [setting] = await db.insert(settings).values({ wholesalePasswordHash: passwordHash }).returning();
    return setting;
  }

  async updateSettings(passwordHash: string): Promise<Settings> {
    // Upsert basically
    const existing = await this.getSettings();
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ wholesalePasswordHash: passwordHash, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    } else {
      return this.createSettings(passwordHash);
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: CreateCategoryRequest): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, updates: UpdateCategoryRequest): Promise<Category> {
    const [updated] = await db.update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    // Note: This needs to be recursive in real app, but for now we assume client or DB cascade handles it.
    // Ideally we delete children first. 
    await this.deleteCategoryChildren(id);
    await db.delete(categories).where(eq(categories.id, id));
  }

  private async deleteCategoryChildren(parentId: number) {
    const children = await db.select().from(categories).where(eq(categories.parentId, parentId));
    for (const child of children) {
      await this.deleteCategoryChildren(child.id);
      await db.delete(categories).where(eq(categories.id, child.id));
    }
  }

  // Customers
  async getCustomers(params?: { search?: string; from?: string; to?: string }): Promise<Customer[]> {
    let query = db.select().from(customers).orderBy(desc(customers.date), desc(customers.createdAt));
    
    const conditions = [];
    if (params?.search) {
      const searchLower = `%${params.search.toLowerCase()}%`;
      conditions.push(sql`lower(${customers.name}) LIKE ${searchLower} OR ${customers.mobile} LIKE ${searchLower}`);
    }
    if (params?.from) {
      conditions.push(gte(customers.date, params.from));
    }
    if (params?.to) {
      conditions.push(lte(customers.date, params.to));
    }

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: CreateCustomerRequest): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, updates: UpdateCustomerRequest): Promise<Customer> {
    const [updated] = await db.update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Presets
  async getPresets(): Promise<(FormPreset & { fields: FormPresetField[] })[]> {
    const presetsList = await db.select().from(formPresets);
    const results = [];
    for (const preset of presetsList) {
      const fields = await db.select().from(formPresetFields).where(eq(formPresetFields.presetId, preset.id)).orderBy(formPresetFields.orderIndex);
      results.push({ ...preset, fields });
    }
    return results;
  }

  async getPreset(id: number): Promise<(FormPreset & { fields: FormPresetField[] }) | undefined> {
    const [preset] = await db.select().from(formPresets).where(eq(formPresets.id, id));
    if (!preset) return undefined;
    const fields = await db.select().from(formPresetFields).where(eq(formPresetFields.presetId, preset.id)).orderBy(formPresetFields.orderIndex);
    return { ...preset, fields };
  }

  async getActivePreset(): Promise<(FormPreset & { fields: FormPresetField[] }) | undefined> {
    const [preset] = await db.select().from(formPresets).where(eq(formPresets.isActive, true));
    if (!preset) return undefined;
    const fields = await db.select().from(formPresetFields).where(eq(formPresetFields.presetId, preset.id)).orderBy(formPresetFields.orderIndex);
    return { ...preset, fields };
  }

  async createPreset(name: string): Promise<FormPreset> {
    const [preset] = await db.insert(formPresets).values({ name }).returning();
    
    // Create default fields
    const defaultFields = [
      { key: "name", label: "Full Name" },
      { key: "age", label: "Age" },
      { key: "address", label: "Address" },
      { key: "mobile", label: "Mobile Number" },
      { key: "lensPowerCurrent", label: "Current Lens Power" },
      { key: "lensPowerPrevious", label: "Previous Lens Power" },
      { key: "notes", label: "Notes" },
      { key: "photo", label: "Prescription Photo" },
    ];

    let index = 0;
    for (const f of defaultFields) {
      await db.insert(formPresetFields).values({
        presetId: preset.id,
        fieldKey: f.key,
        label: f.label,
        isEnabled: true,
        orderIndex: index++,
      });
    }

    return preset;
  }

  async updatePresetField(id: number, updates: Partial<FormPresetField>): Promise<void> {
    await db.update(formPresetFields).set(updates).where(eq(formPresetFields.id, id));
  }

  async activatePreset(id: number): Promise<void> {
    await db.update(formPresets).set({ isActive: false }); // Deactivate all
    await db.update(formPresets).set({ isActive: true }).where(eq(formPresets.id, id));
  }
}

export const storage = new DatabaseStorage();
