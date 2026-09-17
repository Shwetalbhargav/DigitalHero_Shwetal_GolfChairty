import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useAdminAction } from '../../modules/admin/useAdminAction.js';
import {
  AdminLoad,
  ActionNotice,
  Paging,
  AuditHistory,
} from './AdminCommon.jsx';
import { validateProofFile } from '../../components/winnings/ProofUpload.jsx';
export function AdminCharitiesPage() {
  const [page, setPage] = useState(1),
    [q, setQ] = useState(''),
    [draft, setDraft] = useState('');
  const load = useCallback(
    (signal) =>
      api(`/admin/charities?q=${encodeURIComponent(q)}&page=${page}`, {
        signal,
      }),
    [q, page],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <h1>Charities & media</h1>
      <Link className="button button--primary" to="/admin/charities/new">
        Create charity
      </Link>
      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(draft);
        }}
      >
        <Input
          label="Search charities"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>
      <AdminLoad state={state}>
        {state.data && (
          <>
            <div className="draw-grid">
              {state.data.items.map((row) => (
                <article className="card" key={row.id}>
                  <h2>{row.name}</h2>
                  <p>
                    {row.active ? 'Active' : 'Archived / inactive'} ·{' '}
                    {row.featured ? 'Featured' : 'Standard'}
                  </p>
                  <Link to={'/admin/charities/' + row.id}>Edit {row.name}</Link>
                </article>
              ))}
            </div>
            {!state.data.items.length && <p>No matching charities.</p>}
            <Paging data={state.data} page={page} setPage={setPage} />
          </>
        )}
      </AdminLoad>
    </section>
  );
}
function CharityMedia({ id, onSaved }) {
  const [file, setFile] = useState(null),
    [alt, setAlt] = useState(''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);
  async function upload(event) {
    event.preventDefault();
    if (pending.current) return;
    const invalid = validateProofFile(file);
    setError(invalid || '');
    if (invalid) return;
    pending.current = true;
    setBusy(true);
    try {
      await api(
        `/admin/charities/${id}/media?alt=${encodeURIComponent(alt)}&reason=${encodeURIComponent(reason)}`,
        { method: 'POST', headers: { 'Content-Type': file.type }, body: file },
      );
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={upload}>
      <h2>Upload charity image</h2>
      <p>
        Upload a PNG or JPEG up to 5 MB. Images are visible in the directory while the charity is active.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Charity image
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy}
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </label>
      <Input
        label="Image alternative text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        required
        minLength={3}
        maxLength={300}
      />
      <Input
        label="Image upload reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        minLength={3}
      />
      <Button type="submit" loading={busy}>
        Upload charity image
      </Button>
    </form>
  );
}
function CharityEditor({ data, onSaved }) {
  const row = data?.charity;
  const navigate = useNavigate();
  const [fields, setFields] = useState({
    name: row?.name || '',
    slug: row?.slug || '',
    description: row?.description || '',
    category: row?.category || 'community',
    featured: row?.featured || false,
    active: row?.active || false,
    images: row?.images || [],
    upcomingEvents:
      row?.upcomingEvents.map((event) => ({
        ...event,
        startsAt: event.startsAt.slice(0, 16),
      })) || [],
  });
  const [reason, setReason] = useState(''),
    [remove, setRemove] = useState(false);
  const action = useAdminAction((result) => {
    if (!row) navigate('/admin/charities/' + result.id);
    else onSaved();
  });
  const removal = useAdminAction(() => navigate('/admin/charities'));
  function change(key, value) {
    setFields({ ...fields, [key]: value });
  }
  function eventChange(index, key, value) {
    change(
      'upcomingEvents',
      fields.upcomingEvents.map((event, i) =>
        i === index ? { ...event, [key]: value } : event,
      ),
    );
  }
  return (
    <>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(
            '/charities' + (row ? '/' + row.id : ''),
            row ? 'PATCH' : 'POST',
            {
              ...fields,
              upcomingEvents: fields.upcomingEvents.map((event) => ({
                ...event,
                startsAt: event.startsAt + ':00Z',
              })),
              reason,
            },
            'Charity saved.',
          );
        }}
      >
        <h2>Charity content</h2>
        <Input
          label="Charity name"
          value={fields.name}
          onChange={(e) => change('name', e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
        <Input
          label="Charity slug"
          value={fields.slug}
          onChange={(e) => change('slug', e.target.value)}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
        <Input
          label="Charity category"
          value={fields.category}
          onChange={(e) => change('category', e.target.value)}
          required
        />
        <label>
          Description
          <textarea
            value={fields.description}
            onChange={(e) => change('description', e.target.value)}
            required
            minLength={20}
            maxLength={5000}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={fields.active}
            onChange={(e) => change('active', e.target.checked)}
          />{' '}
          Active in public directory
        </label>
        <label>
          <input
            type="checkbox"
            checked={fields.featured}
            onChange={(e) => change('featured', e.target.checked)}
          />{' '}
          Featured
        </label>
        <h3>Events</h3>
        {row && <section><h3>Gallery & cover image</h3><p>The first image is the cover. Changes are applied when you save the charity.</p>{fields.images.map((image, index) => <div className="admin-form" key={image.url}><img className="admin-media" src={image.url} alt={image.alt} /><Input label={'Image ' + (index + 1) + ' description'} value={image.alt} required minLength={3} maxLength={300} onChange={(e) => change('images', fields.images.map((i, n) => n === index ? { ...i, alt: e.target.value } : i))} /><div className="button-row"><Button variant="secondary" disabled={index === 0} onClick={() => change('images', [image, ...fields.images.filter((_, n) => n !== index)])}>Make cover</Button><Button variant="ghost" disabled={index === 0} onClick={() => { const images = [...fields.images]; [images[index - 1], images[index]] = [images[index], images[index - 1]]; change('images', images); }}>Move earlier</Button><Button variant="danger" onClick={() => change('images', fields.images.filter((_, n) => n !== index))}>Remove image {index + 1}</Button></div></div>)}</section>}
        {fields.upcomingEvents.map((event, index) => (
          <fieldset key={index}>
            <legend>Event {index + 1}</legend>
            <Input
              label="Event title"
              value={event.title}
              onChange={(e) => eventChange(index, 'title', e.target.value)}
              required
            />
            <Input
              label="Event starts (UTC)"
              type="datetime-local"
              value={event.startsAt}
              onChange={(e) => eventChange(index, 'startsAt', e.target.value)}
              required
            />
            <Input
              label="Event location"
              value={event.location}
              onChange={(e) => eventChange(index, 'location', e.target.value)}
            />
            <Input
              label="Event description"
              value={event.description}
              onChange={(e) =>
                eventChange(index, 'description', e.target.value)
              }
            />
            <Button
              variant="ghost"
              onClick={() =>
                change(
                  'upcomingEvents',
                  fields.upcomingEvents.filter((_, i) => i !== index),
                )
              }
            >
              Remove event {index + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="secondary"
          disabled={fields.upcomingEvents.length >= 50}
          onClick={() =>
            change('upcomingEvents', [
              ...fields.upcomingEvents,
              { title: '', startsAt: '', location: '', description: '' },
            ])
          }
        >
          Add event
        </Button>
        <Input
          label="Charity change reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
        />
        <ActionNotice action={action} />
        <Button type="submit" loading={action.busy}>
          Save charity
        </Button>
      </form>
      {row && (
        <>
          <CharityMedia id={row.id} onSaved={onSaved} />
          <Button variant="danger" onClick={() => setRemove(true)}>
            Remove charity
          </Button>
          <Modal
            open={remove}
            title="Remove this charity?"
            onClose={() => {
              if (!removal.busy) setRemove(false);
            }}
          >
            <p>
              Referenced charities are archived to preserve membership and
              donation history. Permanent deletion occurs only if unreferenced.
            </p>
            <Input
              label="Removal reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <ActionNotice action={removal} />
            <Button
              variant="danger"
              loading={removal.busy}
              onClick={() =>
                removal.run('/charities/' + row.id, 'DELETE', { reason })
              }
            >
              Confirm removal
            </Button>
          </Modal>
          <AuditHistory events={data.audit} />
        </>
      )}
    </>
  );
}
export function AdminCharityDetailPage() {
  const { id } = useParams();
  const load = useCallback(
    (signal) =>
      id
        ? api('/admin/charities/' + id, { signal })
        : Promise.resolve({ charity: null, audit: [] }),
    [id],
  );
  const state = useFetch(load);
  return (
    <section className="stack-form">
      <Link to="/admin/charities">All charities</Link>
      <h1>{id ? 'Edit charity' : 'Create charity'}</h1>
      <AdminLoad state={state}>
        {state.data && (
          <CharityEditor
            key={(id || 'new') + JSON.stringify(state.data.charity?.images)}
            data={state.data}
            onSaved={state.retry}
          />
        )}
      </AdminLoad>
    </section>
  );
}
