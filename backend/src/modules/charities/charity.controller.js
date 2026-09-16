import { apiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseCharityId, parseCharityQuery } from './charity.validation.js';

export function createCharityController(service) {
  return {
    async list(req, res) {
      const query = parseCharityQuery(req.query);
      res.json(apiResponse(await service.list(query), req.id));
    },
    async featured(req, res) {
      const query = parseCharityQuery(req.query);
      res.json(
        apiResponse(await service.list(query, { featuredOnly: true }), req.id),
      );
    },
    async detail(req, res) {
      const id = parseCharityId(req.params.id);
      if (Object.keys(req.query).length)
        throw new ApiError(
          400,
          'INVALID_QUERY',
          'Charity detail does not accept query parameters.',
        );
      res.json(apiResponse(await service.getById(id), req.id));
    },
  };
}
