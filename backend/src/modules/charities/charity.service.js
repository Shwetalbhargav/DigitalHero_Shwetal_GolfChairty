import { ApiError } from '../../utils/ApiError.js';
import { escapeSearch } from './charity.validation.js';

const PUBLIC_FIELDS =
  '_id name slug description images category upcomingEvents featured active isDemo';
export function toPublicCharity(record, now) {
  return {
    id: record._id.toString(),
    name: record.name,
    slug: record.slug,
    description: record.description,
    images: record.images.map((image) => ({ url: image.url, alt: image.alt })),
    category: record.category,
    upcomingEvents: record.upcomingEvents
      .filter((event) => event.startsAt >= now)
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((event) => ({
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        location: event.location,
        description: event.description,
      })),
    featured: record.featured,
    active: record.active,
    isDemo: record.isDemo,
  };
}

export function createCharityService(
  Charity,
  { timeoutMs = 3000, now = () => new Date() } = {},
) {
  async function withDatabase(operation) {
    if (!Charity || Charity.db.readyState !== 1)
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'The charity directory is temporarily unavailable.',
      );
    try {
      return await operation();
    } catch (error) {
      // Driver errors, including query timeouts, must not disclose the URI or query.
      if (
        error.name?.startsWith('Mongo') ||
        error.name === 'MongooseServerSelectionError'
      )
        throw new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'The charity directory is temporarily unavailable.',
        );
      throw error;
    }
  }
  return {
    async list({ q, category, page, limit }, { featuredOnly = false } = {}) {
      return withDatabase(async () => {
        const filter = { active: true };
        if (featuredOnly) filter.featured = true;
        if (category) filter.category = category;
        if (q) {
          const literal = escapeSearch(q);
          filter.$or = [
            { name: { $regex: literal, $options: 'i' } },
            { description: { $regex: literal, $options: 'i' } },
          ];
        }
        const [records, total] = await Promise.all([
          Charity.find(filter)
            .select(PUBLIC_FIELDS)
            .sort({ name: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .maxTimeMS(timeoutMs)
            .lean()
            .exec(),
          Charity.countDocuments(filter).maxTimeMS(timeoutMs).exec(),
        ]);
        const timestamp = now();
        return {
          items: records.map((record) => toPublicCharity(record, timestamp)),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1 && total > 0,
          },
        };
      });
    },
    async getById(id) {
      return withDatabase(async () => {
        const record = await Charity.findOne({ _id: id, active: true })
          .select(PUBLIC_FIELDS)
          .maxTimeMS(timeoutMs)
          .lean()
          .exec();
        if (!record)
          throw new ApiError(404, 'CHARITY_NOT_FOUND', 'Charity not found.');
        return toPublicCharity(record, now());
      });
    },
  };
}
