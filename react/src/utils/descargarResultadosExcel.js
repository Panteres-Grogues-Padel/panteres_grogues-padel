import * as XLSX from "xlsx";
import { hoyLocalStr } from "./dates";

const COLUMNAS = [
  ["fecha", "Data"],
  ["pista", "Pista"],
  ["jugador_1", "Jugador 1"],
  ["jugador_2", "Jugador 2"],
  ["jugador_3", "Jugador 3"],
  ["jugador_4", "Jugador 4"],
  ["set1", "Set 1"],
  ["set2", "Set 2"],
  ["set3", "Set 3"],
  ["introducido_por", "Introduït per"],
  ["validado_por", "Validat per"],
  ["validado_el", "Validat el"]
];

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

export function descargarResultadosHistoricoExcel(rows, fechaDescarga = hoyLocalStr()) {
  const sheetRows = rowsFromRpc(rows).map((row) => {
    const out = {};
    for (const [key, header] of COLUMNAS) {
      out[header] = row?.[key] ?? "";
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultats");
  XLSX.writeFile(workbook, `resultats_panteres_${fechaDescarga}.xlsx`);
}
