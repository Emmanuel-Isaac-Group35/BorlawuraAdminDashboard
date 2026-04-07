const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, 'Borla Wura S Logo.png');
const destFile = path.join(__dirname, 'src', 'logo.png');

console.log('Copying from:', srcFile);
console.log('Copying to:', destFile);

try {
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log('Successfully copied to src/logo.png');
  } else {
    console.error('Source file not found!');
  }
} catch (err) {
  console.error('Copy failed:', err);
}
