import { q } from '@/lib/db';
import { randomToken } from '@/lib/password';
import { bad, ok, staffOrError } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function sniff(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Качване на снимки. Приемат се само JPEG, PNG и WebP, до 4 MB всяка.
// Пазят се в базата (таблица media), за да работи еднакво и локално, и в облака,
// където сървърът няма собствен диск.
export async function POST(req: Request) {
  const r = await staffOrError();
  if (r.error) return r.error;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad('Не получихме файл.');
  }
  const files = form.getAll('files').filter((f): f is File => typeof f !== 'string');
  if (!files.length) return bad('Не получихме файл.');
  if (files.length > 12) return bad('Качвай до 12 снимки наведнъж.');

  const urls: string[] = [];
  for (const f of files) {
    if (f.size > 4 * 1024 * 1024) return bad(`„${f.name}“ е над 4 MB.`);
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = sniff(buf);
    if (!ext) return bad(`„${f.name}“ не е снимка във формат JPEG, PNG или WebP.`);
    const name = `${randomToken(12)}.${ext}`;
    await q(`insert into media (name, mime, data, created_by) values ($1, $2, $3, $4)`, [name, MIME[ext], buf, r.user.id]);
    urls.push(`/media/${name}`);
  }
  return ok({ urls });
}
