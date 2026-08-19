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
//
// Wichtig: Kapitel und Lektionen werden PARALLEL geladen (Promise.all), nicht
// nacheinander. Es sind rund 85 kleine JSON-Dateien; beim Hosting auf GitHub
// Pages kostet jede Anfrage ~150 ms Latenz. Sequenziell waren das ueber 16
// Sekunden Ladezeit, parallel bleiben drei Wellen (Curriculum -> alle Kapitel
// -> alle Lektionen) und damit deutlich unter einer Sekunde.
export async function loadCurriculum() {
  if (cache) return cache;

  // Begleitfiguren gleich mit der ersten Welle laden - eine eigene Welle
  // waere reine Wartezeit. Fehlt die Datei, laeuft alles ohne Figuren weiter.
  const [curriculum, figuren] = await Promise.all([
    loadJson("curriculum.json"),
    loadJson("figuren.json").catch(() => null),
  ]);

  const chapters = await Promise.all(
    curriculum.chapters.map(async (chapterId) => {
      const chapter = await loadJson(`chapters/${chapterId}/chapter.json`);
      const lessons = await Promise.all(
        chapter.lessons.map(async (lessonId) => {
          const lesson = await loadJson(
            `chapters/${chapterId}/lessons/${lessonId}.json`
          );
          return { ...lesson, chapterId };
        })
      );
      return { ...chapter, lessons };
    })
  );

  // Kapitel-Tests (nach je zwei Kapiteln) ebenfalls parallel dazuladen.
  const tests = await Promise.all(
    (curriculum.tests ?? []).map((testId) => loadJson(`tests/${testId}.json`))
  );

  cache = { title: curriculum.title, chapters, tests, figuren };
  return cache;
}

// Liefert den Test, der NACH diesem Kapitel kommt (oder null).
export function testAfterChapter(curriculum, chapterId) {
  return (curriculum.tests ?? []).find((t) => t.afterChapter === chapterId) ?? null;
}

export function findTest(curriculum, testId) {
  return (curriculum.tests ?? []).find((t) => t.id === testId) ?? null;
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
