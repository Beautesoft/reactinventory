import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Generate a timestamp-based version (YYYY.MM.DD.HHMM)
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

const newVersion = `${year}.${month}.${day}.${hours}${minutes}`;

// Update the version
packageData.version = newVersion;

// Write back to package.json
fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');

console.log(`Version updated to: ${newVersion}`);
console.log(`Build time: ${now.toISOString()}`);
