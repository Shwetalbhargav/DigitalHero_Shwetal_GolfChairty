import { ApiError } from '../../utils/ApiError.js';
import { validateBody, validateContribution } from '../auth/auth.validation.js';
import { parseCharityId } from '../charities/charity.validation.js';
import { publicUser } from './user.model.js';
export function createUserService(User, Charity, config) {
  return {
    async updateCharity(user, body) {
      validateBody(body, ['charityId', 'contributionPercent']);
      const charity = parseCharityId(body.charityId);
      const contributionPercent = validateContribution(
        body.contributionPercent,
        config.maxContributionPercent,
      );
      if (!(await Charity.exists({ _id: charity, active: true })))
        throw new ApiError(400, 'INVALID_CHARITY', 'Choose an active charity.');
      const updated = await User.findOneAndUpdate(
        { _id: user._id, suspended: false },
        { charity, contributionPercent },
        { new: true, runValidators: true },
      );
      if (!updated)
        throw new ApiError(
          403,
          'ACCOUNT_UNAVAILABLE',
          'Your account is unavailable.',
        );
      return publicUser(updated);
    },
  };
}
