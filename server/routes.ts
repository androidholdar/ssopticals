import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import path from "path";
import express from "express";
import multer from "multer";
import fs from "fs";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "./db";
import { settings } from "@shared/schema";
import { eq } from "drizzle-orm";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  const hashedPassword = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return timingSafeEqual(hashedPassword, keyBuffer);
}

const upload = multer({ 
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Settings
  app.get(api.settings.get.path, async (req, res) => {
    const s = await storage.getSettings();
    res.json({ 
      hasPassword: !!s?.wholesalePasswordHash,
      hasMasterPassword: !!s?.masterPasswordHash 
    });
  });

  app.post(api.settings.setup.path, async (req, res) => {
    const { password } = req.body;
    const s = await storage.getSettings();
    if (s?.wholesalePasswordHash) {
      return res.status(400).json({ message: "Password already set" });
    }
    
    if (s) {
      await db.update(settings).set({ wholesalePasswordHash: hashPassword(password) }).where(eq(settings.id, s.id));
    } else {
      await storage.createSettings(hashPassword(password));
    }
    res.json({ success: true });
  });

  app.post(api.settings.verify.path, async (req, res) => {
    const { password } = req.body;
    const s = await storage.getSettings();
    if (!s) return res.status(400).json({ message: "Setup required" });

    const valid = verifyPassword(password, s.wholesalePasswordHash);
    res.json({ valid });
  });

  app.post(api.settings.changePassword.path, async (req, res) => {
    const { masterPassword, newPassword } = req.body;
    const s = await storage.getSettings();
    if (!s) return res.status(400).json({ message: "Setup required" });

    if (s.masterPasswordHash) {
      if (!masterPassword || !verifyPassword(masterPassword, s.masterPasswordHash)) {
        return res.status(401).json({ message: "Invalid master password" });
      }
    } else {
      if (!verifyPassword(masterPassword, s.wholesalePasswordHash)) {
        return res.status(401).json({ message: "Invalid current password" });
      }
    }

    await storage.updateSettings(hashPassword(newPassword));
    res.json({ success: true });
  });

  app.post("/api/settings/master-password", async (req, res) => {
    const { password } = req.body;
    const s = await storage.getSettings();

    if (s?.masterPasswordHash) {
      return res.status(400).json({
        message: "Master password already set. It cannot be changed."
      });
    }

    const hash = hashPassword(password);

    if (s) {
      await db
        .update(settings)
        .set({ masterPasswordHash: hash })
        .where(eq(settings.id, s.id));
    } else {
      await storage.createSettings("");
      const newS = await storage.getSettings();
      if (newS) {
        await db
          .update(settings)
          .set({ masterPasswordHash: hash })
          .where(eq(settings.id, newS.id));
      }
    }

    res.json({ success: true });
  });

  app.post("/api/settings/reset", async (req, res) => {
    const { masterPassword } = req.body;
    const s = await storage.getSettings();

    if (!s) return res.status(400).json({ message: "Setup required" });

    if (s.masterPasswordHash) {
      if (!masterPassword || !verifyPassword(masterPassword, s.masterPasswordHash)) {
        return res.status(401).json({ message: "Invalid master password" });
      }
    } else {
      if (!masterPassword || !verifyPassword(masterPassword, s.wholesalePasswordHash)) {
        return res.status(401).json({ message: "Invalid current password" });
      }
    }

    await db.update(settings).set({ wholesalePasswordHash: "" }).where(eq(settings.id, s.id));
    res.json({ success: true });
  });

  async function checkWholesaleAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const password = req.headers["x-wholesale-password"] as string;
    const s = await storage.getSettings();

    if (s && s.wholesalePasswordHash) {
      if (!password || !verifyPassword(password, s.wholesalePasswordHash)) {
        return res.status(403).json({ message: "Wholesale access required" });
      }
    }
    next();
  }

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const categoriesList = await storage.getCategories();
    res.json(categoriesList);
  });

  app.post(api.categories.create.path, checkWholesaleAuth, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
      }
    }
  });

  app.put(api.categories.update.path, checkWholesaleAuth, async (req, res) => {
    try {
      const input = api.categories.update.input.parse(req.body);
      const category = await storage.updateCategory(Number(req.params.id), input);
      res.json(category);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.categories.delete.path, checkWholesaleAuth, async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  // Customers
  app.get(api.customers.list.path, checkWholesaleAuth, async (req, res) => {
    const params = {
      search: req.query.search as string,
      from: req.query.from as string,
      to: req.query.to as string,
    };
    const customersList = await storage.getCustomers(params);
    res.json(customersList);
  });

  app.post(api.customers.create.path, checkWholesaleAuth, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.customers.get.path, checkWholesaleAuth, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.put(api.customers.update.path, checkWholesaleAuth, async (req, res) => {
    try {
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input);
      res.json(customer);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.customers.delete.path, checkWholesaleAuth, async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.status(204).send();
  });

  app.post("/api/customers/bulk-delete", checkWholesaleAuth, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "Invalid input" });
    await storage.deleteCustomersBulk(ids);
    res.json({ success: true });
  });

  // Presets
  app.get(api.presets.list.path, async (req, res) => {
    const presetsList = await storage.getPresets();
    res.json(presetsList);
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

  app.post("/api/restore", checkWholesaleAuth, upload.single("backup"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No backup file uploaded" });
      const rawData = fs.readFileSync(req.file.path, 'utf8');
      const data = JSON.parse(rawData);
      if (!data.categories || !data.customers) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }
      await storage.restoreBackup(data);
      fs.unlinkSync(req.file.path);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Restore failed: " + (err as Error).message });
    }
  });

  // ============================================================
  // AI Prescription Scan using Gemini Vision
  // ============================================================
  app.post("/api/scan-prescription", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image uploaded" });

      const imageData = fs.readFileSync(req.file.path);
      const base64Image = imageData.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: "GEMINI_API_KEY not configured" });
      }

      const prompt = `You are an optical prescription reader for an optical shop in India. Extract information from this handwritten prescription/chit/paper.

IMPORTANT RULES:
1. ANY eye power found on the paper ALWAYS goes into newPower fields (never oldPower)
2. oldPower fields should ALWAYS be empty string ""
3. If a field is not written on the paper, leave it as empty string ""
4. Do NOT guess or assume any values

Return ONLY a valid JSON object with exactly these keys:
{
  "name": "customer full name as written",
  "age": "age digits only",
  "mobile": "mobile number digits only no spaces no dashes",
  "address": "full address as written",
  "newPowerRightSph": "right eye SPH (e.g. -2.50 or +1.25)",
  "newPowerRightCyl": "right eye CYL",
  "newPowerRightAxis": "right eye AXIS",
  "newPowerRightAdd": "right eye ADD",
  "newPowerLeftSph": "left eye SPH",
  "newPowerLeftCyl": "left eye CYL",
  "newPowerLeftAxis": "left eye AXIS",
  "newPowerLeftAdd": "left eye ADD",
  "oldPowerRightSph": "",
  "oldPowerRightCyl": "",
  "oldPowerRightAxis": "",
  "oldPowerRightAdd": "",
  "oldPowerLeftSph": "",
  "oldPowerLeftCyl": "",
  "oldPowerLeftAxis": "",
  "oldPowerLeftAdd": "",
  "notes": "any other information on the paper"
}

Reading tips:
- R / RE / Right / Daya = Right eye
- L / LE / Left / Baya = Left eye  
- Keep + or - signs in SPH and CYL values
- Mobile: extract 10 digits only
- Return ONLY the JSON object, no extra text`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Image } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
          })
        }
      );

      fs.unlinkSync(req.file.path);

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error:", errText);
        return res.status(500).json({ message: "AI service error" });
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(422).json({ message: "Could not parse prescription" });

      const extracted = JSON.parse(jsonMatch[0]);
      res.json(extracted);

    } catch (err) {
      console.error("Scan error:", err);
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ message: "Failed to process image" });
    }
  });

  seedDatabase().catch(console.error);
  return httpServer;
}

