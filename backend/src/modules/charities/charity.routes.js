import { Router } from 'express';
import { createCharityController } from './charity.controller.js';

export function createCharityRoutes(service) {
  const router = Router();
  const controller = createCharityController(service);
  router.get('/', controller.list);
  // Literal route must precede the ObjectId route so "featured" is never cast as an ID.
  router.get('/featured', controller.featured);
  router.get('/:id', controller.detail);
  return router;
}
