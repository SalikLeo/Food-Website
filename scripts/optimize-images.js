import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const targetDirs = [
  path.join(rootDir, 'public', 'assets', 'uploads'),
  path.join(rootDir, 'public', 'assets'),
  path.join(rootDir, 'public', 'assets', 'images')
];

async function optimizeFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return { count: 0, savedBytes: 0 };

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  let count = 0;
  let totalSaved = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const filePath = path.join(folderPath, entry.name);
    const ext = path.extname(entry.name).toLowerCase();

    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

    try {
      const originalStat = fs.statSync(filePath);
      const originalSize = originalStat.size;

      // Skip small icons (< 30 KB)
      if (originalSize < 30 * 1024) continue;

      const image = sharp(filePath);
      const meta = await image.metadata();

      const maxDim = 1000;
      let resizeOptions = null;
      if (meta.width > maxDim || meta.height > maxDim) {
        resizeOptions = { width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true };
      }

      // 1. Create WebP version
      const baseName = path.basename(entry.name, ext);
      const webpPath = path.join(folderPath, `${baseName}.webp`);
      
      let webpPipeline = sharp(filePath).rotate();
      if (resizeOptions) webpPipeline = webpPipeline.resize(resizeOptions);
      await webpPipeline.webp({ quality: 82, effort: 4 }).toFile(webpPath);

      // 2. Also re-compress the original file in-place so existing URLs stay working but become 80-95% lighter
      let inPlacePipeline = sharp(filePath).rotate();
      if (resizeOptions) inPlacePipeline = inPlacePipeline.resize(resizeOptions);

      const tempOut = `${filePath}.optimized_tmp`;
      if (ext === '.png') {
        await inPlacePipeline.png({ quality: 80, compressionLevel: 9 }).toFile(tempOut);
      } else {
        await inPlacePipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(tempOut);
      }

      const newStat = fs.statSync(tempOut);
      if (newStat.size < originalSize) {
        fs.renameSync(tempOut, filePath);
        totalSaved += (originalSize - newStat.size);
      } else {
        fs.unlinkSync(tempOut);
      }

      const webpStat = fs.statSync(webpPath);
      console.log(`✓ [Optimized] ${entry.name}: ${(originalSize / 1024).toFixed(1)} KB -> ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB (WebP: ${(webpStat.size / 1024).toFixed(1)} KB)`);
      count++;
    } catch (err) {
      console.warn(`Could not optimize ${entry.name}:`, err.message);
    }
  }

  return { count, savedBytes: totalSaved };
}

async function run() {
  console.log('🚀 Starting batch image optimization with Sharp (Preserving 100% Aspect Ratios)...\n');
  let totalFiles = 0;
  let totalSavedBytes = 0;

  for (const dir of targetDirs) {
    console.log(`📁 Scanning: ${path.relative(rootDir, dir)}`);
    const { count, savedBytes } = await optimizeFolder(dir);
    totalFiles += count;
    totalSavedBytes += savedBytes;
  }

  console.log(`\n🎉 Optimization Complete!`);
  console.log(`- Images Processed: ${totalFiles}`);
  console.log(`- Total Bandwidth Saved: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
}

run();
