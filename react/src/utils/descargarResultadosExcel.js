import * as XLSX from "xlsx";
import { hoyLocalStr } from "./dates";

const COLUMNAS = [
  ["fecha", "Data"],
  ["pista", "Pista"],
  ["jugador", "Jugador"],
  ["resultat", "Resultat"],
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

function formatResultat(row) {
  return [row?.set1, row?.set2, row?.set3]
    .filter((set) => set != null && String(set).trim() !== "")
    .map((set) => String(set).trim())
    .join(" ");
}

export function descargarResultadosHistoricoExcel(rows, nombreArchivo = `resultats_panteres_${hoyLocalStr()}.xlsx`) {
  const sheetRows = rowsFromRpc(rows).map((row) => {
    const out = {};
    for (const [key, header] of COLUMNAS) {
      if (key === "resultat") {
        out[header] = formatResultat(row);
      } else {
        const value = row?.[key];
        out[header] = value == null ? "" : String(value);
      }
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: COLUMNAS.map(([, header]) => header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultats");
  XLSX.writeFile(workbook, nombreArchivo);
}
