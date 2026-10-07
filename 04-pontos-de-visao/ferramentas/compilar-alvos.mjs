// Compila alvos: .zpt (Zappar, em Node) e .mind (MindAR 1.2.5, no Edge sem ecrã)
// Preparar (uma vez, numa pasta à parte): npm install @zappar/imagetraining@4.3.2 playwright-core
// (usa o Microsoft Edge instalado no Windows; o compilador Node do MindAR não instala no Node 24)
// Uso: node compilar-alvos.mjs <pasta-alvos> nome1 nome2 ...   (lê nome.jpg, escreve nome.zpt e nome.mind)
// SO_MIND=1 compila só os .mind.
import { train } from '@zappar/imagetraining';
import { chromium } from 'playwright-core';
import { promises as fs } from 'fs';
import path from 'path';

const [pasta, ...nomes] = process.argv.slice(2);

if (!process.env.SO_MIND) for (const n of nomes) {
  const zpt = await train(path.join(pasta, n + ".jpg"));
  await fs.writeFile(path.join(pasta, n + ".zpt"), zpt);
  console.log("zpt", n, zpt.length);
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.goto('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/package.json');
for (const n of nomes) {
  const b64 = (await fs.readFile(path.join(pasta, n + '.jpg'))).toString('base64');
  const dados = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const m = await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js');
    const c = new m.Compiler();
    await c.compileImageTargets([img], () => {});
    const buf = await c.exportData();
    return Array.from(new Uint8Array(buf));
  }, b64);
  await fs.writeFile(path.join(pasta, n + '.mind'), Buffer.from(dados));
  console.log('mind', n, dados.length);
}
await browser.close();
