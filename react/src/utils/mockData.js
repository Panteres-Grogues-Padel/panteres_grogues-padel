export const COORDS = ["JoseGB", "SergiIbso", "Jordi_V"];

export const JUGADORES_INICIALES = [
  { id: 1, nombre: "JoseGB", nombreCompleto: "Jose Garcia Blanco", ig: "@josegb_padel", tel: "+34 612 345 678", pj: 30, pg: 29, jj: 180, jg: 177, mostrarTel: true, autorizaIG: true },
  { id: 2, nombre: "AndresA", nombreCompleto: "Andres Alonso", ig: "@andres_padel", tel: "+34 623 456 789", pj: 15, pg: 14, jj: 92, jg: 89, mostrarTel: true, autorizaIG: true },
  { id: 3, nombre: "JoanMR", nombreCompleto: "Joan Marti Roca", ig: "@joanmr", tel: "+34 634 567 890", pj: 9, pg: 8, jj: 56, jg: 54, mostrarTel: false, autorizaIG: true },
  { id: 4, nombre: "MigueB", nombreCompleto: "Miguel Bosch", ig: "@migue.padel", tel: "+34 645 678 901", pj: 48, pg: 40, jj: 294, jg: 270, mostrarTel: true, autorizaIG: false },
  { id: 5, nombre: "ZoaH", nombreCompleto: "Zoa Hernandez", ig: "@zoah_padel", tel: "+34 656 789 012", pj: 21, pg: 16, jj: 128, jg: 112, mostrarTel: false, autorizaIG: false },
  { id: 6, nombre: "OscarVazquez", nombreCompleto: "Oscar Vazquez", ig: "@oscarvaz", tel: "+34 667 890 123", pj: 12, pg: 9, jj: 73, jg: 63, mostrarTel: true, autorizaIG: true },
  { id: 7, nombre: "Jordi_V", nombreCompleto: "Jordi Vilar", ig: "@jordi_vilar", tel: "+34 678 901 234", pj: 111, pg: 81, jj: 678, jg: 600, mostrarTel: true, autorizaIG: true },
  { id: 8, nombre: "Guille", nombreCompleto: "Guillermo Puig", ig: "@guillepadel", tel: "+34 689 012 345", pj: 6, pg: 6, jj: 36, jg: 36, mostrarTel: false, autorizaIG: true },
  { id: 9, nombre: "PacoCh", nombreCompleto: "Paco Checa", ig: "@pacocheca", tel: "+34 690 123 456", pj: 30, pg: 22, jj: 183, jg: 155, mostrarTel: true, autorizaIG: false },
  { id: 10, nombre: "Fresco", nombreCompleto: "Alberto Fresco", ig: "@frescopadel", tel: "+34 601 234 567", pj: 21, pg: 15, jj: 128, jg: 106, mostrarTel: true, autorizaIG: true },
  { id: 11, nombre: "David_L", nombreCompleto: "David Llopis", ig: "@davidl_padel", tel: "+34 612 345 000", pj: 12, pg: 9, jj: 73, jg: 61, mostrarTel: false, autorizaIG: false },
  { id: 12, nombre: "SergiIbso", nombreCompleto: "Sergi Ibso", ig: "@sergiibso", tel: "+34 623 456 111", pj: 134, pg: 91, jj: 826, jg: 700, mostrarTel: true, autorizaIG: true },
  { id: 13, nombre: "RobertoL", nombreCompleto: "Roberto Lopez", ig: "@robertol", tel: "+34 634 567 222", pj: 15, pg: 10, jj: 94, jg: 76, mostrarTel: true, autorizaIG: true },
  { id: 14, nombre: "Javi_C", nombreCompleto: "Javier Cortes", ig: "@javicortes", tel: "+34 645 678 333", pj: 99, pg: 64, jj: 601, jg: 477, mostrarTel: false, autorizaIG: true }
];

export const SLOTS_INICIALES = [
  { id: "lun-up", label: "Lunes", club: "Club Up", diaSemana: 0, pistas: 3, jugadores: ["JoseGB", "MigueB", "ZoaH"] },
  { id: "lun-del", label: "Lunes", club: "Club Delfos", diaSemana: 0, pistas: 2, jugadores: ["AndresA"] },
  { id: "mar-up", label: "Martes", club: "Club Up", diaSemana: 1, pistas: 2, jugadores: [] },
  { id: "mar-del", label: "Martes", club: "Club Delfos", diaSemana: 1, pistas: 2, jugadores: [] },
  { id: "mie-man", label: "Miércoles", club: "Mañana", diaSemana: 2, pistas: 1, jugadores: [] },
  { id: "mie-up", label: "Miércoles", club: "Club Up", diaSemana: 2, pistas: 5, jugadores: ["SergiIbso", "Jordi_V", "Fresco", "PacoCh"] },
  { id: "mie-del", label: "Miércoles", club: "Club Delfos", diaSemana: 2, pistas: 0, jugadores: [] },
  { id: "jue-up", label: "Jueves", club: "Club Up", diaSemana: 3, pistas: 1, jugadores: [] },
  { id: "jue-del", label: "Jueves", club: "Club Delfos", diaSemana: 3, pistas: 2, jugadores: [] },
  { id: "vie-up", label: "Viernes", club: "Club Up", diaSemana: 4, pistas: 7, jugadores: ["Javi_C", "RobertoL", "Guille", "David_L"] },
  { id: "vie-del", label: "Viernes", club: "Club Delfos", diaSemana: 4, pistas: 1, jugadores: [] },
  { id: "dom", label: "Domingo", club: "Americana", diaSemana: 6, pistas: 0, jugadores: [] }
];

export const PARTIDOS_INICIALES = [
  {
    id: 1,
    fecha: "2026-04-20",
    dia: "Lunes",
    jugadores: ["JoseGB", "MigueB", "SergiIbso", "Jordi_V"],
    sets: [{ p1: 6, p2: 3 }, { p1: 4, p2: 6 }, { p1: 6, p2: 4 }],
    introducidoPor: "JoseGB",
    validadoPor: "MigueB"
  }
];

export const EVENTOS_INICIALES = [
  { id: 1, fecha: "2026-05-24", titulo: "Paella de fin de temporada", tipo: "social", desc: "Comida de la seccion", precio: 20, inscritos: [], pagos: [] },
  { id: 2, fecha: "2026-06-06", titulo: "Torneo verano", tipo: "torneo", desc: "Formato por definir", precio: 0, inscritos: [], pagos: [] }
];
