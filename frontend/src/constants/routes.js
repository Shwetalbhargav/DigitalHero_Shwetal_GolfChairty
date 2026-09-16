export const ROUTES = Object.freeze({
  home: '/',
  library: '/ui',
  status: '/status',
  member: '/dashboard',
  admin: '/admin',
});
export const publicNavigation = Object.freeze([
  { to: ROUTES.home, label: 'Foundation' },
  { to: ROUTES.library, label: 'UI library' },
  { to: ROUTES.member, label: 'Member shell' },
  { to: ROUTES.admin, label: 'Admin shell' },
]);
export function shellNavigation(mode = 'member') {
  const base = mode === 'admin' ? ROUTES.admin : ROUTES.member;
  return [
    { to: base, label: 'Overview', symbol: '◫' },
    { to: base + '/ui', label: 'UI library', symbol: '◇' },
    { to: base + '/status', label: 'Service status', symbol: '◉' },
  ];
}