export async function seedDatabase() {
  const existing = await storage.getCategories();
  if (existing.length === 0) {
    const sv = await storage.createCategory({ name: "Single Vision", type: "FOLDER" });
    const minus = await storage.createCategory({ name: "Minus (-)", type: "FOLDER", parentId: sv.id });
    const hc = await storage.createCategory({ name: "HC", type: "FOLDER", parentId: minus.id });
    await storage.createCategory({ 
      name: "-6.00 to -2.00", 
      type: "ITEM", 
      parentId: hc.id,
      customerPrice: 650,
      wholesalePrice: 520,
      sortOrder: 0
    });
    const arc = await storage.createCategory({ name: "ARC", type: "FOLDER", parentId: minus.id });
    await storage.createCategory({
      name: "-6.00 to -2.00",
      type: "ITEM",
      parentId: arc.id,
      customerPrice: 750,
      wholesalePrice: 600,
      sortOrder: 0
    });
    const plus = await storage.createCategory({ name: "Plus (+)", type: "FOLDER", parentId: sv.id });
    const bluecut = await storage.createCategory({ name: "BLUECUT", type: "FOLDER", parentId: plus.id });
    await storage.createCategory({
      name: "+2.00 to +6.00",
      type: "ITEM",
      parentId: bluecut.id,
      customerPrice: 1200,
      wholesalePrice: 900,
      sortOrder: 0
    });
    const defaultPreset = await storage.createPreset("Default Preset");
    await storage.activatePreset(defaultPreset.id);
  }
}
