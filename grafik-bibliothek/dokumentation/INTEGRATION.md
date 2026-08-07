# Integration in PyQuest

## Eigenständig verwenden

Der Ordner `prototypes/current-intro/` benötigt keinen Build und keine externen
Bibliotheken. Er kann über jeden statischen Webserver bereitgestellt werden.

## Abschluss erkennen

Beim Klick auf `Abenteuer beginnen` löst das Intro folgendes Ereignis aus:

```js
window.addEventListener('pyquest:intro-complete', () => {
  // Zur Lernpfad-Ansicht wechseln oder das Intro ausblenden.
});
```

## In eine bestehende Seite einbetten

Die einfachste entkoppelte Variante ist ein `iframe`:

```html
<iframe
  src="/prototypes/current-intro/"
  title="PyQuest Intro"
  allow="autoplay"
></iframe>
```

Alternativ können `index.html`, `styles.css` und `intro.js` direkt in die
bestehende Anwendung übernommen werden. Die relativen Pfade zur Bibliothek
müssen dabei erhalten oder angepasst werden.

## Figuren und Welten wiederverwenden

```js
import {
  characterAsset,
  worldAsset,
} from './assets/library/pyquest-assets.js';

adaImage.src = characterAsset('ada', 'thoughtful');
nullImage.src = characterAsset('null', 'defeated');
scene.style.backgroundImage = `url(${worldAsset('itera', 'corrupted')})`;
```

Die erlaubten Namen stehen in den Manifesten:

- `assets/library/characters/manifest.json`
- `assets/library/worlds/manifest.json`

## Barrierefreiheit und Schulbetrieb

- Jeder Dialog bleibt bis zur aktiven Navigation stehen.
- Alle Funktionen sind per Tastatur erreichbar.
- `prefers-reduced-motion` deaktiviert längere Bewegungen und Übergänge.
- Stimmen werden nicht verwendet; es gibt daher keine schwer verständliche
  künstliche Sprachausgabe.
- Sound ist optional und mit einem sichtbaren Schalter deaktivierbar.
