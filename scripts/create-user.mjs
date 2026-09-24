#!/usr/bin/env node
// Usage: node scripts/create-user.mjs "Vollständiger Name" "email@example.com" "Passwort" [--local] [--admin]
// Prints a ready-to-run `wrangler d1 execute` command that creates the user (or, if the
// email already exists, resets its password/name/role) with a PBKDF2 hash compatible with
// lib/auth.ts. Use --admin to grant the "Administrator" role. Since this upserts by email,
// it also doubles as the recovery path for a lost/forgotten login: re-run it with the same
// email and a new password to regain access without needing the old credentials.
// Normal day-to-day access management should go through the in-app admin UI at /admin/users
// once at least one admin account exists.

const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function derive(password, salt) {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const [name, email, password] = process.argv.slice(2).filter(a => !a.startsWith("--"));
const flag = process.argv.includes("--local") ? "--local" : "--remote";
const role = process.argv.includes("--admin") ? "admin" : "user";

if (!name || !email || !password) {
  console.error("Usage: node scripts/create-user.mjs \"Vollständiger Name\" \"email@example.com\" \"Passwort\" [--local] [--admin]");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Das Passwort muss mindestens 10 Zeichen lang sein.");
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const saltHex = toHex(salt);
const hashHex = await derive(password, salt);

const sql = `INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (${sqlString(name)}, ${sqlString(email.toLowerCase())}, ${sqlString(hashHex)}, ${sqlString(saltHex)}, ${sqlString(role)}) ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, password_salt = excluded.password_salt, role = excluded.role;`;

console.log("\nFühre diesen Befehl im Projektordner aus (Datenbankname anpassen):\n");
console.log(`npx wrangler d1 execute <DATENBANKNAME> ${flag} --command "${sql.replaceAll('"', '\\"')}"\n`);
