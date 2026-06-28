export const COMPONENTES = [
  {
    id: 'comp1',
    nombre: 'Toma Unidas por la libertad y la seguridad de las mujeres afro usmeñas',
    formId: 'dWpb5q',
    grupos: [
      'Grupo 1 — Salud mental y Comadreos',
      'Grupo 2 — Música y Cocina tradicional',
      'Grupo 3 — Afirmación Corporal y medicina',
      'Grupo 4 — Juegos Ancestrales y Feria',
    ],
  },
  {
    id: 'comp2',
    nombre: 'Círculos de la palabra: tejiendo los derechos de las mujeres indígenas',
    formId: '689DXB',
    grupos: [
      'Grupo 1 — Pueblo Kaméntsá Biyá',
      'Grupo 2 — Pijao',
      'Grupo 3 — Inga',
      'Grupo 4 — Nasa',
      'Grupo 5 — Andoque',
      'Grupo 6 — Pastos',
      'Grupo 7 — Grupo A',
    ],
  },
  {
    id: 'comp3',
    nombre: 'Por la no violencia y la vida de las mujeres campesinas y rurales',
    formId: 'RGgWXJ',
    grupos: [
      'Grupo 1 — Los Soches',
      'Grupo 2 — El Uval',
      'Grupo 3 — Uval Bajo - Requilina',
      'Grupo 4 — Chiguaza',
      'Grupo 5 — Olarte - Destino',
      'Grupo 6 — Las Margaritas',
      'Grupo 7 — Arrayanes - El Tesoro',
    ],
  },
  {
    id: 'comp5',
    nombre: 'Escuela popular de artes, oficios y derechos humanos',
    formId: 'PdgpdQ',
    grupos: [
      'Grupo 1 — Salón Comunal Monteblanco — Lunes y Miércoles — 8:00 a 10:00 a.m.',
      'Grupo 2 — Salón Comunal Monteblanco — Lunes y Miércoles — 10:00 a.m. a 12:00 m.',
      'Grupo 3 — Salón Comunal Monteblanco — Lunes y Miércoles — 1:00 a 3:00 p.m.',
      'Grupo 4 — Salón Comunal Monteblanco — Lunes y Miércoles — 3:00 a 5:00 p.m.',
      'Grupo 5 — CDC El Virrey — Martes y Jueves — 8:00 a 10:00 a.m.',
      'Grupo 6 — CDC El Virrey — Martes y Jueves — 10:00 a.m. a 12:00 m.',
      'Grupo 9 — Salón Comunal Almirante Padilla — Viernes y Sábados — 8:00 a 10:00 a.m.',
      'Grupo 10 — Salón Comunal Almirante Padilla — Viernes y Sábados — 10:00 a.m. a 12:00 m.',
      'Grupo 11 — Virtual',
      'Grupo 12 — Auditorio 1',
      'Grupo 13 — Auditorio 2',
      'Grupo 14 — Auditorio 3',
      'Grupo 15 — Auditorio 4',
      'Grupo 16 — Domo 1',
      'Grupo 17 — Domo 2',
    ],
  },
];

export const CLASES = Array.from({ length: 50 }, (_, i) => `Clase ${i + 1}`);

export type Componente = (typeof COMPONENTES)[number];
