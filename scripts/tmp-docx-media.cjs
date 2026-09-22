const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const src = process.argv[2];
const outDir = process.argv[3];

JSZip.loadAsync(fs.readFileSync(src)).then(async (z) => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of Object.keys(z.files)) {
    if (name.startsWith('word/media/')) {
      const buf = await z.file(name).async('nodebuffer');
      const out = path.join(outDir, path.basename(name));
      fs.writeFileSync(out, buf);
      console.log(out, buf.length);
    }
  }
});
