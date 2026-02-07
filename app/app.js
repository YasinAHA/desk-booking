import { createSupabaseClient, isAllowedEmail, getConfig } from "./supabaseClient.js";
if (window.__deskAppBooted) {
    console.warn("[BOOT] app.js ya booted. Evitando doble init.");
    throw new Error("Duplicate boot");
}
window.__deskAppBooted = true;
// --- Event loop heartbeat ---
let __hbLast = performance.now();
setInterval(() => {
    const now = performance.now();
    const drift = now - __hbLast - 1000;
    __hbLast = now;
    if (drift > 250) {
        console.warn("[HB] Event loop bloqueado ~", Math.round(drift), "ms");
    }
}, 1000);
// --- Fetch tracer ---
const __origFetch = window.fetch.bind(window);
const __pendingFetch = new Map(); // id -> info
let __fetchId = 0;

window.fetch = async (...args) => {
    const id = ++__fetchId;
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    const started = performance.now();

    __pendingFetch.set(id, { url, started });
    console.log("[FETCH->]", id, url);

    try {
        const res = await __origFetch(...args);
        const ms = Math.round(performance.now() - started);
        console.log("[FETCH<-]", id, res.status, ms + "ms", url);
        return res;
    } catch (e) {
        const ms = Math.round(performance.now() - started);
        console.warn("[FETCH!!]", id, ms + "ms", url, e);
        throw e;
    } finally {
        __pendingFetch.delete(id);
    }
};

window.__dumpPendingFetch = () => {
    const now = performance.now();
    const arr = [...__pendingFetch.entries()].map(([id, v]) => ({
        id,
        url: v.url,
        pending_ms: Math.round(now - v.started),
    }));
    arr.sort((a, b) => b.pending_ms - a.pending_ms);
    console.table(arr);
    return arr;
};
window.__dumpState = async () => {
    const pe = document.querySelector("#desksGrid")?.style?.pointerEvents;
    const { data } = supabase ? await supabase.auth.getSession() : { data: null };
    console.log("[STATE]", {
        documentHidden: document.hidden,
        pointerEvents: pe,
        isActing: window.isActing,
        isRefreshing: window.isRefreshing,
        hasSession: !!data?.session,
        expiresAt: data?.session?.expires_at,
        now: Math.floor(Date.now() / 1000),
    });
};
if (window.__deskAppBootCount == null) window.__deskAppBootCount = 0;
window.__deskAppBootCount++;
console.log("[BOOT] count=", window.__deskAppBootCount);

if (window.__deskAppBootCount > 1) {
  console.warn("[BOOT] Se ha inicializado app.js más de una vez. Esto rompe auth/fetch.");
}

const $ = (sel) => document.querySelector(sel);

const dateInput = $("#dateInput");
const emailInput = $("#emailInput");
const magicLinkBtn = $("#magicLinkBtn");
const authHint = $("#authHint");
const reloadBtn = $("#reloadBtn"); // si no existe, no pasa nada (lo comprobamos)
const signOutBtn = $("#signOutBtn");

const desksGrid = $("#desksGrid");
const myReservations = $("#myReservations");

let supabase;

// Estado mínimo
let isRefreshing = false;
let isActing = false;

// Deadman: evita grid bloqueado para siempre
let gridLockedAt = null;
const DEADMAN_MS = 8000;

function lockGrid() {
    desksGrid.style.pointerEvents = "none";
    gridLockedAt = Date.now();
}

function unlockGrid() {
    desksGrid.style.pointerEvents = "";
    gridLockedAt = null;
}

// Revisión periódica: si por lo que sea se queda bloqueado, lo suelta
/* setInterval(() => {
    const pe = desksGrid.style.pointerEvents;
    if (pe === "none") {
        if (!gridLockedAt) gridLockedAt = Date.now();
        if (Date.now() - gridLockedAt > DEADMAN_MS) {
            console.warn("[DEADMAN] Grid bloqueado demasiado tiempo. Desbloqueando.");
            isActing = false;
            isRefreshing = false;
            unlockGrid();
            setHint("⚠️ Se detectó bloqueo. Reintentando…");
            refreshAll().catch(() => { });
        }
    } else {
        // si ya no está bloqueado, resetea el contador
        gridLockedAt = null;
    }
}, 1000);
 */

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function setHint(msg) {
    authHint.textContent = msg || "";
}

