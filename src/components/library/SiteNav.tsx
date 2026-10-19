import { hrefFor, type Route } from '../../lib/route';

export function SiteNav({ route }: { route: Route }) {
  const inLibrary = route.page === 'library' || route.page === 'lesson';
  return (
    <header className="site-nav">
      <nav aria-label="Site">
        <a href={hrefFor({ page: 'heart-block' })} aria-current={route.page === 'heart-block' ? 'page' : undefined}>
          Heart block
        </a>
        <a href={hrefFor({ page: 'library' })} aria-current={route.page === 'library' ? 'page' : inLibrary ? 'true' : undefined}>
          Arrhythmia library
        </a>
      </nav>
    </header>
  );
}
