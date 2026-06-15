import "./admin.css";
import { useEffect, useMemo, useState } from "react";
import { useAdminJugadores } from "../../hooks/useAdmin";
import {
  cuotaPagada,
  estadoJugador,
  fechasCuotaDesdePeriodo,
  fechasCuotaDisplay,
  filtrarJugadoresBusqueda,
  formatRangoCuota,
  nombreAdminJugador,
  periodoAnualActual,
  periodoTrimestralActual
} from "../../utils/adminJugador";
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

function EditJugadorModal({ jugador, open, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    nickname: "",
    email: "",
    numero_socio: "",
    id_app_antigua: ""
  });

  useEffect(() => {
    if (!jugador || !open) return;
    setForm({
      nombre: jugador.nombre ?? "",
      primer_apellido: jugador.primer_apellido ?? "",
      segundo_apellido: jugador.segundo_apellido ?? "",
      nickname: jugador.nickname ?? "",
      email: jugador.email ?? "",
      numero_socio: jugador.numero_socio ?? "",
      id_app_antigua: jugador.id_app_antigua ?? ""
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
          {[
            ["nombre", t("admin.fields.name")],
            ["primer_apellido", t("admin.fields.firstSurname")],
            ["segundo_apellido", t("admin.fields.secondSurname")],
            ["nickname", t("admin.fields.nickname")],
            ["email", t("common.email")],
            ["numero_socio", t("admin.fields.memberNumber")],
            ["id_app_antigua", t("admin.fields.legacyId")]
          ].map(([key, label]) => (
            <label key={key} className="admin-field">
              <span>{label}</span>
              <input
                type={key === "email" ? "email" : "text"}
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
              <div className="admin-card-meta">
                {j.email}
                {j.numero_socio ? ` · #${j.numero_socio}` : ""}
              </div>
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

function CuotesSection({ jugadores, fetchCuotas, marcarCuotaPagada, onMessage }) {
  const periodoAnual = periodoAnualActual();
  const periodoTrim = periodoTrimestralActual();
  const [cuotasMap, setCuotasMap] = useState({});
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const activos = useMemo(
    () =>
      filtrarJugadoresBusqueda(
        jugadores.filter((j) => j.activo),
        busqueda
      ).sort((a, b) => nombreAdminJugador(a).localeCompare(nombreAdminJugador(b), "ca")),
    [jugadores, busqueda]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoadingCuotas(true);
      const entries = await Promise.all(
        activos.map(async (j) => {
          const res = await fetchCuotas(j.id);
          return [j.id, res.ok ? res.cuotas : []];
        })
      );
      if (cancelled) return;
      setCuotasMap(Object.fromEntries(entries));
      setLoadingCuotas(false);
    }

    if (activos.length) void loadAll();
    else {
      setCuotasMap({});
      setLoadingCuotas(false);
    }

    return () => {
      cancelled = true;
    };
  }, [activos, fetchCuotas]);

  async function handleMarcar(jugador, tipo, periodo) {
    setBusyId(jugador.id);
    const fechas = fechasCuotaDesdePeriodo(tipo, periodo);
    const res = await marcarCuotaPagada(jugador.id, tipo, periodo, fechas);
    setBusyId(null);
    if (!res.ok) {
      onMessage(res.error);
      return;
    }
    const refreshed = await fetchCuotas(jugador.id);
    if (refreshed.ok) {
      setCuotasMap((prev) => ({ ...prev, [jugador.id]: refreshed.cuotas }));
    }
    onMessage(t("admin.cuotas.markedOk"));
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
      <p className="admin-hint">
        {t("admin.cuotas.periodHint", { anual: periodoAnual, trim: periodoTrim })}
      </p>
      {loadingCuotas ? <p className="admin-empty">{t("common.loading")}</p> : null}
      <div className="admin-list">
        {activos.map((j) => {
          const cuotas = cuotasMap[j.id] ?? [];
          const anualOk = cuotaPagada(cuotas, "anual", periodoAnual);
          const trimOk = cuotaPagada(cuotas, "trimestral", periodoTrim);
          const anualFechas = fechasCuotaDisplay(cuotas, "anual", periodoAnual);
          const trimFechas = fechasCuotaDisplay(cuotas, "trimestral", periodoTrim);
          return (
            <div key={j.id} className="admin-card admin-card--cuota">
              <div className="admin-card-main">
                <div className="admin-card-name">{nombreAdminJugador(j)}</div>
                <div className="admin-card-meta">{j.numero_socio ? `#${j.numero_socio}` : j.email}</div>
              </div>
              <div className="admin-cuota-cols">
                <div className="admin-cuota-col">
                  <span className="admin-cuota-label">{t("admin.cuotas.annual")}</span>
                  <span className="admin-cuota-dates">{formatRangoCuota(anualFechas)}</span>
                  <span className={`admin-cuota-state ${anualOk ? "paid" : "pending"}`}>
                    {anualOk ? t("admin.cuotas.paid") : t("admin.cuotas.pending")}
                  </span>
                  {!anualOk ? (
                    <button
                      type="button"
                      className="btn btn-sm admin-btn admin-btn--primary"
                      disabled={busyId === j.id}
                      onClick={() => void handleMarcar(j, "anual", periodoAnual)}
                    >
                      {t("admin.cuotas.markPaid")}
                    </button>
                  ) : null}
                </div>
                <div className="admin-cuota-col">
                  <span className="admin-cuota-label">{t("admin.cuotas.quarterly")}</span>
                  <span className="admin-cuota-dates">{formatRangoCuota(trimFechas)}</span>
                  <span className={`admin-cuota-state ${trimOk ? "paid" : "pending"}`}>
                    {trimOk ? t("admin.cuotas.paid") : t("admin.cuotas.pending")}
                  </span>
                  {!trimOk ? (
                    <button
                      type="button"
                      className="btn btn-sm admin-btn admin-btn--primary"
                      disabled={busyId === j.id}
                      onClick={() => void handleMarcar(j, "trimestral", periodoTrim)}
                    >
                      {t("admin.cuotas.markPaid")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
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
  const { jugadores, loading, error, editarJugador, fetchCuotas, marcarCuotaPagada, reload } =
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
    const res = await editarJugador(editTarget.id, form);
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
