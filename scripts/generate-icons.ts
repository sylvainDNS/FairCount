/**
 * Generate PWA icons from the SVG source
 * Run with: npx tsx scripts/generate-icons.ts
 */

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ICONS_DIR = join(import.meta.dirname, '../public/icons');
const SVG_SOURCE = join(ICONS_DIR, 'icon.svg');

const SIZES = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.1 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const { name, size, padding } of SIZES) {
    const outputPath = join(ICONS_DIR, name);

    if (padding) {
      // Maskable icon needs safe zone padding
      const paddedSize = Math.round(size * (1 - padding * 2));
      await sharp(SVG_SOURCE)
        .resize(paddedSize, paddedSize)
        .extend({
          top: Math.round(size * padding),
          bottom: Math.round(size * padding),
          left: Math.round(size * padding),
          right: Math.round(size * padding),
          background: '#2563eb',
        })
        .png()
        .toFile(outputPath);
    } else {
      await sharp(SVG_SOURCE).resize(size, size).png().toFile(outputPath);
    }

    console.log(`Generated: ${name}`);
  }

  console.log('All icons generated!');
}

generateIcons().catch(console.error);
