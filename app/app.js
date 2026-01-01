import { createSupabaseClient, isAllowedEmail, getConfig } from "./supabaseClient.js";

const $ = (sel) => document.querySelector(sel);

const dateInput = $("#dateInput");
const emailInput = $("#emailInput");
const magicLinkBtn = $("#magicLinkBtn");
const authHint = $("#authHint");
const signOutBtn = $("#signOutBtn");

const desksGrid = $("#desksGrid");
const myReservations = $("#myReservations");

let supabase;

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

function renderDesksPlaceholder() {
    const desks = Array.from({ length: 15 }, (_, i) => ({
        label: `Puesto ${String(i + 1).padStart(2, "0")}`,
        status: "Libre",
        busy: false,
    }));

    desksGrid.innerHTML = "";
    for (const d of desks) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "desk" + (d.busy ? " desk--busy" : "");
        el.disabled = d.busy;

        const name = document.createElement("div");
        name.className = "desk__name";
        name.textContent = d.label;

        const st = document.createElement("div");
        st.className = "desk__status";
        st.textContent = d.status;

        el.append(name, st);
        desksGrid.append(el);
    }
}

function renderMyReservationsPlaceholder() {
    myReservations.innerHTML = `<div class="item">
    <div>
      <div><strong>Sin reservas</strong></div>
      <div class="hint">En v0.2 conectamos con la DB para reservar/cancelar.</div>
    </div>
  </div>`;
}

async function sendMagicLink() {
    const email = (emailInput.value || "").trim().toLowerCase();
    if (!email) return setHint("Introduce tu email corporativo.");
    if (!isAllowedEmail(email)) return setHint("Ese dominio no está permitido.");

    setHint("Enviando link… revisa tu correo.");
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            // IMPORTANTE: en Supabase hay que configurar Site URL / Redirect URLs
            emailRedirectTo: window.location.origin + window.location.pathname,
        }
    });

    if (error) return setHint("Error enviando link: " + error.message);
    setHint("✅ Link enviado. Abre tu correo y pulsa el enlace.");
}

async function syncSessionUI() {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (session) {
        signOutBtn.hidden = false;
        magicLinkBtn.disabled = true;
        emailInput.disabled = true;
        setHint(`Sesión iniciada: ${session.user.email}`);
    } else {
        signOutBtn.hidden = true;
        magicLinkBtn.disabled = false;
        emailInput.disabled = false;
        setHint("");
    }
}

async function signOut() {
    await supabase.auth.signOut();
    await syncSessionUI();
}

function validateDate(dateStr) {
    const { MAX_DAYS_AHEAD, ALLOW_WEEKENDS } = getConfig();
    if (!dateStr) return "Selecciona una fecha.";

    const d = new Date(dateStr + "T00:00:00");
    if (!ALLOW_WEEKENDS) {
        const day = d.getDay(); // 0 dom, 6 sáb
        if (day === 0 || day === 6) return "No se permiten reservas en fin de semana.";
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "No puedes reservar fechas pasadas.";
    if (diffDays > MAX_DAYS_AHEAD) return `Solo se permite reservar hasta ${MAX_DAYS_AHEAD} días vista.`;
    return null;
}

async function init() {
    dateInput.value = todayISO();
    supabase = await createSupabaseClient();

    // UI base (v0.1 placeholder)
    renderDesksPlaceholder();
    renderMyReservationsPlaceholder();

    magicLinkBtn.addEventListener("click", sendMagicLink);
    signOutBtn.addEventListener("click", signOut);

    dateInput.addEventListener("change", () => {
        const err = validateDate(dateInput.value);
        if (err) setHint(err);
        else setHint("");
        // en v0.2: recargaremos ocupación real según fecha
    });

    supabase.auth.onAuthStateChange(async () => {
        await syncSessionUI();
    });

    await syncSessionUI();
}

init().catch((e) => {
    console.error(e);
    setHint(String(e.message || e));
});