function validateDate(dateStr) {
    const { MAX_DAYS_AHEAD, ALLOW_WEEKENDS } = getConfig();
    if (!dateStr) return "Selecciona una fecha.";

    const d = new Date(dateStr + "T00:00:00");
    if (!ALLOW_WEEKENDS) {
        const day = d.getDay();
        if (day === 0 || day === 6) return "No se permiten reservas en fin de semana.";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "No puedes reservar fechas pasadas.";
    if (diffDays > MAX_DAYS_AHEAD) return `Solo se permite reservar hasta ${MAX_DAYS_AHEAD} días vista.`;

    return null;
}

async function sendMagicLink() {
    const email = (emailInput.value || "").trim().toLowerCase();
    if (!email) return setHint("Introduce tu email corporativo.");
    if (!isAllowedEmail(email)) return setHint("Ese dominio no está permitido.");

    setHint("Enviando link… revisa tu correo.");
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });

    if (error) return setHint("Error enviando link: " + error.message);
    setHint("✅ Link enviado. Abre tu correo y pulsa el enlace.");
}

async function syncSessionUI() {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error("[AUTH] getSession error:", error);

    const session = data?.session;

    if (session) {
        signOutBtn.hidden = false;
        magicLinkBtn.disabled = true;
        emailInput.disabled = true;
        setHint(`Sesión iniciada: ${session.user.email}`);

        // 👇 NO await. Y NO lo hagas si hay acción
        if (!isActing) requestRefresh("syncSessionUI");
    } else {
        signOutBtn.hidden = true;
        magicLinkBtn.disabled = false;
        emailInput.disabled = false;
        setHint("");
        desksGrid.innerHTML = "";
        myReservations.innerHTML = "";
    }
}


async function signOut() {
    await supabase.auth.signOut();
    await syncSessionUI();
}

let refreshToken = 0;
let refreshInFlight = null;
let refreshPending = false;

function requestRefresh(reason = "manual") {
    // Si ya hay refresh, marca pending y sal
    if (refreshInFlight) {
        refreshPending = true;
        console.log("[REFRESH] pending (in flight). reason=", reason);
        return refreshInFlight;
    }

    console.log("[REFRESH] start. reason=", reason);

    refreshInFlight = (async () => {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
            setHint("No hay sesión activa. Recarga la página o inicia sesión.");
            return;
        }

        const err = validateDate(dateInput.value);
        if (err) {
            setHint(err);
            return;
        }

        await loadDeskOccupancy();
        await loadMyReservations();
    })()
        .catch((e) => {
            console.error("[REFRESH] error:", e);
            setHint("Error refrescando: " + (e?.message || String(e)));
        })
        .finally(async () => {
            refreshInFlight = null;

            // Si durante el refresh se pidió otro, lo lanzamos una vez más
            if (refreshPending) {
                refreshPending = false;
                console.log("[REFRESH] rerun because pending");
                requestRefresh("pending-rerun");
            } else {
                console.log("[REFRESH] done");
            }
        });

    return refreshInFlight;
}


function refreshAll() {
    return requestRefresh("alias-refreshAll");
}



async function loadDeskOccupancy() {
    const date = dateInput.value;

    const { data, error } = await supabase.rpc("get_desk_occupancy", { p_date: date });
    if (error) {
        console.error(error);
        setHint("Error cargando ocupación: " + error.message);
        return;
    }

    desksGrid.innerHTML = "";
    for (const d of data) {
        const btn = document.createElement("button");
        btn.type = "button";

        const isDisabled = !d.is_active || (d.is_reserved && !d.is_mine);
        btn.disabled = isDisabled;

        btn.className =
            "desk" +
            (d.is_reserved ? " desk--busy" : " desk--free") +
            (!d.is_active ? " desk--busy" : " desk-free");

        const name = document.createElement("div");
        name.className = "desk__name";
        name.textContent = d.desk_name;

        const st = document.createElement("div");
        st.className = "desk__status";

        if (!d.is_active) st.textContent = "No disponible";
        else if (!d.is_reserved) st.textContent = "Libre";
        else if (d.is_mine) st.textContent = "Ocupado (tuyo) · click para cancelar";
        else st.textContent = "Ocupado";

        btn.append(name, st);

        btn.addEventListener("click", async () => {
            console.log("[CLICK]", { acting: isActing, refreshing: isRefreshing, pe: desksGrid.style.pointerEvents, desk: d.desk_name });

            if (isActing) return;          // solo bloquea si hay acción (reserve/cancel)
            if (isRefreshing) {
                console.warn("[CLICK] refrescando -> ignorando refresh y actuando igual");
                // NO retornes: deja actuar
            }

            if (!d.is_active) return;

            if (!d.is_reserved) await reserveDesk(d.desk_id);
            else if (d.is_mine && d.my_reservation_id) await cancelReservation(d.my_reservation_id);
        });

        desksGrid.append(btn);
    }
}

