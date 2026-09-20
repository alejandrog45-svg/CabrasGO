#!/usr/bin/env node
// Consulta puntual a Gemini para pedir una segunda opinión durante una tarea.
// No se llama automáticamente en ningún flujo — es una herramienta manual.
//
// Uso:
//   node scripts/consultar-gemini.js "tu pregunta acá"
//   echo "tu pregunta" | node scripts/consultar-gemini.js
//
// Requiere GEMINI_API_KEY en el .env de la raíz del repo (gitignored).

const fs = require("fs");
const path = require("path");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

async function main() {
  if (!API_KEY) {
    console.error("Falta GEMINI_API_KEY en el .env de la raíz del repo.");
    process.exit(1);
  }

  const argPrompt = process.argv.slice(2).join(" ").trim();
  let prompt = argPrompt;
  if (!prompt && !process.stdin.isTTY) {
    prompt = fs.readFileSync(0, "utf8").trim();
  }
  if (!prompt) {
    console.error('Uso: node scripts/consultar-gemini.js "tu pregunta"');
    process.exit(1);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    console.error(`Gemini respondió ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  console.log(text || JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error("Error consultando Gemini:", err.message);
  process.exit(1);
});
