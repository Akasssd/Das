import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const assetsDir = path.join(root, 'assets');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html not found. Run `expo export --platform web` first.');
}

const copies = [
  ['apple-touch-icon.png', 'apple-touch-icon.png'],
  ['icon-192.png', 'icon-192.png'],
  ['icon-512.png', 'icon-512.png'],
  ['favicon.png', 'favicon.png'],
];

for (const [srcName, destName] of copies) {
  fs.copyFileSync(path.join(assetsDir, srcName), path.join(distDir, destName));
}

const manifest = {
  name: 'Lira',
  short_name: 'Lira',
  description: 'Lira — cycle tracking and care-box subscription',
  display: 'standalone',
  start_url: '/',
  scope: '/',
  background_color: '#FFFCF7',
  theme_color: '#FFFCF7',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
};

fs.writeFileSync(
  path.join(distDir, 'manifest.webmanifest'),
  JSON.stringify(manifest, null, 2),
);

let html = fs.readFileSync(indexPath, 'utf8');

const headInsert = `
    <meta name="application-name" content="Lira" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Lira" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#FFFCF7" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />`;

if (!html.includes('apple-mobile-web-app-title')) {
  html = html.replace('<title>Lira</title>', `<title>Lira</title>${headInsert}`);
}

fs.writeFileSync(indexPath, html);
console.log('Post-processed dist for iOS home-screen metadata.');
