> **Hinweis fuer PyQuest (Lern-App):** Zwei Figuren dieses Gefolges heissen
> im Original "Byte" und "Glitch" - genauso wie zwei VERBUENDETE aus dem Intro.
> In der App tragen die Gegenspieler deshalb andere Namen:
> **Byte (Datendieb) -> Nibble** (Ordner `null-nibble`) und
> **Glitch (Fehlerkuenstler) -> Bug** (Ordner `null-bug`).
> Beides sind echte Fachbegriffe: Ein Nibble ist ein halbes Byte, ein Bug ist
> ein Programmfehler. Die Zuordnung der Texte steht in
> `public/content/figuren.json`.

# Professor Nulls Gefolge

Die fünf Figuren erweitern Professor Null um wiederkehrende Gegenspieler für
Zwischensequenzen und Lernmissionen. Konflikte werden über Programmieraufgaben,
Debugging und Entscheidungen gelöst, nicht über Gewalt.

## Figuren

| Figur | Aufgabe in der Geschichte | Neutrale Pose | Aktionspose |
|---|---|---|---|
| Ciphera | taktische Stellvertreterin; verschlüsselt Hinweise | `ciphera-neutral.png` | `ciphera-action.png` |
| Glitch | baut sichtbare Fehler in Programme ein | `glitch-neutral.png` | `glitch-action.png` |
| Loop | setzt Systeme in Endlosschleifen fest | `loop-neutral.png` | `loop-action.png` |
| Byte | vertauscht und stiehlt Datenwerte | `byte-neutral.png` | `byte-action.png` |
| Nullbit | Scout- und Schwarmdrohne | `nullbit-neutral.png` | `nullbit-action.png` |

`null-crew-lineup.png` und `null-crew-actions.png` zeigen alle Figuren gemeinsam
für Größenvergleich, Auswahlbildschirm und Storyboard.

## Technische Verwendung

- Alle PNG-Dateien besitzen einen echten transparenten Alphakanal.
- Die zehn Einzelposen liegen auf einer einheitlichen 900×900-Pixel-Fläche.
- Die Figur sollte innerhalb einer Szene immer über dieselbe CSS-Box gesetzt
  werden. Dadurch kann zwischen `neutral` und `action` überblendet werden.
- Hologramme, Pixelpartikel und Scanlicht sind Teil der Rasterpose. Zusätzliche
  Bewegungseffekte sollten als CSS-/SVG-Overlay ergänzt werden.
- Bei `prefers-reduced-motion` bleiben die Posen statisch.

Die Kapitelzuordnung und Figurenentwicklung stehen in `docs/NULL-CREW.md`.
