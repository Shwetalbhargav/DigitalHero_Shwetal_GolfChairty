import { randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/ApiError.js';
import { validateBody } from '../auth/auth.validation.js';
import { drawId } from '../draws/draw.validation.js';
import { escapeSearch } from '../charities/charity.validation.js';
import { adminQuery } from './admin-users.service.js';
import { auditReason, recordAudit, createAuditModel } from './audit.model.js';
import { touchDrawState } from '../draws/draw.model.js';
import { validateEvidence } from '../winners/evidence.storage.js';
const fields = [
  'name',
  'slug',
  'description',
  'category',
  'upcomingEvents',
  'featured',
  'active',
  'images',
];
export function adminCharityView(row) {
  return {
    id: String(row._id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    upcomingEvents: row.upcomingEvents,
    featured: row.featured,
    active: row.active,
    isDemo: row.isDemo,
    images: row.images.map((image) => ({ url: image.url, alt: image.alt })),
  };
}
export function createAdminCharityService({
  Charity,
  User,
  Payment,
  Evidence,
  storage,
  config,
}) {
  const Audit = createAuditModel(Charity.db);
  async function get(id, session) {
    const row = await Charity.findById(drawId(id))
      .select('+hasReferences')
      .session(session || null);
    if (!row)
      throw new ApiError(404, 'CHARITY_NOT_FOUND', 'Charity not found.');
    return row;
  }
  async function validate(body, row) {
    validateBody(body, [...fields, 'reason']);
    const next = {};
    for (const key of fields)
      if (body[key] !== undefined) next[key] = body[key];
    if (next.images !== undefined) {
      if (!Array.isArray(next.images) || next.images.length > 10 || new Set(next.images.map((i) => i?.url)).size !== next.images.length) throw new ApiError(400, 'INVALID_MEDIA', 'Choose up to ten distinct existing images.');
      next.images = next.images.map((image) => {
        validateBody(image, ['url', 'alt']);
        const existing = row.images.find((i) => i.url === image.url);
        if (!existing || typeof image.alt !== 'string' || image.alt.trim().length < 3 || image.alt.length > 300) throw new ApiError(400, 'INVALID_MEDIA', 'Images must belong to this charity and have a description.');
        return { ...existing.toObject(), alt: image.alt.trim() };
      });
    }
    if (!Object.keys(next).length)
      throw new ApiError(
        400,
        'INVALID_INPUT',
        'Supply charity content to save.',
      );
    for (const key of ['name', 'slug', 'description', 'category'])
      if (next[key] !== undefined && typeof next[key] !== 'string')
        throw new ApiError(
          400,
          'INVALID_CHARITY',
          'Charity text fields must be strings.',
        );
    for (const key of ['active', 'featured'])
      if (next[key] !== undefined && typeof next[key] !== 'boolean')
        throw new ApiError(400, 'INVALID_CHARITY', 'Flags must be boolean.');
    if (next.upcomingEvents !== undefined) {
      if (!Array.isArray(next.upcomingEvents))
        throw new ApiError(400, 'INVALID_EVENTS', 'Events must be an array.');
      for (const event of next.upcomingEvents) {
        validateBody(event, ['title', 'startsAt', 'location', 'description']);
        if (
          typeof event.title !== 'string' ||
          !event.title.trim() ||
          typeof event.startsAt !== 'string' ||
          !Number.isFinite(Date.parse(event.startsAt))
        )
          throw new ApiError(
            400,
            'INVALID_EVENTS',
            'Events need a title and valid start time.',
          );
      }
    }
    row.set(next);
    try {
      await row.validate();
    } catch {
      throw new ApiError(
        400,
        'INVALID_CHARITY',
        'Check the name, unique slug, category, description (20–5000 characters), and events.',
      );
    }
    return row;
  }
  async function save(id, body, actor) {
    const reason = auditReason(body.reason);
    let output;
    try {
      await Charity.db.transaction(async (session) => {
        await touchDrawState(Charity.db, session);
        const row = id
          ? await get(id, session)
          : new Charity({ isDemo: config.nodeEnv !== 'production' });
        const before = id ? adminCharityView(row) : null;
        await validate(body, row);
        // The shared write lock serializes admin slug changes before subdocument saves.
        if (
          await Charity.exists({
            slug: row.slug,
            _id: { $ne: row._id },
          }).session(session)
        )
          throw new ApiError(
            409,
            'DUPLICATE_SLUG',
            'That charity slug already exists.',
          );
        await row.save({ session });
        output = adminCharityView(row);
        await recordAudit(
          Charity.db,
          {
            actor,
            reason,
            action: id ? 'charity.update' : 'charity.create',
            entity: 'charity',
            entityId: row._id,
            before,
            after: output,
          },
          session,
        );
      });
    } catch (error) {
      if (error.code === 11000)
        throw new ApiError(
          409,
          'DUPLICATE_SLUG',
          'That charity slug already exists.',
        );
      throw error;
    }
    return output;
  }
  return {
    save,
    async list(query) {
      const { q, page, limit } = adminQuery(query);
      const filter = q
        ? { name: { $regex: escapeSearch(q), $options: 'i' } }
        : {};
      return {
        items: (
          await Charity.find(filter)
            .sort({ name: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
        ).map(adminCharityView),
        page,
        limit,
        total: await Charity.countDocuments(filter),
      };
    },
    async detail(id) {
      const row = await get(id);
      return {
        charity: adminCharityView(row),
        audit: await Audit.find({ entity: 'charity', entityId: id })
          .sort({ at: -1 })
          .limit(100)
          .lean(),
      };
    },
    async remove(id, body, actor) {
      validateBody(body, ['reason']);
      const reason = auditReason(body.reason);
      let result;
      await Charity.db.transaction(async (session) => {
        await touchDrawState(Charity.db, session);
        const row = await get(id, session);
        const before = adminCharityView(row);
        const referenced =
          row.hasReferences ||
          (await User.exists({ charity: row._id }).session(session)) ||
          (await Payment.exists({ charity: row._id }).session(session));
        if (referenced) {
          row.active = false;
          row.featured = false;
          await row.save({ session });
          result = { action: 'archived', charity: adminCharityView(row) };
        } else {
          await Charity.deleteOne({ _id: row._id }, { session });
          result = { action: 'deleted', id };
        }
        await recordAudit(
          Charity.db,
          {
            actor,
            reason,
            action: 'charity.' + result.action,
            entity: 'charity',
            entityId: id,
            before,
            after: result,
          },
          session,
        );
      });
      return result;
    },
    async upload(id, buffer, mime, alt, reason, actor) {
      reason = auditReason(reason);
      if (typeof alt !== 'string' || alt.trim().length < 3 || alt.length > 300)
        throw new ApiError(
          400,
          'INVALID_ALT',
          'Describe the image in 3–300 characters.',
        );
      const row = await get(id);
      if (row.images.length >= 10)
        throw new ApiError(
          400,
          'MEDIA_LIMIT',
          'At most ten charity images are supported.',
        );
      const content = await validateEvidence(buffer, mime);
      const assetId = 'digital-heroes-charity/' + randomUUID();
      const asset = await storage.upload(
        { id: assetId, charity: row._id, kind: 'charity' },
        content,
      );
      try {
        await Charity.db.transaction(async (session) => {
          await touchDrawState(Charity.db, session);
          const charity = await get(id, session);
          if (charity.images.length >= 10)
            throw new ApiError(
              409,
              'MEDIA_LIMIT',
              'Another upload filled the media limit.',
            );
          const before = adminCharityView(charity);
          charity.images.push({
            assetId,
            url:
              config.clientOrigin +
              '/api/charities/' +
              id +
              '/media/' +
              assetId.split('/')[1],
            alt: alt.trim(),
          });
          await charity.save({ session });
          await Evidence.updateOne(
            { _id: assetId },
            { $set: { state: 'attached' } },
            { session },
          );
          await recordAudit(
            Charity.db,
            {
              actor,
              reason,
              action: 'charity.media',
              entity: 'charity',
              entityId: id,
              before,
              after: adminCharityView(charity),
            },
            session,
          );
        });
      } catch (error) {
        try {
          await storage.cleanup(asset);
        } catch {
          /* Retain durable cleanup record. */
        }
        throw error;
      }
      return {
        charity: (await this.detail(id)).charity,
        storage: asset.provider,
      };
    },
    async media(id, mediaId) {
      if (!/^[a-f0-9-]{36}$/i.test(mediaId))
        throw new ApiError(400, 'INVALID_MEDIA', 'Invalid image ID.');
      const assetId = 'digital-heroes-charity/' + mediaId;
      if (
        !(await Charity.exists({
          _id: drawId(id),
          active: true,
          'images.assetId': assetId,
        })) ||
        !(await Evidence.exists({
          _id: assetId,
          kind: 'charity',
          charity: id,
          state: 'attached',
        }))
      )
        throw new ApiError(404, 'MEDIA_NOT_FOUND', 'Image not found.');
      return storage.read(assetId);
    },
  };
}
