#!/usr/bin/env node
// Usage: node scripts/create-user.mjs "Vollständiger Name" "email@example.com" "Passwort" [--local]
// Prints a ready-to-run `wrangler d1 execute` command that inserts the user
// with a PBKDF2 hash compatible with lib/auth.ts.

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

if (!name || !email || !password) {
  console.error("Usage: node scripts/create-user.mjs \"Vollständiger Name\" \"email@example.com\" \"Passwort\" [--local]");
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const saltHex = toHex(salt);
const hashHex = await derive(password, salt);

const sql = `INSERT INTO users (name, email, password_hash, password_salt) VALUES (${sqlString(name)}, ${sqlString(email.toLowerCase())}, ${sqlString(hashHex)}, ${sqlString(saltHex)});`;

console.log("\nFühre diesen Befehl im Projektordner aus (Datenbankname anpassen):\n");
console.log(`npx wrangler d1 execute <DATENBANKNAME> ${flag} --command "${sql.replaceAll('"', '\\"')}"\n`);