async function reserveDesk(deskId) {
    if (isActing) return;
    isActing = true;
    lockGrid();
    console.log("[ACT] reserveDesk start", { isActing, isRefreshing });

    try {
        const date = dateInput.value;
        console.log("[RPC] create_reservation request", { date, deskId });
        await supabase.auth.getSession();

        const { data, error } = await supabase.rpc("create_reservation", {
            p_date: date,
            p_desk_id: deskId,
        });

        console.log("[RPC] create_reservation response", { data, error });

        if (error) {
            console.error(error);
            setHint("Error reservando: " + error.message);
            return;
        }

        const res = Array.isArray(data) ? data[0] : data;
        setHint(res?.ok ? "✅ " + res.message : "❌ " + res.message);

        await requestRefresh("after-action");

    } finally {
        isActing = false;
        unlockGrid();
    }
}

async function cancelReservation(reservationId) {
    if (isActing) return;
    isActing = true;
    lockGrid();

    try {
        console.log("[RPC] cancel_my_reservation request", { reservationId });
        await supabase.auth.getSession();

        const { data, error } = await supabase.rpc("cancel_my_reservation", {
            p_reservation_id: reservationId,
        });

        console.log("[RPC] cancel_my_reservation response", { data, error });

        if (error) {
            console.error(error);
            setHint("Error cancelando: " + error.message);
            return;
        }

        const res = Array.isArray(data) ? data[0] : data;
        setHint(res?.ok ? "✅ " + res.message : "❌ " + res.message);

        await requestRefresh("after-action");

    } finally {
        isActing = false;
        unlockGrid();
    }
}

async function loadMyReservations() {
    const today = todayISO();

    const { data, error } = await supabase
        .from("reservations")
        .select("id,reserved_date,cancelled_at,desks(name,code)")
        .is("cancelled_at", null)
        .gte("reserved_date", today)
        .order("reserved_date", { ascending: true });

    if (error) {
        console.error(error);
        myReservations.innerHTML = `<div class="item"><div>Error cargando mis reservas: ${error.message}</div></div>`;
        return;
    }

    if (!data?.length) {
        myReservations.innerHTML = `<div class="item"><div><strong>Sin reservas</strong><div class="hint">Reserva desde el grid.</div></div></div>`;
        return;
    }

    myReservations.innerHTML = "";
    for (const r of data) {
        const el = document.createElement("div");
        el.className = "item";

        const left = document.createElement("div");
        left.innerHTML = `<div><strong>${r.desks?.name ?? "Puesto"}</strong></div>
<div class="hint">${r.reserved_date}</div>`;

        const right = document.createElement("div");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn";
        btn.textContent = "Cancelar";
        btn.addEventListener("click", async () => {
            await cancelReservation(r.id);
        });

        right.append(btn);
        el.append(left, right);
        myReservations.append(el);
    }
}

function unlockUI() {
    isActing = false;
    isRefreshing = false;
    unlockGrid();
}


async function init() {
    dateInput.value = todayISO();
    supabase = await createSupabaseClient();

    // Rehidratar desde storage (por si reload)
    await supabase.auth.getSession();
    await syncSessionUI(); // syncSessionUI ya hará requestRefresh si hay sesión

    magicLinkBtn.addEventListener("click", sendMagicLink);
    signOutBtn.addEventListener("click", signOut);

    if (reloadBtn) {
        reloadBtn.addEventListener("click", async () => {
            setHint("Recargando…");
            // Rehidrata sesión y pide refresh (sin unlockUI y sin await refreshAll)
            await supabase.auth.getSession();
            await syncSessionUI(); // hará requestRefresh si procede
            requestRefresh("reload-btn");
        });
    }

    dateInput.addEventListener("change", () => {
        const err = validateDate(dateInput.value);
        if (err) return setHint(err);
        requestRefresh("date-change"); // 👈 no await
    });

    // Solo eventos importantes
    supabase.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
            await syncSessionUI(); // 👈 dentro NO uses await refreshAll
        }
    });

    // Al volver a la pestaña: rehidrata y refresca (sin aborts)
    document.addEventListener("visibilitychange", async () => {
        if (!document.hidden) {
            await supabase.auth.getSession();
            requestRefresh("tab-visible");
        }
    });
}


init().catch((e) => {
    console.error(e);
    setHint(String(e.message || e));
});
