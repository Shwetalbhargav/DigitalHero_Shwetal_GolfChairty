import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCharity } from '../../modules/charities/charity.api.js';
import useFetch from '../../hooks/useFetch.js';
import useAuth from '../../hooks/useAuth.js';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import DonationForm from '../../components/charity/DonationForm.jsx';
export default function CharityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const load = useCallback((signal) => getCharity(id, signal), [id]);
  const result = useFetch(load);
  if (result.status === 'loading') return <Loader label="Loading charity…" />;
  if (result.status === 'error')
    return (
      <section className="content-page">
        <h1>Charity unavailable</h1>
        <ErrorState message={result.error.message} onRetry={result.retry} />
        <Link to="/charities">Browse charities</Link>
      </section>
    );
  const charity = result.data;
  return (
    <article className="content-page stack-form">
      <Link to="/charities">← All charities</Link>
      <p className="eyebrow">
        {charity.category}
        {charity.isDemo ? ' · Demo charity' : ''}
      </p>
      <h1>{charity.name}</h1>
      <p>{charity.description}</p>
      <div className="charity-gallery">
        {charity.images.map((image) => (
          <img key={image.url} src={image.url} alt={image.alt} loading="lazy" />
        ))}
      </div>
      <section>
        <h2>Upcoming events</h2>
        {charity.upcomingEvents?.length ? (
          <ul>
            {charity.upcomingEvents.map((event) => (
              <li key={event.title + event.startsAt}>
                <h3>{event.title}</h3>
                <time dateTime={event.startsAt}>
                  {new Date(event.startsAt).toLocaleString('en-GB', {
                    timeZone: 'UTC',
                  })}{' '}
                  UTC
                </time>
                <p>{event.location}</p>
                <p>{event.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming events have been published.</p>
        )}
      </section>
      {user ? (
        <>
          <Link
            className="button button--primary"
            to={'/dashboard/charity?charity=' + id}
          >
            Choose this charity
          </Link>
          <DonationForm charityId={id} />
        </>
      ) : (
        <p>
          <Link to="/login" state={{ returnTo: '/charities/' + id }}>
            Sign in
          </Link>{' '}
          to choose this charity or try an independent demo donation.
        </p>
      )}
    </article>
  );
}
