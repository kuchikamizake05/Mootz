import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const web = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(web, "../..");
const brand = path.join(root, "assets/brand/mootz");
const landing = path.join(root, "landing/assets");

async function main() {
  const symbol = await sharp(readFileSync(path.join(brand, "mootz-symbol-v1.svg")))
    .trim().png().toBuffer();
  const icon = await sharp(symbol).resize(32, 32, { fit: "contain", background: "#ffffff00" }).png().toBuffer();
  // ICO directory entry points to a PNG payload supported by modern browsers.
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(icon.length, 14);
  header.writeUInt32LE(22, 18);
  const favicon = Buffer.concat([header, icon]);
  writeFileSync(path.join(web, "src/app/favicon.ico"), favicon);
  writeFileSync(path.join(landing, "favicon.ico"), favicon);

  const touchSymbol = await sharp(symbol).resize(132, 112, { fit: "contain", background: "#ffffff00" }).png().toBuffer();
  const touch = await sharp({ create: { width: 180, height: 180, channels: 3, background: "#F5F0FF" } })
    .composite([{ input: touchSymbol, gravity: "centre" }]).png().toBuffer();
  writeFileSync(path.join(web, "src/app/apple-icon.png"), touch);
  writeFileSync(path.join(landing, "apple-touch-icon.png"), touch);

  const logo = await sharp(readFileSync(path.join(brand, "mootz-logo-v1.svg")))
    .trim().resize(660, 230, { fit: "inside" }).png().toBuffer();
  const text = Buffer.from('<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><g fill="#302044" font-family="Arial, sans-serif" text-anchor="middle"><text x="600" y="430" font-size="38" font-weight="700">Share your day. Meet in person.</text><text x="600" y="485" font-size="25">Shared memories on Monad.</text></g></svg>');
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#F5F0FF" } })
    .composite([{ input: logo, top: 130, left: Math.round((1200 - (await sharp(logo).metadata()).width) / 2) }, { input: text }])
    .png().toFile(path.join(web, "public/brand/mootz-social.png"));
  console.log("Exported Mootz favicon, Apple touch icon and social preview.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
