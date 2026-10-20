import { hrefFor, type Route } from '../../lib/route';

export function SiteNav({ route }: { route: Route }) {
  return (
    <header className="site-nav">
      <nav aria-label="Site">
        <a href={hrefFor({ page: 'library' })} aria-current={route.page === 'library' ? 'page' : 'true'}>
          Arrhythmia library
        </a>
      </nav>
    </header>
  );
}
