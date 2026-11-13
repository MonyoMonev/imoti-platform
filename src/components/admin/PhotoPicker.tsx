'use client';

import { useRef, useState } from 'react';

// Намалява голямата снимка в браузъра преди качване, за да не пътуват 8 MB от телефона.
async function shrink(file: File, max = 1800, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900 * 1024 && /jpe?g|webp/.test(file.type)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    return blob || file;
  } catch {
    return file;
  }
}

// Снимките се качват една по една: облачният сървър приема до 4,5 MB на заявка.
export async function uploadPhotos(files: File[]): Promise<{ urls?: string[]; error?: string }> {
  const urls: string[] = [];
  for (const f of files) {
    let small = await shrink(f);
    if (small.size > 3.5 * 1024 * 1024) small = await shrink(f, 1400, 0.74);
    const form = new FormData();
    form.append('files', small, f.name.replace(/\.[^.]+$/, '') + '.jpg');
    let data: any = {};
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      data = await res.json().catch(() => ({}));
    } catch {
      return { error: 'Няма връзка. Опитай пак.', urls: urls.length ? urls : undefined };
    }
    if (!data.ok) return { error: data.error || 'Качването не стана.', urls: urls.length ? urls : undefined };
    urls.push(...(data.urls || []));
  }
  return { urls };
}

/** Много снимки с подреждане. Първата е корицата. */
export function PhotoList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function add(list: FileList | null) {
    if (!list || !list.length) return;
    setBusy(true);
    setError('');
    const r = await uploadPhotos(Array.from(list).slice(0, 12));
    setBusy(false);
    if (r.urls?.length) onChange([...value, ...r.urls]);
    if (r.error) setError(r.error);
    if (input.current) input.current.value = '';
  }

  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="photos">
        {value.map((src, i) => (
          <div className="photo" key={src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Снимка ${i + 1}`} />
            {i === 0 ? <span className="ord">Корица</span> : null}
            <div className="ctl">
              <span style={{ display: 'flex', gap: 4 }}>
                <button type="button" aria-label="Премести напред" disabled={i === 0} onClick={() => move(i, -1)}>
                  ←
                </button>
                <button type="button" aria-label="Премести назад" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  →
                </button>
              </span>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))}>
                Махни
              </button>
            </div>
          </div>
        ))}
        <label className="drop">
          <input
            ref={input}
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => add(e.target.files)}
          />
          {busy ? 'Качвам' : 'Добави снимки'}
          <span>JPEG, PNG или WebP</span>
        </label>
      </div>
      {error ? (
        <p className="err" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Една снимка (портрет на брокер). */
export function PhotoOne({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(list: FileList | null) {
    if (!list || !list.length) return;
    setBusy(true);
    setError('');
    const r = await uploadPhotos([list[0]]);
    setBusy(false);
    if (r.error) setError(r.error);
    else if (r.urls?.[0]) onChange(r.urls[0]);
  }

  return (
    <div className="photoone">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Снимка за профила" />
      ) : (
        <span className="ph">Няма снимка</span>
      )}
      <div>
        <label className="btn small">
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => pick(e.target.files)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
          />
          {busy ? 'Качвам' : value ? 'Смени снимката' : 'Качи снимка'}
        </label>
        <p className="muted small" style={{ marginTop: 8, maxWidth: '36ch' }}>
          Вертикален портрет при естествена светлина. Така ще те виждат хората на сайта и до всеки твой имот.
        </p>
        {error ? <p className="err">{error}</p> : null}
      </div>
    </div>
  );
}
