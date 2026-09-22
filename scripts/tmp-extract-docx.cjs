const fs = require('fs');
const JSZip = require('jszip');

const src = process.argv[2];
const mode = process.argv[3] || 'text';

JSZip.loadAsync(fs.readFileSync(src)).then(async (z) => {
  if (mode === 'rels') {
    const rels = await z.file('word/_rels/document.xml.rels').async('string');
    console.log(rels);
    return;
  }
  if (mode === 'files') {
    console.log(Object.keys(z.files).join('\n'));
    return;
  }
  const x = await z.file('word/document.xml').async('string');
  const body = x.slice(x.indexOf('<w:body>'));
  const paras = body.split(/<w:p[ >]/).slice(1);
  const out = paras.map((p, i) => {
    const imgs = [...p.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]);
    const t = p
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, ' / ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return '[' + i + ']' + (imgs.length ? '{IMG:' + imgs.join(',') + '}' : '') + ' ' + t;
  });
  console.log(out.join('\n'));
});
