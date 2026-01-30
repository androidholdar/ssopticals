import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  wholesalePasswordHash: text("wholesale_password_hash").notNull(),
  masterPasswordHash: text("master_password_hash"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"), // Self-reference handled in application logic or separate relation if needed
  name: text("name").notNull(),
  type: text("type").notNull().default("FOLDER"), // "FOLDER" or "ITEM"
  customerPrice: real("customer_price"),
  wholesalePrice: real("wholesale_price"),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // Date string dd/mm/yyyy
  name: text("name").notNull(),
  age: integer("age"),
  address: text("address"),
  mobile: text("mobile"),
  newPowerRightSph: text("new_power_right_sph"),
  newPowerRightCyl: text("new_power_right_cyl"),
  newPowerRightAxis: text("new_power_right_axis"),
  newPowerRightAdd: text("new_power_right_add"),
  newPowerLeftSph: text("new_power_left_sph"),
  newPowerLeftCyl: text("new_power_left_cyl"),
  newPowerLeftAxis: text("new_power_left_axis"),
  newPowerLeftAdd: text("new_power_left_add"),
  oldPowerRightSph: text("old_power_right_sph"),
  oldPowerRightCyl: text("old_power_right_cyl"),
  oldPowerRightAxis: text("old_power_right_axis"),
  oldPowerRightAdd: text("old_power_right_add"),
  oldPowerLeftSph: text("old_power_left_sph"),
  oldPowerLeftCyl: text("old_power_left_cyl"),
  oldPowerLeftAxis: text("old_power_left_axis"),
  oldPowerLeftAdd: text("old_power_left_add"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formPresets = pgTable("form_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").default(false),
});

export const formPresetFields = pgTable("form_preset_fields", {
  id: serial("id").primaryKey(),
  presetId: integer("preset_id").notNull(),
  fieldKey: text("field_key").notNull(), // e.g., "age", "address"
  label: text("label").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  orderIndex: integer("order_index").notNull(),
});

// === RELATIONS ===

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, {
    relationName: "category_parent",
  }),
}));

export const formPresetFieldsRelations = relations(formPresetFields, ({ one }) => ({
  preset: one(formPresets, {
    fields: [formPresetFields.presetId],
    references: [formPresets.id],
  }),
}));

export const formPresetsRelations = relations(formPresets, ({ many }) => ({
  fields: many(formPresetFields),
}));

// === ZOD SCHEMAS ===

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertFormPresetSchema = createInsertSchema(formPresets).omit({ id: true });
export const insertFormPresetFieldSchema = createInsertSchema(formPresetFields).omit({ id: true });

// === EXPLICIT TYPES ===

export type Settings = typeof settings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type FormPreset = typeof formPresets.$inferSelect;
export type FormPresetField = typeof formPresetFields.$inferSelect;

// Request Types
export type CreateCategoryRequest = z.infer<typeof insertCategorySchema>;
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export type CreateCustomerRequest = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export type CreatePresetRequest = z.infer<typeof insertFormPresetSchema>;
export type UpdatePresetRequest = Partial<CreatePresetRequest>;
export type BulkUpdatePresetFieldsRequest = {
  fields: (Partial<z.infer<typeof insertFormPresetFieldSchema>> & { id: number })[];
};

export type SetPasswordRequest = { password: string };
export type CheckPasswordRequest = { password: string };
export type ChangePasswordRequest = { oldPassword: string; newPassword: string };

// Response Types (Extended)
export type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };
export type PresetWithFields = FormPreset & { fields: FormPresetField[] };
