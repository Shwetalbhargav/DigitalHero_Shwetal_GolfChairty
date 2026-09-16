import Input from '../common/Input.jsx';
export default function CharityFilter({ query, onChange }) {
  return (
    <div className="directory-filters">
      <Input
        label="Search charities"
        value={query.q}
        maxLength={100}
        onChange={(e) => onChange({ ...query, q: e.target.value, page: '1' })}
      />
      <Input
        label="Category"
        value={query.category}
        maxLength={64}
        hint="Category slug, for example youth, environment or community. Leave empty for all."
        onChange={(e) =>
          onChange({ ...query, category: e.target.value, page: '1' })
        }
      />
    </div>
  );
}
