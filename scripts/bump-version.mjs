import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const versionFilePath = path.join(rootDir, "lib", "constants", "version.ts");
const packageJsonPath = path.join(rootDir, "package.json");

// Format versi: YY.MM.DD.NN (Tahun 2-digit . Bulan 2-digit . Tanggal 2-digit . Nomor push hari ini)
const now = new Date();
const yy = String(now.getFullYear()).slice(-2);
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const datePrefix = `${yy}.${mm}.${dd}`;

let lastCommittedVersion = "";
try {
  const headPkgStr = execSync("git show HEAD:package.json", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  const headPkg = JSON.parse(headPkgStr);
  if (headPkg && headPkg.version) {
    lastCommittedVersion = headPkg.version;
  }
} catch {
  // Jika git show gagal, baca dari file lokal
  if (fs.existsSync(versionFilePath)) {
    const content = fs.readFileSync(versionFilePath, "utf8");
    const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (match) lastCommittedVersion = match[1];
  }
}

let nextSeq = 1;
if (lastCommittedVersion.startsWith(datePrefix + ".")) {
  const parts = lastCommittedVersion.split(".");
  const lastSeq = parseInt(parts[parts.length - 1], 10);
  if (!isNaN(lastSeq)) {
    nextSeq = lastSeq + 1;
  }
}

const nextSeqStr = String(nextSeq).padStart(2, "0");
const newVersion = `${datePrefix}.${nextSeqStr}`;

// 1. Update lib/constants/version.ts
const newVersionTsContent = `// Versi aplikasi otomatis diperbarui setiap push dengan format: YY.MM.DD.NN\nexport const APP_VERSION = "${newVersion}";\n`;
fs.writeFileSync(versionFilePath, newVersionTsContent, "utf8");

// 2. Update package.json
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

console.log(`[SAREN Version] Berhasil memperbarui versi ke: v${newVersion}`);
