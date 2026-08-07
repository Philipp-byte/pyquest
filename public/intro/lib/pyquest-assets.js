const LIBRARY_ROOT = new URL('./', import.meta.url);

export const CHARACTER_POSES = Object.freeze([
  'neutral',
  'funny',
  'angry',
  'clever',
  'thoughtful',
  'worried',
  'surprised',
  'victory',
]);

export const CHARACTERS = Object.freeze({
  py: { name: 'Py', folder: 'py' },
  ada: { name: 'Wächterin Ada', folder: 'ada' },
  null: { name: 'Professor Null', folder: 'professor-null' },
  apprentice: { name: 'Code-Lehrling', folder: 'code-apprentice' },
  byte: { name: 'Byte', folder: 'byte' },
  glitch: { name: 'Glitch', folder: 'glitch' },
  nia: { name: 'Code-Scout Nia', folder: 'nia' },
  memo: { name: 'Archivarin Memo', folder: 'memo' },
});

export const CHARACTER_SPECIAL_POSES = Object.freeze({
  null: Object.freeze(['defeated']),
});

export const WORLD_STATES = Object.freeze([
  'intact',
  'corrupted',
  'destroyed',
  'restored',
]);

export const WORLDS = Object.freeze({
  neustart: { name: 'Neustart', folder: '01-neustart' },
  speicherstadt: { name: 'Speicherstadt', folder: '02-speicherstadt' },
  typopolis: { name: 'Typopolis', folder: '03-typopolis' },
  textoria: { name: 'Textoria', folder: '04-textoria' },
  operatia: { name: 'Operatia', folder: '05-operatia' },
  dialoga: { name: 'Dialoga', folder: '06-dialoga' },
  entscheidora: { name: 'Entscheidora', folder: '07-entscheidora' },
  itera: { name: 'Itera', folder: '08-itera' },
  listara: { name: 'Listara', folder: '09-listara' },
  forvania: { name: 'Forvania', folder: '10-forvania' },
  funktoria: { name: 'Funktoria', folder: '11-funktoria' },
  matrixa: { name: 'Matrixa', folder: '12-matrixa' },
  lexikona: { name: 'Lexikona', folder: '13-lexikona' },
  objektiva: { name: 'Objektiva', folder: '14-objektiva' },
  archivia: { name: 'Archivia', folder: '15-archivia' },
  finalia: { name: 'Finalia', folder: '16-finalia' },
});

function requireEntry(collection, id, kind) {
  const entry = collection[id];
  if (!entry) throw new Error(`Unbekannte ${kind}: ${id}`);
  return entry;
}

function requireVariant(variants, value, kind) {
  if (!variants.includes(value)) throw new Error(`Unbekannte ${kind}: ${value}`);
}

export function characterAsset(character = 'py', pose = 'neutral') {
  const entry = requireEntry(CHARACTERS, character, 'Figur');
  const availablePoses = [
    ...CHARACTER_POSES,
    ...(CHARACTER_SPECIAL_POSES[character] || []),
  ];
  requireVariant(availablePoses, pose, 'Figurenpose');
  return new URL(`characters/${entry.folder}/${pose}.webp`, LIBRARY_ROOT).href;
}

export function worldAsset(world = 'neustart', state = 'intact') {
  const entry = requireEntry(WORLDS, world, 'Welt');
  requireVariant(WORLD_STATES, state, 'Weltzustand');
  return new URL(`worlds/${entry.folder}/${state}.webp`, LIBRARY_ROOT).href;
}
