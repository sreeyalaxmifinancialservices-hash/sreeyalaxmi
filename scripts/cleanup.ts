import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function cleanup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("No MONGODB_URI"); process.exit(1); }
  
  await mongoose.connect(uri);
  console.log("Connected");
  
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  
  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log(`Dropped: ${col.name}`);
  }
  
  await mongoose.disconnect();
  console.log("All collections dropped. Run npm run seed now.");
}

cleanup().catch(e => { console.error(e); process.exit(1); });
