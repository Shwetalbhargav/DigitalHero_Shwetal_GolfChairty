import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { useState } from 'react';
export default function CharityFilter({ query, onChange }) {
  const [draft, setDraft] = useState(query);
  return (
    <form
      className="directory-filters"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ ...draft, page: '1' });
      }}
    >
      <Input
        label="Search charities"
        value={draft.q}
        maxLength={100}
        onChange={(e) =>
          setDraft((current) => ({ ...current, q: e.target.value }))
        }
      />
      <label htmlFor="charity-category">Category</label><select id="charity-category" aria-label="Category" value={draft.category} onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))}>
        <option value="">All causes</option><option value="youth">Youth & opportunity</option><option value="environment">Environment</option><option value="community">Community & wellbeing</option>
        {draft.category && !['youth', 'environment', 'community'].includes(draft.category) && <option value={draft.category}>{draft.category.replaceAll('-', ' ')}</option>}
      </select>
      <Button type="submit">Apply filters</Button>
      <Button variant="secondary" onClick={() => { setDraft({ q: '', category: '', page: '1' }); onChange({ q: '', category: '', page: '1' }); }}>Clear filters</Button>
    </form>
  );
}
