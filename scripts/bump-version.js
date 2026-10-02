import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '..');

const target = (process.argv[2] || 'all').toLowerCase();
const versionFile = path.join(baseDir, 'src', 'config', 'version.json');

if (fs.existsSync(versionFile)) {
  const raw = fs.readFileSync(versionFile, 'utf8').replace(/^\uFEFF/, '');
  const vJson = JSON.parse(raw);
  const today = new Date().toISOString().split('T')[0];

  if (target === 'customer' || target === 'all') {
    vJson.customer.build = (Number(vJson.customer.build) || 100) + 1;
    vJson.customer.releaseDate = today;
    console.log(`>>> Incremented Customer Build to ${vJson.customer.build} (Version: ${vJson.customer.version})`);
  }

  if (target === 'admin' || target === 'all') {
    vJson.admin.build = (Number(vJson.admin.build) || 100) + 1;
    vJson.admin.releaseDate = today;
    console.log(`>>> Incremented Admin Build to ${vJson.admin.build} (Version: ${vJson.admin.version})`);
  }

  if (target === 'rider' || target === 'all') {
    vJson.rider.build = (Number(vJson.rider.build) || 100) + 1;
    vJson.rider.releaseDate = today;
    console.log(`>>> Incremented Rider Build to ${vJson.rider.build} (Version: ${vJson.rider.version})`);
  }

  fs.writeFileSync(versionFile, JSON.stringify(vJson, null, 2) + '\n', 'utf8');
}
