import { DATE_LOCALE } from "./dates";

export const FECHA_NACIMIENTO_ANYO_FIJO = 2000;

export const DIAS_NACIMIENTO = Array.from({ length: 31 }, (_, i) => String(i + 1));

export const MESES_NACIMIENTO = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1);
  const label = new Date(FECHA_NACIMIENTO_ANYO_FIJO, i, 1).toLocaleDateString(DATE_LOCALE, {
    month: "long"
  });
  return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

export function buildFechaNacimiento(dia, mes) {
  const d = Number(dia);
  const m = Number(mes);
  if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12) {
    return "";
  }
  const candidate = new Date(FECHA_NACIMIENTO_ANYO_FIJO, m - 1, d);
  if (candidate.getMonth() !== m - 1 || candidate.getDate() !== d) return "";
  return `${FECHA_NACIMIENTO_ANYO_FIJO}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseFechaNacimientoDm(value) {
  const raw = String(value ?? "").slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { dia: "", mes: "" };
  return { dia: String(Number(m[3])), mes: String(Number(m[2])) };
}

export function formatFechaNacimientoDmLabel(value) {
  const { dia, mes } = parseFechaNacimientoDm(value);
  if (!dia || !mes) return "";
  const mesLabel = MESES_NACIMIENTO.find((x) => x.value === mes)?.label ?? mes;
  return `${dia} ${mesLabel}`;
}
