# Grafik-Bibliothek

Alle Bilder für PyQuest an einem Ort – Figuren, Welten und der Vorspann.
Dieser Ordner ist ein **Archiv**: Er wird nicht mit der Website ausgeliefert,
sondern ist die Quelle, aus der Bilder in die App übernommen werden.

## Was liegt wo

| Ordner | Inhalt |
|---|---|
| `figuren/` | 8 Figuren mit je 8 Posen (PNG, transparenter Hintergrund) |
| `welten/` | 16 Welten mit je 4 Zuständen (WebP) |
| `intro-szenen/` | 5 filmische Hintergründe für den Vorspann (WebP) |
| `intro-originalfassung/` | Der Vorspann, wie geliefert (HTML, CSS, JavaScript) |
| `vorschaubilder/` | Übersichtsbilder zum schnellen Draufschauen |
| `dokumentation/` | Szenen-, Integrations- und Qualitätsdokumentation |
| `uebersicht.html` | Durchsuchbare Bildübersicht (im Browser öffnen) |
| `pyquest-assets.js` | Helfer, der aus Namen sichere Bildpfade baut |

## Figuren

`ada`, `byte`, `code-apprentice`, `glitch`, `memo`, `nia`, `professor-null`, `py`

Jede Figur hat dieselben acht Posen:
`neutral`, `funny`, `angry`, `clever`, `thoughtful`, `worried`, `surprised`, `victory`

Professor Null hat zusätzlich `defeated`.

```text
figuren/ada/thoughtful.png
```

## Welten

16 Welten, benannt nach den Kapiteln der Lern-App – von `01-neustart` bis
`16-finalia`. Jede Welt gibt es in vier Zuständen:

| Zustand | Bedeutung |
|---|---|
| `intact` | unversehrt, vor dem Angriff |
| `corrupted` | verfälscht durch Professor Null |
| `destroyed` | zerstört |
| `restored` | wiederhergestellt |

```text
welten/08-itera/destroyed.webp
```

Damit lässt sich später eine Weltkarte bauen, auf der eine Welt ihren Zustand
ändert, sobald das passende Kapitel abgeschlossen ist.

## Verhältnis zur laufenden App

Die App nutzt **nicht** diesen Ordner direkt, sondern eine verkleinerte Kopie
unter `public/intro/`:

- Die Figuren liegen hier als PNG (Originalqualität, zusammen rund 14 MB).
  Für die Website wurden sie nach WebP gewandelt – aus 11 MB wurden 2 MB,
  ohne sichtbaren Unterschied.
- Übernommen wurde nur, was der Vorspann tatsächlich zeigt: 7 Figuren,
  3 Welten, 5 Szenen.

Wer später weitere Bilder in die App holen will, nimmt
`arbeitsblaetter/intro_uebernehmen.py` als Vorlage – dort steht die
Umwandlung samt Pfadanpassung.

## Herkunft

Zusammengeführt aus zwei gelieferten Paketen:

- `PyQuest-Intro-Komplettpaket` – Vorspann und vollständige Bibliothek
- `PyQuest-Asset-Bibliothek` – dieselbe Bibliothek erneut

Die Figuren- und Weltbilder waren in beiden Paketen **byte-identisch**
(geprüft mit Prüfsummen) und liegen deshalb hier nur einmal. Erzeugt mit
`arbeitsblaetter/grafiken_archivieren.py`.
