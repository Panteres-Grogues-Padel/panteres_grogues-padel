export function getDiaSemanaActual() {
  const today = new Date().getDay();
  return today === 0 ? 6 : today - 1;
}

export function isSlotOpen(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual();
  const diff = (slot.diaSemana - diaActual + 7) % 7;
  if (diff === 0) return true;
  if (diaActual > slot.diaSemana) return true;
  if (diaActual === slot.diaSemana && ahora.getHours() >= 19) return true;
  return false;
}

export function isBajaWarning(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual();
  return diaActual === slot.diaSemana && ahora.getHours() >= 7;
}
