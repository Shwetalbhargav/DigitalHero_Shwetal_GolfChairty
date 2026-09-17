import { ApiError } from '../../utils/ApiError.js';
import { validateBody, validateContribution } from '../auth/auth.validation.js';
import { parseCharityId } from '../charities/charity.validation.js';
import { publicUser } from './user.model.js';
import { validateProfile } from './user.validation.js';
import { publicScore } from '../scores/score.model.js';
export function createUserService(
  User,
  Charity,
  config,
  { Score, subscriptions, draws, winners } = {},
) {
  async function section(load) {
    try {
      return { status: 'ready', data: await load() };
    } catch {
      return {
        status: 'error',
        data: null,
        message: 'This part of your dashboard is temporarily unavailable.',
      };
    }
  }
  return {
    async updateProfile(user, body) {
      const fields = validateProfile(body);
      const updated = await User.findOneAndUpdate(
        { _id: user._id, suspended: false },
        { $set: fields },
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
    async dashboard(user) {
      const [subscription, scores, charity] = await Promise.all([
        section(() => subscriptions.current(user)),
        section(async () => {
          const rows = await Score.find({ user: user._id })
            .sort({ roundDate: -1 })
            .limit(5)
            .lean();
          return {
            items: rows.map(publicScore),
            count: rows.length,
            remaining: 5 - rows.length,
          };
        }),
        section(async () => {
          const record = await Charity.findById(user.charity)
            .select('name active isDemo category')
            .lean();
          return record
            ? {
                id: String(record._id),
                name: record.name,
                active: record.active,
                isDemo: record.isDemo,
                category: record.category,
                contributionPercent: user.contributionPercent,
              }
            : null;
        }),
      ]);
      const drawSummary = draws
        ? await section(() => draws.dashboard(user))
        : null;
      const winningsSummary = winners
        ? await section(() => winners.summary(user))
        : null;
      return {
        user: publicUser(user),
        subscription,
        scores,
        charity,
        upcomingDraw: drawSummary
          ? drawSummary.status === 'ready'
            ? drawSummary.data.upcomingDraw
            : drawSummary
          : {
              status: 'unavailable',
              data: null,
              message: 'Draw scheduling is not connected yet.',
            },
        participation: drawSummary
          ? drawSummary.status === 'ready'
            ? drawSummary.data.participation
            : drawSummary
          : {
              status: 'unavailable',
              count: null,
              message: 'Participation records are not connected yet.',
            },
        winnings: winningsSummary || {
          status: 'unavailable',
          amountMinor: null,
          currency: null,
          message: 'Winner records are not connected yet.',
        },
      };
    },
    async updateCharity(user, body) {
      validateBody(body, ['charityId', 'contributionPercent']);
      const charity = parseCharityId(body.charityId);
      const contributionPercent = validateContribution(
        body.contributionPercent,
        config.maxContributionPercent,
      );
      if (
        !(await Charity.findOneAndUpdate(
          { _id: charity, active: true },
          { $set: { hasReferences: true } },
        ))
      )
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
