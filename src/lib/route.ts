import { useSyncExternalStore } from 'react';

export type Route =
  | { page: 'library' }
  | { page: 'lesson'; id: string; option: string | null };

/** Hash routes work on GitHub Pages without server rewrites. Anything that is not a lesson shows the library index. */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'library' || parts.length === 1) return { page: 'library' };
  return { page: 'lesson', id: decodeURIComponent(parts[1]), option: new URLSearchParams(query).get('option') };
}

export function hrefFor(route: Route): string {
  switch (route.page) {
    case 'library':
      return '#/library';
    case 'lesson': {
      const base = `#/library/${encodeURIComponent(route.id)}`;
      return route.option ? `${base}?option=${encodeURIComponent(route.option)}` : base;
    }
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;
const getServerHash = () => '';

export function useHash(): string {
  return useSyncExternalStore(subscribe, getHash, getServerHash);
}

export function useRoute(): Route {
  return parseRoute(useHash());
}

/** Changes the option in the URL without adding a history entry. */
export function replaceOption(id: string, option: string): void {
  window.history.replaceState(null, '', hrefFor({ page: 'lesson', id, option }));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
