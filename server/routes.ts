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

/* =====================================================
   PASSWORD HELPERS (SAFE VERSION)
===================================================== */

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

function verifyPassword(password?: string, hash?: string): boolean {
  try {
    if (!password || !hash) return false;
    if (!hash.includes(":")) return false;

    const parts = hash.split(":");
    if (parts.length !== 2) return false;

    const [salt, key] = parts;
    if (!salt || !key) return false;

    const hashedPassword = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");

    if (hashedPassword.length !== keyBuffer.length) return false;

    return timingSafeEqual(hashedPassword, keyBuffer);
  } catch {
    return false;
  }
}

/* ===================================================== */

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /* ================= SETTINGS ================= */

  app.get(api.settings.get.path, async (_, res) => {
    const s = await storage.getSettings();

    res.json({
      hasPassword: !!s?.wholesalePasswordHash,
      hasMasterPassword: !!s?.masterPasswordHash,
    });
  });

  /* ---------- SETUP PASSWORD ---------- */

  app.post(api.settings.setup.path, async (req, res) => {
    const { password } = req.body;

    const s = await storage.getSettings();
    if (s?.wholesalePasswordHash)
      return res.status(400).json({ message: "Password already set" });

    const hash = hashPassword(password);

    if (s) {
      await db
        .update(settings)
        .set({ wholesalePasswordHash: hash })
        .where(eq(settings.id, s.id));
    } else {
      await storage.createSettings(hash);
    }

    res.json({ success: true });
  });

  /* ---------- VERIFY ---------- */

  app.post(api.settings.verify.path, async (req, res) => {
    const { password } = req.body;
    const s = await storage.getSettings();

    if (!s) return res.status(400).json({ message: "Setup required" });

    const valid = verifyPassword(password, s.wholesalePasswordHash ?? undefined);

    res.json({ valid });
  });

  /* ---------- CHANGE PASSWORD ---------- */

  app.post(api.settings.changePassword.path, async (req, res) => {
    const { masterPassword, newPassword } = req.body;

    const s = await storage.getSettings();
    if (!s) return res.status(400).json({ message: "Setup required" });

    const allowed = s.masterPasswordHash
      ? verifyPassword(masterPassword, s.masterPasswordHash)
      : verifyPassword(masterPassword, s.wholesalePasswordHash ?? undefined);

    if (!allowed)
      return res.status(401).json({ message: "Invalid password" });

    await storage.updateSettings(hashPassword(newPassword));

    res.json({ success: true });
  });

  /* ---------- MASTER PASSWORD ---------- */

  app.post("/api/settings/master-password", async (req, res) => {
    const { password } = req.body;
    const s = await storage.getSettings();

    if (s?.masterPasswordHash)
      return res.status(400).json({
        message: "Master password already set",
      });

    const hash = hashPassword(password);

    if (s) {
      await db
        .update(settings)
        .set({ masterPasswordHash: hash })
        .where(eq(settings.id, s.id));
    }

    res.json({ success: true });
  });

  /* ---------- RESET ---------- */

  app.post("/api/settings/reset", async (req, res) => {
    const { masterPassword } = req.body;

    const s = await storage.getSettings();
    if (!s) return res.status(400).json({ message: "Setup required" });

    const allowed = s.masterPasswordHash
      ? verifyPassword(masterPassword, s.masterPasswordHash)
      : verifyPassword(masterPassword, s.wholesalePasswordHash ?? undefined);

    if (!allowed)
      return res.status(401).json({ message: "Invalid password" });

    await db
      .update(settings)
      .set({ wholesalePasswordHash: null }) // ✅ FIXED
      .where(eq(settings.id, s.id));

    res.json({ success: true });
  });

  /* ---------- AUTH MIDDLEWARE ---------- */

  async function checkWholesaleAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const password = req.headers["x-wholesale-password"] as string;
    const s = await storage.getSettings();

    if (s?.wholesalePasswordHash) {
      if (!verifyPassword(password, s.wholesalePasswordHash))
        return res.status(403).json({ message: "Wholesale access required" });
    }

    next();
  }

  /* ================= CATEGORIES ================= */

  app.get(api.categories.list.path, async (_, res) => {
    res.json(await storage.getCategories());
  });

  app.post(api.categories.create.path, checkWholesaleAuth, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      res.status(201).json(await storage.createCategory(input));
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });

      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.categories.update.path, checkWholesaleAuth, async (req, res) => {
    const input = api.categories.update.input.parse(req.body);
    res.json(await storage.updateCategory(Number(req.params.id), input));
  });

  app.delete(api.categories.delete.path, checkWholesaleAuth, async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  /* ================= CUSTOMERS ================= */

  app.get(api.customers.list.path, checkWholesaleAuth, async (req, res) => {
    res.json(await storage.getCustomers(req.query as any));
  });

  app.post(api.customers.create.path, checkWholesaleAuth, async (req, res) => {
    const input = api.customers.create.input.parse(req.body);
    res.status(201).json(await storage.createCustomer(input));
  });

  app.get(api.customers.get.path, checkWholesaleAuth, async (req, res) => {
    const c = await storage.getCustomer(Number(req.params.id));
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  });

  app.put(api.customers.update.path, checkWholesaleAuth, async (req, res) => {
    const input = api.customers.update.input.parse(req.body);
    res.json(await storage.updateCustomer(Number(req.params.id), input));
  });

  app.delete(api.customers.delete.path, checkWholesaleAuth, async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
