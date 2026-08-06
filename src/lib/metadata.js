const SITE_NAME = 'CARLAY ART';

export function pageTitle(title) {
  return title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
}

export function canonicalPath(pathname) {
  if (pathname === '/') return '/';
  return `/${pathname.replace(/^\/+|\/+$/g, '')}/`;
}
