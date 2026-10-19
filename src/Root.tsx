import { useEffect } from 'react';
import App from './App';
import { LessonView } from './components/library/LessonView';
import { LibraryIndex } from './components/library/LibraryIndex';
import { SiteNav } from './components/library/SiteNav';
import { getLesson } from './lessons';
import { useRoute, type Route } from './lib/route';

export function titleFor(route: Route): string {
  switch (route.page) {
    case 'heart-block':
      return 'Heart block: where the gate fails';
    case 'library':
      return 'Arrhythmia Animation Library';
    case 'lesson':
      return `${getLesson(route.id)?.short ?? 'Lesson not found'} · Arrhythmia Animation Library`;
  }
}

function NotFound() {
  return (
    <main className="lib-page">
      <h1 className="lib-title">Lesson not found</h1>
      <p className="lib-lede">
        That lesson does not exist. <a href="#/library">Back to the library</a>.
      </p>
    </main>
  );
}

export default function Root() {
  const route = useRoute();
  const key = route.page === 'lesson' ? `lesson:${route.id}` : route.page;

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const lesson = route.page === 'lesson' ? getLesson(route.id) : undefined;

  return (
    <>
      <SiteNav route={route} />
      {route.page === 'heart-block' && <App />}
      {route.page === 'library' && <LibraryIndex />}
      {route.page === 'lesson' && (lesson ? <LessonView lesson={lesson} option={route.option} /> : <NotFound />)}
    </>
  );
}
