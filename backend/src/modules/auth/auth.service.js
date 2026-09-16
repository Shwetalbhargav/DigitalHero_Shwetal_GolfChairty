import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { validateCredentials } from './auth.validation.js';
export function createAuthService(User, Charity, config) {
  async function register(body) {
    const { password, ...fields } = validateCredentials(
      body,
      true,
      config.maxContributionPercent,
    );
    if (!(await Charity.exists({ _id: fields.charity, active: true })))
      throw new ApiError(400, 'INVALID_CHARITY', 'Choose an active charity.');
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await User.create({ ...fields, passwordHash });
    } catch (error) {
      if (error.code === 11000)
        throw new ApiError(
          409,
          'EMAIL_EXISTS',
          'An account with this email already exists.',
        );
      throw error;
    }
  }
  async function login(body) {
    const { email, password } = validateCredentials(body);
    const user = await User.findOne({ email }).select(
      '+passwordHash +tokenVersion',
    );
    // Perform the same expensive password work for an unknown address.
    const hash =
      user?.passwordHash ||
      '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
    const valid = await bcrypt.compare(password, hash);
    if (!user || !valid)
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      );
    if (user.suspended)
      throw new ApiError(
        403,
        'ACCOUNT_SUSPENDED',
        'This account is suspended.',
      );
    return user;
  }
  async function logout(user) {
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  }
  return { register, login, logout };
}
