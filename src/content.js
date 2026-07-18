// Laedt Curriculum, Kapitel und Lektionen aus public/content/ zur Laufzeit.
// So lassen sich neue Kapitel durch Hinzufuegen von JSON-Dateien ergaenzen –
// ohne den Code anzufassen.

const BASE = import.meta.env.BASE_URL; // z. B. "/pyquest/"

async function loadJson(path) {
  const res = await fetch(`${BASE}content/${path}`);
  if (!res.ok) throw new Error(`Konnte ${path} nicht laden (${res.status})`);
  return res.json();
}

let cache = null;

// Laedt das komplette Curriculum inkl. aller Kapitel und Lektionen.
export async function loadCurriculum() {
  if (cache) return cache;

  const curriculum = await loadJson("curriculum.json");
  const chapters = [];

  for (const chapterId of curriculum.chapters) {
    const chapter = await loadJson(`chapters/${chapterId}/chapter.json`);
    const lessons = [];
    for (const lessonId of chapter.lessons) {
      const lesson = await loadJson(
        `chapters/${chapterId}/lessons/${lessonId}.json`
      );
      lessons.push({ ...lesson, chapterId });
    }
    chapters.push({ ...chapter, lessons });
  }

  cache = { title: curriculum.title, chapters };
  return cache;
}

// Liefert eine flache Liste aller Lektionen in Reihenfolge (fuer Freischaltlogik).
export function flattenLessons(curriculum) {
  const flat = [];
  for (const chapter of curriculum.chapters) {
    for (const lesson of chapter.lessons) {
      flat.push({ chapterId: chapter.id, lessonId: lesson.id, lesson, chapter });
    }
  }
  return flat;
}

export function findLesson(curriculum, chapterId, lessonId) {
  const chapter = curriculum.chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;
  const lesson = chapter.lessons.find((l) => l.id === lessonId);
  if (!lesson) return null;
  return { chapter, lesson };
}
