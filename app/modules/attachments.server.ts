import fs from 'fs';
import path from 'path';

export async function writeFile(file: File) {
  const localPath = path.join(process.cwd(), 'public', file.name);
  const arrayBufferView = new Uint8Array(await file.arrayBuffer());
  fs.writeFileSync(localPath, arrayBufferView);
}
