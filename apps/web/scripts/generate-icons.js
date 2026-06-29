const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '../public');
const APP_DIR = path.join(__dirname, '../src/app');

const targets = [
  {
    source: 'icon.svg',
    output: path.join(PUBLIC_DIR, 'icon-192.png'),
    size: 192,
  },
  {
    source: 'icon.svg',
    output: path.join(PUBLIC_DIR, 'icon-512.png'),
    size: 512,
  },
  {
    source: 'icon-maskable.svg',
    output: path.join(PUBLIC_DIR, 'icon-192-maskable.png'),
    size: 192,
  },
  {
    source: 'icon-maskable.svg',
    output: path.join(PUBLIC_DIR, 'icon-512-maskable.png'),
    size: 512,
  },
  {
    source: 'icon.svg',
    output: path.join(PUBLIC_DIR, 'apple-touch-icon.png'),
    size: 180,
  },
  {
    source: 'icon.svg',
    output: path.join(APP_DIR, 'favicon.ico'),
    size: 32,
  },
  {
    source: 'icon.svg',
    output: path.join(APP_DIR, 'icon.png'),
    size: 32,
  },
  {
    source: 'icon.svg',
    output: path.join(APP_DIR, 'apple-icon.png'),
    size: 180,
  },
];

async function generate() {
  console.log('Generating PWA icons...');
  for (const target of targets) {
    const srcPath = path.join(PUBLIC_DIR, target.source);
    const destPath = target.output;

    try {
      await sharp(srcPath)
        .resize(target.size, target.size)
        .png()
        .toFile(destPath);
      console.log(`Generated: ${path.basename(destPath)} (${target.size}x${target.size})`);
    } catch (err) {
      console.error(`Error generating ${path.basename(destPath)}:`, err);
    }
  }
  console.log('Icon generation complete.');
}

generate();
