import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = new URL("../../../landing/", import.meta.url);
const target = new URL("../public/landing/", import.meta.url);

mkdirSync(target, { recursive: true });
cpSync(new URL("assets/", source), new URL("assets/", target), { recursive: true });
const html = readFileSync(new URL("index.html", source), "utf8")
  .replace(/(["'])assets\//g, "$1/landing/assets/");
writeFileSync(new URL("index.html", target), html);
console.log("Prepared Mootz landing and assets for the web deployment.");
