import mongoose from 'mongoose';
import {
  CATEGORY_PATTERN,
  SLUG_PATTERN,
  isHttpUrl,
} from './charity.validation.js';

const { Schema } = mongoose;
const imageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: isHttpUrl,
    },
    alt: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false, strict: 'throw' },
);
const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    startsAt: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: false, strict: 'throw' },
);
const charitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: SLUG_PATTERN,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 10,
        message: 'A charity can have at most 10 images.',
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      match: CATEGORY_PATTERN,
    },
    upcomingEvents: {
      type: [eventSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 50,
        message: 'A charity can have at most 50 events.',
      },
    },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    seedKey: { type: String, immutable: true, select: false, maxlength: 100 },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);
charitySchema.index({ slug: 1 }, { unique: true });
charitySchema.index({ seedKey: 1 }, { unique: true, sparse: true });
charitySchema.index({ active: 1, name: 1, _id: 1 });
charitySchema.index({ active: 1, category: 1, name: 1, _id: 1 });
charitySchema.index({ active: 1, featured: 1, name: 1, _id: 1 });

export function createCharityModel(connection) {
  return (
    connection.models.Charity || connection.model('Charity', charitySchema)
  );
}
