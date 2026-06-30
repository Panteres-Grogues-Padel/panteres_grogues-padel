import "./admin.css";
import { useEffect, useMemo, useState } from "react";
import { useAdminJugadores } from "../../hooks/useAdmin";
import {
  cuotaPagada,
  estadoJugador,
  etiquetaPeriodoTrimestral,
  fechasCuotaDesdePeriodo,
  fechasCuotaDisplay,
  filtrarJugadoresBusqueda,
  formatCuotaFecha,
  formatRangoCuota,
  nombreAdminJugador,
  periodoTrimestralActual,
  periodosTrimestralesHistorial
} from "../../utils/adminJugador";
import {
  buildFechaNacimiento,
  DIAS_NACIMIENTO,
  MESES_NACIMIENTO,
  parseFechaNacimientoDm
} from "../../utils/fechaNacimientoDm";
import { t } from "../../i18n";

const ESTADO_LABEL = {
  actiu: "admin.status.active",
  inactiu: "admin.status.inactive",
  sancionat: "admin.status.sanctioned",
  pendent: "admin.status.pending"
};

const ESTADO_CLASS = {
  actiu: "admin-badge--actiu",
  inactiu: "admin-badge--inactiu",
  sancionat: "admin-badge--sancionat",
  pendent: "admin-badge--pendent"
};

function EstadoBadge({ jugador }) {
  const estado = estadoJugador(jugador);
  return <span className={`admin-badge ${ESTADO_CLASS[estado]}`}>{t(ESTADO_LABEL[estado])}</span>;
}

const PRONOMBRES = ["Ell", "Ella", "Elle", "Altre", "Prefereixo no dir-ho"];

function metaLineaJugador(j) {
  const parts = [j.email].filter(Boolean);
  if (j.numero_socio) parts.push(`#${j.numero_socio}`);
  const contact = (j.email_contacto ?? "").trim();
  const main = (j.email ?? "").trim();
  if (contact && contact.toLowerCase() !== main.toLowerCase()) {
    parts.push(contact);
  }
  return parts.join(" · ");
}

