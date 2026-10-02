#!/bin/bash
# Setzt ein neues CRM-Passwort direkt in der Datenbank. Das Passwort wird verdeckt eingegeben und nirgends gespeichert.
set -euo pipefail
cd "$(dirname "$0")"
read -r -p "E-Mail des Kontos [jk@ki-masterclass.com]: " EMAIL; EMAIL=${EMAIL:-jk@ki-masterclass.com}
read -r -s -p "Neues Passwort: " PW1; echo
read -r -s -p "Neues Passwort wiederholen: " PW2; echo
[ "$PW1" = "$PW2" ] || { echo "Passwörter stimmen nicht überein."; exit 1; }
[ ${#PW1} -ge 10 ] || { echo "Bitte mindestens 10 Zeichen."; exit 1; }
SQL=$(PW="$PW1" EM="$EMAIL" node --input-type=module -e '
const enc=new TextEncoder(); const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
const salt=crypto.getRandomValues(new Uint8Array(16));
const key=await crypto.subtle.importKey("raw",enc.encode(process.env.PW),"PBKDF2",false,["deriveBits"]);
const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:100000,hash:"SHA-256"},key,256);
const em=process.env.EM.toLowerCase().replaceAll("\x27","\x27\x27");
console.log(`UPDATE users SET password_hash=\x27${hex(bits)}\x27, password_salt=\x27${hex(salt)}\x27, reset_token=NULL WHERE lower(email)=\x27${em}\x27; SELECT id, name, email FROM users WHERE lower(email)=\x27${em}\x27;`);')
npx wrangler d1 execute ki-masterclass-crm-db --remote --yes --config wrangler.deploy.jsonc --command "$SQL"
echo "Erledigt. Wenn oben eine Zeile mit deinem Namen steht, kannst du dich jetzt mit dem neuen Passwort anmelden."
echo "Steht dort keine Zeile, gibt es kein Konto mit dieser E-Mail."
