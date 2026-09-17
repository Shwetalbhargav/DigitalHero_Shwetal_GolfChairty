import { CharityCard } from '../home/FeaturedCharities.jsx';
import EmptyState from '../common/EmptyState.jsx';
export default function CharityGrid({ charities }) {
  return charities.length ? (
    <div className="three-grid">
      {charities.map((charity) => (
        <CharityCard key={charity.id} charity={charity} />
      ))}
    </div>
  ) : (
    <EmptyState
      title="No charities found"
      description="Try another search or category."
    />
  );
}