function EditJugadorModal({ jugador, open, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    pronombre: "",
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    birth_day: "",
    birth_month: "",
    nickname: "",
    email: "",
    numero_socio: "",
    id_app_antigua: "",
    email_contacto: "",
    telefono: ""
  });

  useEffect(() => {
    if (!jugador || !open) return;
    const { dia, mes } = parseFechaNacimientoDm(jugador.fecha_nacimiento);
    setForm({
      pronombre: jugador.pronombre ?? "",
      nombre: jugador.nombre ?? "",
      primer_apellido: jugador.primer_apellido ?? "",
      segundo_apellido: jugador.segundo_apellido ?? "",
      birth_day: dia,
      birth_month: mes,
      nickname: jugador.nickname ?? "",
      email: jugador.email ?? "",
      numero_socio: jugador.numero_socio ?? "",
      id_app_antigua: jugador.id_app_antigua ?? "",
      email_contacto: jugador.email_contacto ?? "",
      telefono: jugador.telefono ?? ""
    });
  }, [jugador, open]);

  if (!open || !jugador) return null;

  return (
    <div
      className="admin-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal">
        <h3 className="admin-modal-title">{t("admin.editPlayer")}</h3>
        <p className="admin-modal-sub">{nombreAdminJugador(jugador)}</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>{t("auth.onboarding.pronoun")}</span>
            <select
              value={form.pronombre}
              onChange={(e) => setForm((prev) => ({ ...prev, pronombre: e.target.value }))}
            >
              <option value="">{t("common.selectPlaceholder")}</option>
              {PRONOMBRES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {[
            ["nombre", t("admin.fields.name")],
            ["primer_apellido", t("admin.fields.firstSurname")],
            ["segundo_apellido", t("admin.fields.secondSurname")]
          ].map(([key, label]) => (
            <label key={key} className="admin-field">
              <span>{label}</span>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="admin-field admin-field--span2">
            <span>{t("auth.onboarding.birthDate")}</span>
            <div className="admin-birth-row">
              <select
                aria-label={t("auth.onboarding.birthDay")}
                value={form.birth_day}
                onChange={(e) => setForm((prev) => ({ ...prev, birth_day: e.target.value }))}
              >
                <option value="">{t("auth.onboarding.birthDay")}</option>
                {DIAS_NACIMIENTO.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("auth.onboarding.birthMonth")}
                value={form.birth_month}
                onChange={(e) => setForm((prev) => ({ ...prev, birth_month: e.target.value }))}
              >
                <option value="">{t("auth.onboarding.birthMonth")}</option>
                {MESES_NACIMIENTO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          {[
            ["nickname", t("admin.fields.nickname")],
            ["email", t("common.email")],
            ["numero_socio", t("admin.fields.memberNumber")],
            ["id_app_antigua", t("admin.fields.legacyId")],
            ["email_contacto", t("auth.onboarding.contactEmail")],
            ["telefono", t("auth.onboarding.contactPhone")]
          ].map(([key, label]) => (
            <label key={key} className="admin-field">
              <span>{label}</span>
              <input
                type={
                  key === "email" || key === "email_contacto"
                    ? "email"
                    : key === "telefono"
                      ? "tel"
                      : "text"
                }
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn btn-sm" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => void onSave(form)}
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function JugadorRowActions({ jugador, onEdit, onToggleActivo, busy }) {
  const estado = estadoJugador(jugador);
  const puedeActivar = !jugador.activo;
  const puedeDesactivar = jugador.activo;

  return (
    <div className="admin-row-actions">
      <button type="button" className="btn btn-sm admin-btn" onClick={() => onEdit(jugador)} disabled={busy}>
        {t("admin.actions.edit")}
      </button>
      {puedeActivar ? (
        <button
          type="button"
          className="btn btn-sm admin-btn admin-btn--primary"
          onClick={() => onToggleActivo(jugador, true)}
          disabled={busy}
        >
          {estado === "pendent" ? t("admin.actions.approve") : t("admin.actions.activate")}
        </button>
      ) : null}
      {puedeDesactivar ? (
        <button
          type="button"
          className="btn btn-sm admin-btn admin-btn--danger"
          onClick={() => onToggleActivo(jugador, false)}
          disabled={busy}
        >
          {t("admin.actions.deactivate")}
        </button>
      ) : null}
    </div>
  );
}

function JugadorsSection({ jugadores, onEdit, onToggleActivo, busyId }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all");

  const listado = useMemo(() => {
    let rows = filtrarJugadoresBusqueda(jugadores, busqueda);
    if (filtroEstado !== "all") {
      rows = rows.filter((j) => estadoJugador(j) === filtroEstado);
    }
    return rows.sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca"));
  }, [jugadores, busqueda, filtroEstado]);

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder={t("admin.searchPlaceholder")}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="admin-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="all">{t("admin.filterAll")}</option>
          <option value="actiu">{t(ESTADO_LABEL.actiu)}</option>
          <option value="inactiu">{t(ESTADO_LABEL.inactiu)}</option>
          <option value="sancionat">{t(ESTADO_LABEL.sancionat)}</option>
          <option value="pendent">{t(ESTADO_LABEL.pendent)}</option>
        </select>
      </div>
      <div className="admin-list">
        {listado.length === 0 ? <p className="admin-empty">{t("admin.noPlayers")}</p> : null}
        {listado.map((j) => (
          <div key={j.id} className="admin-card">
            <div className="admin-card-main">
              <div className="admin-card-name">{nombreAdminJugador(j)}</div>
              <div className="admin-card-meta">{metaLineaJugador(j)}</div>
              <EstadoBadge jugador={j} />
            </div>
            <JugadorRowActions
              jugador={j}
              onEdit={onEdit}
              onToggleActivo={onToggleActivo}
              busy={busyId === j.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CoordinadorsSection({ jugadores, onToggleCoord, busyId }) {
  const coordinadores = useMemo(
    () =>
      jugadores
        .filter((j) => j.es_coordinador)
        .sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca")),
    [jugadores]
  );

  const noCoords = useMemo(
    () =>
      jugadores
        .filter((j) => !j.es_coordinador && j.activo)
        .sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca")),
    [jugadores]
  );

  return (
    <div className="admin-section">
      <h3 className="admin-subtitle">{t("admin.coords.current")}</h3>
      <div className="admin-list">
        {coordinadores.length === 0 ? <p className="admin-empty">{t("admin.coords.none")}</p> : null}
        {coordinadores.map((j) => (
          <div key={j.id} className="admin-card">
            <div className="admin-card-main">
              <div className="admin-card-name">{nombreAdminJugador(j)}</div>
              <div className="admin-card-meta">{j.email}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm admin-btn admin-btn--danger"
              disabled={busyId === j.id}
              onClick={() => onToggleCoord(j, false)}
            >
              {t("admin.coords.remove")}
            </button>
          </div>
        ))}
      </div>

      <h3 className="admin-subtitle">{t("admin.coords.add")}</h3>
      <div className="admin-list">
        {noCoords.slice(0, 40).map((j) => (
          <div key={j.id} className="admin-card">
            <div className="admin-card-main">
              <div className="admin-card-name">{nombreAdminJugador(j)}</div>
              <div className="admin-card-meta">{j.email}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm admin-btn admin-btn--primary"
              disabled={busyId === j.id}
              onClick={() => onToggleCoord(j, true)}
            >
              {t("admin.coords.assign")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CuotaJugadorDetalle({
  jugador,
  fetchCuotas,
  marcarCuotaPagada,
  desmarcarCuotaPagada,
  onBack,
  onMessage
}) {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPeriodo, setBusyPeriodo] = useState(null);
  const periodoActual = periodoTrimestralActual();

  const periodos = useMemo(() => periodosTrimestralesHistorial(cuotas), [cuotas]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetchCuotas(jugador.id);
      if (cancelled) return;
      setCuotas(res.ok ? res.cuotas : []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jugador.id, fetchCuotas]);

  async function refresh() {
    const res = await fetchCuotas(jugador.id);
    if (res.ok) setCuotas(res.cuotas);
    return res;
  }

  async function handleMarcar(periodo) {
    setBusyPeriodo(periodo);
    const fechas = fechasCuotaDesdePeriodo("trimestral", periodo);
    const res = await marcarCuotaPagada(jugador.id, "trimestral", periodo, fechas);
    setBusyPeriodo(null);
    if (!res.ok) {
      onMessage(res.error);
      return;
    }
    await refresh();
    onMessage(t("admin.cuotas.markedOk"));
  }

  async function handleDesmarcar(periodo) {
    setBusyPeriodo(periodo);
    const res = await desmarcarCuotaPagada(jugador.id, "trimestral", periodo);
    setBusyPeriodo(null);
    if (!res.ok) {
      onMessage(res.error);
      return;
    }
    await refresh();
    onMessage(t("admin.cuotas.unmarkedOk"));
  }

  return (
    <div className="admin-section">
      <button type="button" className="admin-cuota-back" onClick={onBack}>
        {t("admin.cuotas.back")}
      </button>
      <div className="admin-cuota-detail-header">
        <h3 className="admin-subtitle admin-subtitle--flush">{nombreAdminJugador(jugador)}</h3>
        <p className="admin-card-meta">
          {jugador.numero_socio ? `#${jugador.numero_socio}` : jugador.email}
        </p>
      </div>
      <p className="admin-hint">{t("admin.cuotas.historyHint")}</p>
      {loading ? <p className="admin-empty">{t("common.loading")}</p> : null}
      {!loading ? (
        <div className="admin-list">
          {periodos.map((periodo) => {
            const pagada = cuotaPagada(cuotas, "trimestral", periodo);
            const fechas = fechasCuotaDisplay(cuotas, "trimestral", periodo);
            const row = cuotas.find((c) => c.tipo === "trimestral" && c.periodo === periodo);
            const busy = busyPeriodo === periodo;
            const esActual = periodo === periodoActual;

            return (
              <div key={periodo} className="admin-card admin-card--cuota-row">
                <div className="admin-card-main">
                  <div className="admin-card-name">
                    {etiquetaPeriodoTrimestral(periodo)}
                    {esActual ? (
                      <span className="admin-cuota-current">{t("admin.cuotas.current")}</span>
                    ) : null}
                  </div>
                  <span className="admin-cuota-dates">{formatRangoCuota(fechas)}</span>
                  <span className={`admin-cuota-state ${pagada ? "paid" : "pending"}`}>
                    {pagada ? t("admin.cuotas.paid") : t("admin.cuotas.pending")}
                  </span>
                  {pagada && row?.fecha_pago ? (
                    <span className="admin-cuota-paid-date">
                      {t("admin.cuotas.paidOn", { date: formatCuotaFecha(row.fecha_pago) })}
                    </span>
                  ) : null}
                </div>
                <div className="admin-row-actions">
                  {pagada ? (
                    <button
                      type="button"
                      className="btn btn-sm admin-btn admin-btn--danger"
                      disabled={busy}
                      onClick={() => void handleDesmarcar(periodo)}
                    >
                      {t("admin.cuotas.markUnpaid")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm admin-btn admin-btn--primary"
                      disabled={busy}
                      onClick={() => void handleMarcar(periodo)}
                    >
                      {t("admin.cuotas.markPaid")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CuotesSection({ jugadores, fetchCuotas, marcarCuotaPagada, desmarcarCuotaPagada, onMessage }) {
  const [selectedJugador, setSelectedJugador] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const activos = useMemo(
    () =>
      filtrarJugadoresBusqueda(
        jugadores.filter((j) => j.activo),
        busqueda
      ).sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca")),
    [jugadores, busqueda]
  );

  if (selectedJugador) {
    return (
      <CuotaJugadorDetalle
        jugador={selectedJugador}
        fetchCuotas={fetchCuotas}
        marcarCuotaPagada={marcarCuotaPagada}
        desmarcarCuotaPagada={desmarcarCuotaPagada}
        onBack={() => setSelectedJugador(null)}
        onMessage={onMessage}
      />
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder={t("admin.searchPlaceholder")}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      <p className="admin-hint">{t("admin.cuotas.listHint")}</p>
      <div className="admin-list">
        {activos.length === 0 ? <p className="admin-empty">{t("admin.noPlayers")}</p> : null}
        {activos.map((j) => (
          <button
            key={j.id}
            type="button"
            className="admin-card admin-card--clickable"
            onClick={() => setSelectedJugador(j)}
          >
            <div className="admin-card-main">
              <div className="admin-card-name">{nombreAdminJugador(j)}</div>
              <div className="admin-card-meta">
                {j.numero_socio ? `#${j.numero_socio}` : j.email}
              </div>
            </div>
            <span className="admin-cuota-chevron" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PendentsSection({ jugadores, onToggleActivo, busyId }) {
  const pendents = useMemo(
    () =>
      jugadores
        .filter((j) => !j.activo && !j.sancionat)
        .sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca")),
    [jugadores]
  );

  return (
    <div className="admin-section">
      <p className="admin-hint">{t("admin.pending.hint")}</p>
      <div className="admin-list">
        {pendents.length === 0 ? <p className="admin-empty">{t("admin.pending.none")}</p> : null}
        {pendents.map((j) => (
          <div key={j.id} className="admin-card">
            <div className="admin-card-main">
              <div className="admin-card-name">{nombreAdminJugador(j)}</div>
              <div className="admin-card-meta">{j.email}</div>
              <EstadoBadge jugador={j} />
            </div>
            <button
              type="button"
              className="btn btn-sm admin-btn admin-btn--primary"
              disabled={busyId === j.id}
              onClick={() => onToggleActivo(j, true)}
            >
              {t("admin.actions.approve")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin({ isSuperAdmin, onMessage }) {
  const enabled = isSuperAdmin;
  const { jugadores, loading, error, editarJugador, fetchCuotas, marcarCuotaPagada, desmarcarCuotaPagada, reload } =
    useAdminJugadores(true);

  const sections = useMemo(() => {
    const all = [
      { id: "jugadors", labelKey: "admin.tabs.players", superOnly: true },
      { id: "coordinadors", labelKey: "admin.tabs.coords", superOnly: true },
      { id: "cuotes", labelKey: "admin.tabs.fees", superOnly: false },
      { id: "pendents", labelKey: "admin.tabs.pending", superOnly: true }
    ];
    return all.filter((s) => !s.superOnly || isSuperAdmin);
  }, [isSuperAdmin]);

  const [section, setSection] = useState(() => (isSuperAdmin ? "jugadors" : "cuotes"));
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!sections.some((s) => s.id === section)) {
      setSection(sections[0]?.id ?? "cuotes");
    }
  }, [sections, section]);

  async function handleSaveEdit(form) {
    if (!editTarget) return;
    setSaving(true);
    const { birth_day, birth_month, ...rest } = form;
    const payload = { ...rest };
    if (birth_day && birth_month) {
      payload.fecha_nacimiento = buildFechaNacimiento(birth_day, birth_month) || "";
    } else if (!birth_day && !birth_month) {
      payload.fecha_nacimiento = "";
    }
    const res = await editarJugador(editTarget.id, payload);
    setSaving(false);
    if (!res.ok) {
      onMessage?.(res.error);
      return;
    }
    onMessage?.(t("admin.savedOk"));
    setEditTarget(null);
  }

  async function handleToggleActivo(jugador, activo) {
    setBusyId(jugador.id);
    const res = await editarJugador(jugador.id, { activo });
    setBusyId(null);
    if (!res.ok) {
      onMessage?.(res.error);
      return;
    }
    onMessage?.(activo ? t("admin.activatedOk") : t("admin.deactivatedOk"));
  }

  async function handleToggleCoord(jugador, esCoordinador) {
    setBusyId(jugador.id);
    const res = await editarJugador(jugador.id, { es_coordinador: esCoordinador });
    setBusyId(null);
    if (!res.ok) {
      onMessage?.(res.error);
      return;
    }
    onMessage?.(esCoordinador ? t("admin.coordAssignedOk") : t("admin.coordRemovedOk"));
  }

  return (
    <div className="admin-panel">
      <h2 className="admin-title">{t("admin.title")}</h2>
      {!isSuperAdmin ? <p className="admin-hint">{t("admin.treasurerHint")}</p> : null}

      <div className="admin-tabs">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-tab ${section === s.id ? "active" : ""}`}
            onClick={() => setSection(s.id)}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      {loading ? <p className="admin-empty">{t("common.loading")}</p> : null}
      {error ? <p className="admin-error">{error}</p> : null}

      {!loading && !error && section === "jugadors" && isSuperAdmin ? (
        <JugadorsSection
          jugadores={jugadores}
          onEdit={setEditTarget}
          onToggleActivo={handleToggleActivo}
          busyId={busyId}
        />
      ) : null}

      {!loading && !error && section === "coordinadors" && isSuperAdmin ? (
        <CoordinadorsSection jugadores={jugadores} onToggleCoord={handleToggleCoord} busyId={busyId} />
      ) : null}

      {!loading && !error && section === "cuotes" ? (
        <CuotesSection
          jugadores={jugadores}
          fetchCuotas={fetchCuotas}
          marcarCuotaPagada={marcarCuotaPagada}
          desmarcarCuotaPagada={desmarcarCuotaPagada}
          onMessage={onMessage}
        />
      ) : null}

      {!loading && !error && section === "pendents" && isSuperAdmin ? (
        <PendentsSection jugadores={jugadores} onToggleActivo={handleToggleActivo} busyId={busyId} />
      ) : null}

      <EditJugadorModal
        jugador={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />

      {isSuperAdmin ? (
        <button type="button" className="btn btn-sm admin-refresh" onClick={() => void reload()}>
          {t("admin.refresh")}
        </button>
      ) : null}
    </div>
  );
}
