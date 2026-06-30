import * as XLSX from "xlsx";
import { hoyLocalStr } from "./dates";

const COLUMNAS = ["Player", "Resultat"];

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
  const sheetRows = rowsFromRpc(rows).map((row) => ({
    Player: row?.jugador == null ? "" : String(row.jugador),
    Resultat: formatResultat(row)
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: COLUMNAS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultats");
  XLSX.writeFile(workbook, nombreArchivo);
}
