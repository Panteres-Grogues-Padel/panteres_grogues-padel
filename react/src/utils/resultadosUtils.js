import { ayerLocalStr, enVentanaCoordResultados, hoyLocalStr } from "./dates";
import { getNombre } from "./nombres";

const ROTACIONES_POS = [
  { izq: [1, 4], der: [2, 3] },
  { izq: [1, 3], der: [2, 4] },
  { izq: [1, 2], der: [3, 4] }
];

function nombrePorPosicion(jugadores, pos) {
  const j = jugadores.find((x) => Number(x.posicion) === pos);
  return getNombre(j) || `P${pos}`;
}

/** Etiquetas de parejas por set (americano). */
export function getRotacionesAmericano(jugadores) {
  const ordenados = [...(jugadores ?? [])].sort((a, b) => a.posicion - b.posicion);
  return ROTACIONES_POS.map((r, i) => {
    const izqN = r.izq.map((p) => nombrePorPosicion(ordenados, p));
    const derN = r.der.map((p) => nombrePorPosicion(ordenados, p));
    return {
      setIndex: i,
      label: `${izqN[0]}+${izqN[1]} vs ${derN[0]}+${derN[1]}`
    };
  });
}

export function getEstadoResultado(resultado) {
  if (!resultado) return "sin";
  if (resultado.validado_por) return "validado";
  return "pendiente";
}

const ESTADO_LABEL = {
  sin: "Sin resultado",
  pendiente: "Pendiente de validación",
  validado: "Validado"
};

export function getEstadoLabel(estado) {
  return ESTADO_LABEL[estado] ?? "";
}

export function getPermisosResultado({ partido, resultado, currentUser, isCoord, now = new Date() }) {
  const fecha = partido?.fechaPartido;
  const hoy = hoyLocalStr(now);
  const ayer = ayerLocalStr(now);
  const jugo = partido?.jugadores?.some((j) => String(j.jugadorId) === String(currentUser?.id));
  const estado = getEstadoResultado(resultado);

  if (isCoord) {
    const enVentana = enVentanaCoordResultados(fecha, now);
    const validado = estado === "validado";
    return {
      estado,
      puedeVer: enVentana,
      puedeEditar: enVentana && !validado,
      puedeGuardar: enVentana && !validado,
      puedeModificar: enVentana && validado,
      puedeValidar: enVentana && Boolean(resultado) && estado === "pendiente"
    };
  }

  const puedeIntroducir = jugo && (fecha === hoy || fecha === ayer) && !resultado;

  return {
    estado,
    puedeVer: true,
    puedeEditar: puedeIntroducir,
    puedeGuardar: puedeIntroducir,
    puedeModificar: false,
    puedeValidar: false
  };
}
