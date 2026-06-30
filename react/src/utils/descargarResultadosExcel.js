import * as XLSX from "xlsx";
import { hoyLocalStr } from "./dates";

const COLUMNAS = [
  ["fecha", "Data"],
  ["pista", "Pista"],
  ["jugador", "Jugador"],
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

export function descargarResultadosHistoricoExcel(rows, nombreArchivo = `resultats_panteres_${hoyLocalStr()}.xlsx`) {
  const sheetRows = rowsFromRpc(rows).map((row) => {
    const out = {};
    for (const [key, header] of COLUMNAS) {
      const value = row?.[key];
      out[header] = value == null ? "" : String(value);
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: COLUMNAS.map(([, header]) => header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultats");
  XLSX.writeFile(workbook, nombreArchivo);
}
