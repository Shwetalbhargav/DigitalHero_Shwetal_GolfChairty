import { api, ApiClientError } from '../../services/api.js';
export function toCharityCard(record) {
  if (
    !record ||
    !/^[a-f0-9]{24}$/i.test(record.id) ||
    !['name', 'description', 'category'].every(
      (key) => typeof record[key] === 'string' && record[key].trim(),
    ) ||
    typeof record.isDemo !== 'boolean' ||
    !Array.isArray(record.images)
  )
    throw new ApiClientError('Charity information is invalid.', {
      code: 'INVALID_RESPONSE',
    });
  return {
    ...record,
    href: '/charities/' + record.id,
    isExample: record.isDemo,
    image: record.images[0]
      ? { src: record.images[0].url, alt: record.images[0].alt }
      : null,
  };
}
export async function getCharities(query = {}, signal) {
  const data = await api('/charities?' + new URLSearchParams(query), {
    signal,
  });
  if (!Array.isArray(data?.items) || !data.pagination)
    throw new ApiClientError('Charity directory response is invalid.', {
      code: 'INVALID_RESPONSE',
    });
  return { ...data, items: data.items.map(toCharityCard) };
}
export async function getFeaturedCharities(signal) {
  const data = await api('/charities/featured?limit=3', { signal });
  if (!Array.isArray(data?.items))
    throw new ApiClientError('Charity directory response is invalid.', {
      code: 'INVALID_RESPONSE',
    });
  return data.items.map(toCharityCard);
}
export async function getCharity(id, signal) {
  return toCharityCard(
    await api('/charities/' + encodeURIComponent(id), { signal }),
  );
}
