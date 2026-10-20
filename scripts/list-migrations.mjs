#!/usr/bin/env node
/**
 * Lists the SQL migrations in the `migrations/` folder, in the order they
 * must be applied.
 *
 * Usage: node scripts/list-migrations.mjs
 */
import { readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "..", "migrations");

if (!existsSync(migrationsDir)) {
  console.error("No migrations folder was found.");
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

console.log("\nMigrations to apply, in order:\n");
files.forEach((file, index) => {
  console.log(`  ${String(index + 1).padStart(2, " ")}. ${file}`);
});
console.log(
  `\nRun each file in the Supabase SQL editor (or with psql) in this order.\n`
);
