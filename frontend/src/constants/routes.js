export const ROUTES = Object.freeze({
  home: '/',
  foundation: '/foundation',
  register: '/register',
  login: '/login',
  charities: '/charities',
  howItWorks: '/how-it-works',
  library: '/ui',
  status: '/status',
  member: '/dashboard',
  admin: '/admin',
});
export const publicNavigation = Object.freeze([
  { to: ROUTES.foundation, label: 'Foundation' },
  { to: ROUTES.library, label: 'UI library' },
  { to: ROUTES.member, label: 'Member shell' },
  { to: ROUTES.admin, label: 'Admin shell' },
]);
export const marketingNavigation = Object.freeze([
  { to: ROUTES.login, label: 'Sign in' },
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.howItWorks, label: 'How it works' },
  { to: ROUTES.charities, label: 'Charities' },
]);
export function shellNavigation(mode = 'member') {
  const base = mode === 'admin' ? ROUTES.admin : ROUTES.member;
  return [
    { to: base, label: 'Overview', symbol: '◫' },
    { to: base + '/ui', label: 'UI library', symbol: '◇' },
    { to: base + '/status', label: 'Service status', symbol: '◉' },
  ];
}
