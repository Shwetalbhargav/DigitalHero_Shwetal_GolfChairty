import sharp from 'sharp';
import { createHash, timingSafeEqual } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../../utils/ApiError.js';
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export async function validateEvidence(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length)
    throw new ApiError(400, 'INVALID_PROOF', 'Send one PNG or JPEG image.');
  if (buffer.length > MAX_PROOF_BYTES)
    throw new ApiError(
      413,
      'PROOF_TOO_LARGE',
      'Evidence must be no larger than 5 MB.',
    );
  const png = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (!(png && mime === 'image/png') && !(jpeg && mime === 'image/jpeg'))
    throw new ApiError(
      400,
      'INVALID_PROOF_TYPE',
      'Only genuine PNG or JPEG images are accepted.',
    );
  try {
    const image = sharp(buffer, {
      limitInputPixels: 20000000,
      failOn: 'warning',
    });
    const metadata = await image.metadata();
    if (
      !['png', 'jpeg'].includes(metadata.format) ||
      (metadata.pages || 1) !== 1
    )
      throw new Error('Unsupported image');
    // Decode/re-encode strips metadata and appended/polyglot content; no SVG/PDF scripts survive.
    const data = await image.rotate().png().toBuffer();
    if (data.length > MAX_PROOF_BYTES)
      throw new ApiError(
        413,
        'PROOF_TOO_LARGE',
        'Decoded evidence must be no larger than 5 MB.',
      );
    return {
      data,
      format: 'png',
      bytes: data.length,
      digest: createHash('sha256').update(data).digest('hex'),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      'INVALID_PROOF_CONTENT',
      'The image could not be safely decoded. Use a valid single-frame PNG or JPEG.',
    );
  }
}
export function createEvidenceStorage(
  Evidence,
  config,
  { client = cloudinary, fetcher = fetch } = {},
) {
  const options = {
    ...config.cloudinary,
    secure: true,
    type: 'authenticated',
    resource_type: 'image',
    timeout: 30000,
  };
  function available() {
    if (
      !['local', 'cloudinary'].includes(config.proofStorage) ||
      (config.nodeEnv === 'production' && config.proofStorage === 'local')
    )
      throw new ApiError(
        503,
        'PROOF_STORAGE_DISABLED',
        'Proof storage is unavailable.',
      );
  }
  async function cleanup(asset) {
    // Durable staged record exists before contacting the provider, even for ambiguous timeouts.
    await Evidence.updateOne(
      { _id: asset._id, state: { $ne: 'attached' } },
      { $set: { state: 'cleanup' } },
    );
    const record = await Evidence.findById(asset._id);
    if (!record || record.state === 'attached') return;
    if (record.provider === 'cloudinary') {
      const result = await client.uploader.destroy(record._id, {
        ...options,
        invalidate: true,
      });
      if (!['ok', 'not found'].includes(result.result))
        throw new Error('Evidence cleanup failed');
    }
    await Evidence.deleteOne({ _id: record._id, state: 'cleanup' });
  }
  return {
    available,
    async upload(asset, evidence) {
      available();
      await Evidence.create({
        _id: asset.id,
        winner: asset.winner,
        charity: asset.charity,
        kind: asset.kind || 'proof',
        provider: config.proofStorage,
        bytes: evidence.bytes,
        format: evidence.format,
        digest: evidence.digest,
      });
      try {
        if (config.proofStorage === 'local')
          await Evidence.updateOne(
            { _id: asset.id },
            { $set: { data: evidence.data } },
          );
        else {
          const result = await new Promise((resolve, reject) =>
            client.uploader
              .upload_stream(
                {
                  ...options,
                  public_id: asset.id,
                  overwrite: false,
                  format: 'png',
                },
                (error, response) =>
                  error ? reject(error) : resolve(response),
              )
              .end(evidence.data),
          );
          const expected = client.utils.api_sign_request(
            { public_id: result.public_id, version: result.version },
            config.cloudinary.api_secret,
          );
          const actual = Buffer.from(result.signature || '');
          const signature = Buffer.from(expected);
          if (
            actual.length !== signature.length ||
            !timingSafeEqual(actual, signature) ||
            result.public_id !== asset.id ||
            result.type !== 'authenticated' ||
            result.resource_type !== 'image' ||
            result.format !== 'png' ||
            result.bytes > MAX_PROOF_BYTES
          )
            throw new Error('Invalid upload response');
        }
        return { _id: asset.id, provider: config.proofStorage };
      } catch {
        try {
          await cleanup({ _id: asset.id });
        } catch {
          /* Durable cleanup row is retried by cleanup-proof.js. */
        }
        throw new ApiError(
          502,
          'PROOF_UPLOAD_FAILED',
          'Evidence storage failed. Your verification state has not changed. Please retry.',
        );
      }
    },
    cleanup,
    async read(id) {
      const record = await Evidence.findOne({
        _id: id,
        state: 'attached',
      }).select('+data');
      if (!record)
        throw new ApiError(404, 'PROOF_NOT_FOUND', 'Evidence not found.');
      if (record.provider === 'local') return Buffer.from(record.data);
      // Fetch through the authorized API; never return a provider URL or secret to a member.
      const url = client.utils.private_download_url(record._id, 'png', {
        ...options,
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
      try {
        const response = await fetcher(url, {
          signal: AbortSignal.timeout(30000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('Evidence unavailable');
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > MAX_PROOF_BYTES) throw new Error('Evidence oversized');
            chunks.push(Buffer.from(value));
          }
        } finally {
          await reader.cancel();
        }
        const data = Buffer.concat(chunks);
        if (createHash('sha256').update(data).digest('hex') !== record.digest)
          throw new Error('Evidence integrity mismatch');
        return data;
      } catch {
        throw new ApiError(
          502,
          'PROOF_UNAVAILABLE',
          'Evidence cannot be retrieved right now.',
        );
      }
    },
    async retryCleanup() {
      const rows = await Evidence.find({
        $or: [
          { state: 'cleanup' },
          {
            state: 'staged',
            createdAt: { $lt: new Date(Date.now() - 3600000) },
          },
        ],
      });
      let removed = 0;
      for (const row of rows) {
        await cleanup(row);
        removed++;
      }
      return { removed };
    },
  };
}
