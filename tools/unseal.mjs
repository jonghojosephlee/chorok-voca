// node tools/unseal.mjs <repo dir> <unlock code> <out.json> — decrypts data/words.bin for local tests only (never commit the output)
import fs from 'fs';
const [repo, code, out] = process.argv.slice(2);
const html = fs.readFileSync(repo + '/index.html', 'utf8');
const at = html.indexOf('window.__CV__ = ') + 16, cfg = JSON.parse(html.slice(at, html.indexOf(';</script>', at)));
const raw = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.replace('-', '')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(cfg.crypto.salt, 'base64'), iterations: cfg.crypto.iter, hash: 'SHA-256' }, raw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const b = fs.readFileSync(repo + '/data/words.bin');
const data = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(4, 16) }, key, b.subarray(16))));
fs.writeFileSync(out, JSON.stringify({ words: data.words }), { mode: 0o600 });
console.log('version', cfg.version, 'rows', data.words.length);
