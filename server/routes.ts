import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import path from "path";
import express from "express";
import multer from "multer";
import fs from "fs";

// Simple password hashing (mock for now, use bcrypt in real prod if package avail, but sticking to standard deps)
// Actually, simple crypto hash is fine for this level.
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  const hashedPassword = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  const match = timingSafeEqual(hashedPassword, keyBuffer);
  return match;
}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Settings
  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json({ hasPassword: !!settings?.wholesalePasswordHash });
  });

  app.post(api.settings.setup.path, async (req, res) => {
    const { password } = req.body;
    const settings = await storage.getSettings();
    if (settings) {
      return res.status(400).json({ message: "Password already set" });
    }
    await storage.createSettings(hashPassword(password));
    res.json({ success: true });
  });

  app.post(api.settings.verify.path, async (req, res) => {
    const { password } = req.body;
    const settings = await storage.getSettings();
    if (!settings) return res.status(400).json({ message: "Setup required" });
    
    const valid = verifyPassword(password, settings.wholesalePasswordHash);
    res.json({ valid });
  });

  app.post(api.settings.changePassword.path, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const settings = await storage.getSettings();
    if (!settings) return res.status(400).json({ message: "Setup required" });

    if (!verifyPassword(oldPassword, settings.wholesalePasswordHash)) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    await storage.updateSettings(hashPassword(newPassword));
    res.json({ success: true });
  });

  app.post("/api/settings/reset", async (req, res) => {
    await storage.deleteSettings();
    res.json({ success: true });
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post(api.categories.create.path, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put(api.categories.update.path, async (req, res) => {
    try {
      const input = api.categories.update.input.parse(req.body);
      const category = await storage.updateCategory(Number(req.params.id), input);
      res.json(category);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  // Customers
  app.get(api.customers.list.path, async (req, res) => {
    const params = {
      search: req.query.search as string,
      from: req.query.from as string,
      to: req.query.to as string,
    };
    const customers = await storage.getCustomers(params);
    res.json(customers);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.put(api.customers.update.path, async (req, res) => {
    try {
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input);
      res.json(customer);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.customers.delete.path, async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.customers.uploadPhoto.path, upload.single("photo"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    
    // In a real app we might rename this or move it
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Presets
  app.get(api.presets.list.path, async (req, res) => {
    const presets = await storage.getPresets();
    res.json(presets);
  });

  app.post(api.presets.create.path, async (req, res) => {
    const { name } = req.body;
    const preset = await storage.createPreset(name);
    res.status(201).json(preset);
  });

  app.put(api.presets.updateFields.path, async (req, res) => {
    const { fields } = req.body;
    for (const field of fields) {
      await storage.updatePresetField(field.id, {
        isEnabled: field.isEnabled,
        orderIndex: field.orderIndex,
      });
    }
    res.json({ success: true });
  });

  app.post(api.presets.setActive.path, async (req, res) => {
    await storage.activatePreset(Number(req.params.id));
    res.json({ success: true });
  });

  // Backup and Restore
  app.get("/api/backup", async (req, res) => {
    try {
      const data = {
        categories: await storage.getCategories(),
        customers: await storage.getCustomers(),
        presets: await storage.getPresets(),
        settings: await storage.getSettings(),
        version: "1.0",
        timestamp: new Date().toISOString()
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=optician_backup.json');
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.post("/api/restore", upload.single("backup"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No backup file uploaded" });
      const rawData = fs.readFileSync(req.file.path, 'utf8');
      const data = JSON.parse(rawData);

      // Simple validation
      if (!data.categories || !data.customers) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      // Restore logic - we'll need a way to clear and insert
      // For simplicity in this fast mode, we'll suggest using a more robust method
      // but let's implement a basic version that replaces data
      await storage.restoreBackup(data);
      
      fs.unlinkSync(req.file.path);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Restore failed: " + (err as Error).message });
    }
  });

  // Seed the database on startup
  seedDatabase().catch(console.error);

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  const existing = await storage.getCategories();
  if (existing.length === 0) {
    // Single Vision
    const sv = await storage.createCategory({ name: "Single Vision", type: "FOLDER" });
    
    // Minus
    const minus = await storage.createCategory({ name: "Minus (-)", type: "FOLDER", parentId: sv.id });
    
    // HC
    const hc = await storage.createCategory({ name: "HC", type: "FOLDER", parentId: minus.id });
    await storage.createCategory({ 
      name: "-6.00 to -2.00", 
      type: "ITEM", 
      parentId: hc.id,
      customerPrice: 650,
      wholesalePrice: 520,
      fromPower: -6,
      toPower: -2
    });

    // ARC
    const arc = await storage.createCategory({ name: "ARC", type: "FOLDER", parentId: minus.id });
    await storage.createCategory({
      name: "-6.00 to -2.00",
      type: "ITEM",
      parentId: arc.id,
      customerPrice: 750,
      wholesalePrice: 600,
      fromPower: -6,
      toPower: -2
    });

    // Plus
    const plus = await storage.createCategory({ name: "Plus (+)", type: "FOLDER", parentId: sv.id });
    const bluecut = await storage.createCategory({ name: "BLUECUT", type: "FOLDER", parentId: plus.id });
    await storage.createCategory({
      name: "+2.00 to +6.00",
      type: "ITEM",
      parentId: bluecut.id,
      customerPrice: 1200,
      wholesalePrice: 900,
      fromPower: 2,
      toPower: 6
    });

    // Presets
    const defaultPreset = await storage.createPreset("Default Preset");
    await storage.activatePreset(defaultPreset.id);
  }
}
