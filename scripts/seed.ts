import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import User from "@/lib/models/User";
import Setting from "@/lib/models/Setting";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const log = (msg: string) => console.log(`[SEED] ${msg}`);

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  log("Connected to MongoDB");

  log("Seeding default settings...");
  for (const s of DEFAULT_SETTINGS) {
    await Setting.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }
  log(`Created ${DEFAULT_SETTINGS.length} default settings`);

  const existingAdmin = await User.findOne({ email: "sreeyalaxmifinancialservices@gmail.com" });
  if (existingAdmin) {
    log("Admin user already exists. Skipping creation.");
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash("@Sreeyalaxmi.2026", 10);
  await User.create({
    name: "Admin",
    email: "sreeyalaxmifinancialservices@gmail.com",
    password,
    role: "admin",
    isActive: true,
  });
  log("Created admin user (sreeyalaxmifinancialservices@gmail.com / @Sreeyalaxmi.2026)");

  await mongoose.disconnect();
  log("Disconnected from MongoDB");
}

seed().catch((err) => {
  console.error("[SEED] Error:", err);
  process.exit(1);
});
