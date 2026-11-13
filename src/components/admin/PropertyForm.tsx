'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DISTRICTS, KINDS, STATUS_LABELS } from '@/lib/format';
import { PhotoList } from './PhotoPicker';

type Staff = { id: number; name: string };

export default function PropertyForm({
  initial,
  boss,
  staff,
  justCreated,
}: {
  initial: any | null;
  boss: boolean;
  staff: Staff[];
  justCreated?: boolean;
}) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [v, setV] = useState<any>(() => ({
    title: initial?.title || '',
    deal: initial?.deal || 'sale',
    kind: initial?.kind || 'apartment',
    rooms: initial?.rooms ?? '',
    area: initial?.area ?? '',
    yard: initial?.yard ?? '',
    floor: initial?.floor ?? '',
    floors: initial?.floors ?? '',
    district: initial?.district || '',
    address: initial?.address || '',
    price: initial?.price ?? '',
    year_built: initial?.year_built ?? '',
    construction: initial?.construction || '',
    heating: initial?.heating || '',
    furnishing: initial?.furnishing || '',
    features: Array.isArray(initial?.features) ? initial.features.join('\n') : '',
    teaser: initial?.teaser || '',
    description: initial?.description || '',
    photos: Array.isArray(initial?.photos) ? initial.photos : [],
    status: initial?.status || 'active',
    featured: !!initial?.featured,
    broker_id: initial?.broker_id ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(justCreated ? 'Имотът е записан и вече се вижда на сайта.' : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV((old: any) => ({ ...old, [k]: e.target.value }));
    setSaved('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved('');
    const res = await fetch(editing ? `/api/admin/properties/${initial.id}` : '/api/admin/properties', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(v),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!data.ok) {
      setError(data.error || 'Не стана. Опитай пак.');
      return;
    }
    if (editing) {
      setSaved('Промените са записани.');
      router.refresh();
    } else {
      router.push(`/admin/imoti/${data.id}?nov=1`);
    }
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/admin/properties/${initial.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!data.ok) {
      setError(data.error || 'Не стана.');
      setConfirmDelete(false);
      return;
    }
    router.push('/admin/imoti');
    router.refresh();
  }

  const isFlat = v.kind === 'apartment' || v.kind === 'office' || v.kind === 'shop';
  const isPlot = v.kind === 'plot';

  return (
    <form onSubmit={submit} noValidate className="panel">
      <fieldset className="formsec">
        <h3>Основното</h3>
        <div className="stackf">
          <label className="field">
            <span>Заглавие</span>
            <input type="text" name="title" value={v.title} onChange={set('title')} placeholder="Тристаен с гледка към морето" />
          </label>
          <div className="grid4">
            <label className="field">
              <span>Сделка</span>
              <select name="deal" value={v.deal} onChange={set('deal')}>
                <option value="sale">Продажба</option>
                <option value="rent">Наем</option>
              </select>
            </label>
            <label className="field">
              <span>Вид</span>
              <select name="kind" value={v.kind} onChange={set('kind')}>
                {Object.entries(KINDS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{v.deal === 'rent' ? 'Наем на месец, €' : 'Цена, €'}</span>
              <input type="text" inputMode="numeric" name="price" value={v.price} onChange={set('price')} />
            </label>
            <label className="field">
              <span>Площ, кв.м</span>
              <input type="text" inputMode="numeric" name="area" value={v.area} onChange={set('area')} />
            </label>
          </div>
          <div className="grid2">
            <label className="field">
              <span>Район</span>
              <input type="text" name="district" list="adm-districts" value={v.district} onChange={set('district')} />
              <datalist id="adm-districts">
                {DISTRICTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Адрес или ориентир</span>
              <input type="text" name="address" value={v.address} onChange={set('address')} placeholder="кв. Чайка, до Морската градина" />
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="formsec">
        <h3>Подробности</h3>
        <div className="grid4">
          {!isPlot ? (
            <label className="field">
              <span>Стаи</span>
              <input type="text" inputMode="numeric" name="rooms" value={v.rooms} onChange={set('rooms')} />
            </label>
          ) : null}
          {isFlat ? (
            <label className="field">
              <span>Етаж</span>
              <input type="text" inputMode="numeric" name="floor" value={v.floor} onChange={set('floor')} />
            </label>
          ) : null}
          {!isPlot ? (
            <label className="field">
              <span>Етажи в сградата</span>
              <input type="text" inputMode="numeric" name="floors" value={v.floors} onChange={set('floors')} />
            </label>
          ) : null}
          {v.kind === 'house' ? (
            <label className="field">
              <span>Двор, кв.м</span>
              <input type="text" inputMode="numeric" name="yard" value={v.yard} onChange={set('yard')} />
            </label>
          ) : null}
          {!isPlot ? (
            <>
              <label className="field">
                <span>Година на строеж</span>
                <input type="text" inputMode="numeric" name="year_built" value={v.year_built} onChange={set('year_built')} />
              </label>
              <label className="field">
                <span>Строителство</span>
                <input type="text" name="construction" list="adm-constr" value={v.construction} onChange={set('construction')} />
                <datalist id="adm-constr">
                  <option value="Тухла" />
                  <option value="Панел" />
                  <option value="ЕПК" />
                  <option value="Монолитна" />
                  <option value="Гредоред" />
                </datalist>
              </label>
              <label className="field">
                <span>Отопление</span>
                <input type="text" name="heating" value={v.heating} onChange={set('heating')} placeholder="ТЕЦ, газ, климатици" />
              </label>
              <label className="field">
                <span>Обзавеждане</span>
                <select name="furnishing" value={v.furnishing} onChange={set('furnishing')}>
                  <option value="">Не е посочено</option>
                  <option value="Обзаведен">Обзаведен</option>
                  <option value="Частично обзаведен">Частично обзаведен</option>
                  <option value="Необзаведен">Необзаведен</option>
                  <option value="По договаряне">По договаряне</option>
                </select>
              </label>
            </>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="formsec">
        <h3>Текстове</h3>
        <div className="stackf">
          <label className="field">
            <span>Едно изречение за корицата</span>
            <input type="text" name="teaser" maxLength={160} value={v.teaser} onChange={set('teaser')} placeholder="Седми етаж, две тераси и морето от дивана." />
            <em>Вижда се под заглавието в списъка и в поста, когато споделиш линка.</em>
          </label>
          <label className="field">
            <span>Описание</span>
            <textarea name="description" rows={9} value={v.description} onChange={set('description')} />
            <em>Пиши както би го разказал на оглед. Празен ред прави нов абзац.</em>
          </label>
          <label className="field">
            <span>Предимства, по едно на ред</span>
            <textarea name="features" rows={5} value={v.features} onChange={set('features')} placeholder={'Асансьор\nПаркомясто в двора\nДве тераси'} />
          </label>
        </div>
      </fieldset>

      <fieldset className="formsec">
        <h3>Снимки</h3>
        <PhotoList
          value={v.photos}
          onChange={(photos) => {
            setV((old: any) => ({ ...old, photos }));
            setSaved('');
          }}
        />
      </fieldset>

      <fieldset className="formsec">
        <h3>Публикуване</h3>
        <div className="grid3">
          <label className="field">
            <span>Статус</span>
            <select name="status" value={v.status} onChange={set('status')}>
              {Object.entries(STATUS_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <em>Черновата не се вижда на сайта.</em>
          </label>
          {boss ? (
            <label className="field">
              <span>Брокер на имота</span>
              <select name="broker_id" value={v.broker_id} onChange={set('broker_id')}>
                {!v.broker_id ? <option value="">Избери</option> : null}
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {boss ? (
            <label className="check" style={{ alignSelf: 'center', marginTop: 18 }}>
              <input
                type="checkbox"
                name="featured"
                checked={v.featured}
                onChange={(e) => {
                  setV((old: any) => ({ ...old, featured: e.target.checked }));
                  setSaved('');
                }}
              />
              Избран имот на началната страница
            </label>
          ) : null}
        </div>
      </fieldset>

      <div className="savebar">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Записвам' : editing ? 'Запиши промените' : 'Запиши имота'}
        </button>
        {error ? (
          <span className="err" role="alert">
            {error}
          </span>
        ) : null}
        {saved ? <span className="okmsg">{saved}</span> : null}
        <span className="grow" />
        {editing ? (
          confirmDelete ? (
            <>
              <span className="small">Имотът се трие завинаги.</span>
              <button className="btn small" type="button" onClick={remove} disabled={busy}>
                Да, изтрий го
              </button>
              <button className="btn small quiet" type="button" onClick={() => setConfirmDelete(false)}>
                Отказ
              </button>
            </>
          ) : (
            <button className="btn small quiet" type="button" onClick={() => setConfirmDelete(true)}>
              Изтрий имота
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}
