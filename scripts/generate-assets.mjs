import sharp from 'sharp';

const SRC = 'public/images/Ukelele.png';

// The image is 1408x768 landscape with a baked-in background.
// The circular artwork sits in the center — crop to a centered square
// using the full height (768px) as the bounding dimension.
const meta = await sharp(SRC).metadata();
const { width, height } = meta;
const squareSize = height; // 768
const left = Math.round((width - squareSize) / 2);

const squareCrop = sharp(SRC).extract({ left, top: 0, width: squareSize, height: squareSize });

// favicon / icon sizes
await squareCrop.clone().resize(512, 512).png().toFile('app/icon.png');
console.log('✓ app/icon.png (512x512)');

await squareCrop.clone().resize(180, 180).png().toFile('app/apple-icon.png');
console.log('✓ app/apple-icon.png (180x180)');

// favicon.ico — use 32x32 PNG converted to ICO via sharp
// sharp supports ICO output on the resize output
await squareCrop.clone().resize(32, 32).toFormat('png').toFile('app/favicon.ico');
console.log('✓ app/favicon.ico (32x32 PNG-in-ICO)');

// OG image: 1200x630, artwork centered on a warm cream background (#f5f0e8)
const OG_W = 1200, OG_H = 630;
// Scale artwork to fit height with padding
const artSize = OG_H - 60; // 570px, leaving 30px padding top/bottom
const artBuf = await squareCrop.clone().resize(artSize, artSize).png().toBuffer();

await sharp({
  create: {
    width: OG_W,
    height: OG_H,
    channels: 3,
    background: { r: 245, g: 240, b: 232 }, // cream #f5f0e8
  }
})
  .png()
  .composite([{
    input: artBuf,
    left: Math.round((OG_W - artSize) / 2),
    top: Math.round((OG_H - artSize) / 2),
  }])
  .toFile('public/images/og-image.png');
console.log('✓ public/images/og-image.png (1200x630)');

console.log('All assets generated.');
