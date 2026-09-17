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
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.charities, label: 'Charities' },
  { to: ROUTES.member, label: 'My dashboard' },
]);
export const marketingNavigation = Object.freeze([
  { to: ROUTES.login, label: 'Sign in' },
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.howItWorks, label: 'How it works' },
  { to: ROUTES.charities, label: 'Charities' },
  { to: '/pricing', label: 'Membership' },
]);
export function shellNavigation(mode = 'member') {
  const base = mode === 'admin' ? ROUTES.admin : ROUTES.member;
  return [
    ...(mode === 'member'
      ? [
          { to: base + '/charity', label: 'My charity', symbol: '♡' },
          { to: base + '/scores', label: 'Scores', symbol: '▤' },
          { to: base + '/draws', label: 'Draws', symbol: '◇' },
          { to: base + '/winnings', label: 'Winnings', symbol: '☆' },
          { to: base + '/profile', label: 'Profile', symbol: '○' },
          { to: base + '/subscription', label: 'Subscription', symbol: '◈' },
          { to: base + '/giving', label: 'Giving history', symbol: '♡' },
          { to: base + '/notifications', label: 'Notifications', symbol: '◉' },
        ]
      : [
          { to: base + '/users', label: 'Members', symbol: '○' },
          { to: base + '/charities', label: 'Charities', symbol: '♡' },
          { to: base + '/draws', label: 'Draws', symbol: '◇' },
          { to: base + '/winners', label: 'Winners', symbol: '☆' },
          { to: base + '/reports', label: 'Reports', symbol: '▤' },
        ]),
    { to: base, label: 'Overview', symbol: '◫' },
  ];
}
