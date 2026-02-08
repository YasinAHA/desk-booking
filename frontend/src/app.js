import {
    cancelReservation,
    createReservation,
    getDesks,
    listMyReservations,
    login,
    logout,
    register,
    verifyToken,
} from "./apiClient.js";
import {
    clearAuth,
    setAuth,
    setDesks,
    setReservations,
    state,
} from "./state.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const registerEmail = document.getElementById("registerEmail");
const registerName = document.getElementById("registerName");
const registerPassword = document.getElementById("registerPassword");
const logoutBtn = document.getElementById("logoutBtn");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const dateInput = document.getElementById("dateInput");
const refreshBtn = document.getElementById("refreshBtn");
const desksGrid = document.getElementById("desksGrid");
const reservationsList = document.getElementById("reservationsList");
const statusEl = document.getElementById("status");
const authSection = document.getElementById("authSection");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const loginSubmit = loginForm.querySelector("button[type='submit']");
const registerSubmit = registerForm.querySelector("button[type='submit']");

function setStatus(message, type = "info") {
	statusEl.textContent = message;
	statusEl.classList.remove("error", "success", "info");
	statusEl.classList.add(type);
}

function setLoading(isLoading, message = "Cargando...") {
	refreshBtn.disabled = isLoading;
	logoutBtn.disabled = !state.token || isLoading;
	if (loginSubmit) loginSubmit.disabled = isLoading;
	if (registerSubmit) registerSubmit.disabled = isLoading;
	if (loadingOverlay) {
		loadingOverlay.classList.toggle("hidden", !isLoading);
	}
	if (loadingText) {
		loadingText.textContent = message;
	}
}

function getErrorMessage(err, fallback) {
	const code = err?.code;
	if (!code) {
		return err?.message ?? fallback;
	}
	const map = {
		INVALID_CREDENTIALS: "Credenciales invalidas.",
		NOT_CONFIRMED: "Tu email aun no esta confirmado.",
		DOMAIN_NOT_ALLOWED: "Dominio de email no permitido.",
		EMAIL_EXISTS: "Email ya registrado.",
		CONFLICT: "Ese escritorio ya esta reservado.",
		DATE_IN_PAST: "La fecha seleccionada esta en el pasado.",
		CANNOT_CANCEL_PAST: "No se puede cancelar una reserva pasada.",
		UNAUTHORIZED: "Sesion no valida. Inicia sesion de nuevo.",
	};
	return map[code] ?? err?.message ?? fallback;
}

function updateAuthUI() {
	authSection.style.display = state.token ? "none" : "block";
	logoutBtn.disabled = !state.token;
}

function setAuthTab(tab) {
	const isLogin = tab === "login";
	loginForm.classList.toggle("hidden", !isLogin);
	registerForm.classList.toggle("hidden", isLogin);
	tabLogin.classList.toggle("active", isLogin);
	tabRegister.classList.toggle("active", !isLogin);
}

function renderDesks() {
	desksGrid.innerHTML = "";

	if (!state.token) {
		desksGrid.innerHTML = "<p>Login requerido.</p>";
		return;
	}

	if (state.desks.length === 0) {
		desksGrid.innerHTML = "<p>No desks disponibles.</p>";
		return;
	}

	state.desks.forEach(desk => {
		const card = document.createElement("div");
		card.className = "desk";
		if (desk.is_reserved) {
			card.classList.add("reserved");
		}
		if (desk.is_mine) {
			card.classList.add("mine");
		}

		const title = document.createElement("div");
		title.className = "title";
		title.textContent = `${desk.code} - ${desk.name}`;

		const status = document.createElement("div");
		let statusText = "Libre";
		if (desk.is_reserved) {
			if (desk.is_mine) {
				statusText = "Reservado (mio)";
			} else if (desk.occupant_name) {
				statusText = `Reservado (${desk.occupant_name})`;
			} else {
				statusText = "Reservado";
			}
		}
		status.textContent = statusText;

		const action = document.createElement("button");
		action.className = "btn";
		action.textContent = desk.is_mine ? "Cancelar" : "Reservar";
		action.disabled = desk.is_reserved && !desk.is_mine;

		action.addEventListener("click", async () => {
			try {
				setLoading(true, "Actualizando reserva...");
				if (desk.is_mine) {
					await cancelReservation(desk.reservation_id, state.token);
					setStatus("Reserva cancelada.", "success");
				} else {
					if (!dateInput.value) {
						const today = new Date();
						dateInput.value = today.toISOString().slice(0, 10);
					}
					await createReservation(dateInput.value, desk.id, state.token);
					setStatus("Reserva creada.", "success");
				}
				await refreshData();
			} catch (err) {
				setStatus(getErrorMessage(err, "Error"), "error");
			} finally {
				setLoading(false);
			}
		});

		card.appendChild(title);
		card.appendChild(status);
		card.appendChild(action);
		desksGrid.appendChild(card);
	});
}

function renderReservations() {
	reservationsList.innerHTML = "";

	if (!state.token) {
		reservationsList.innerHTML = "<li>Login requerido.</li>";
		return;
	}

	if (state.reservations.length === 0) {
		reservationsList.innerHTML = "<li>Sin reservas.</li>";
		return;
	}

	state.reservations.forEach(item => {
		const li = document.createElement("li");
		const cancelled = item.cancelled_at ? " (cancelada)" : "";
		li.textContent = `${item.reserved_date} - ${item.desk_name}${cancelled}`;
		reservationsList.appendChild(li);
	});
}

async function refreshData() {
	if (!state.token) {
		renderDesks();
		renderReservations();
		return;
	}

	if (!dateInput.value) {
		const today = new Date();
		dateInput.value = today.toISOString().slice(0, 10);
	}

	setStatus("Cargando...", "info");
	const date = dateInput.value;

	try {
		const [desks, reservations] = await Promise.all([
			getDesks(date, state.token),
			listMyReservations(state.token),
		]);
		setDesks(desks.items ?? []);
		setReservations(reservations.items ?? []);
		renderDesks();
		renderReservations();
		setStatus("OK", "success");
	} catch (err) {
		setStatus(getErrorMessage(err, "Error"), "error");
	}
}

loginForm.addEventListener("submit", async event => {
	event.preventDefault();

	try {
		setLoading(true, "Validando acceso...");
		const result = await login(emailInput.value, passwordInput.value);
		setAuth(result.token, result.user);
		localStorage.setItem("deskbooking_token", result.token);
		updateAuthUI();
		await refreshData();
		setStatus("Login correcto.", "success");
	} catch (err) {
		setStatus(getErrorMessage(err, "Login error"), "error");
	} finally {
		setLoading(false);
	}
});

registerForm.addEventListener("submit", async event => {
	event.preventDefault();

	try {
		setLoading(true, "Registrando...");
		await register(
			registerEmail.value,
			registerPassword.value,
			registerName.value
		);
		setStatus("Registro OK. Revisa tu email para confirmar.", "success");
		setAuthTab("login");
	} catch (err) {
		setStatus(getErrorMessage(err, "Registro error"), "error");
	} finally {
		setLoading(false);
	}
});

logoutBtn.addEventListener("click", async () => {
	try {
		setLoading(true, "Cerrando sesion...");
		await logout(state.token);
	} catch (err) {
		setStatus(getErrorMessage(err, "Logout error"), "error");
	} finally {
		clearAuth();
		localStorage.removeItem("deskbooking_token");
		updateAuthUI();
		renderDesks();
		renderReservations();
		setStatus("Sesion cerrada.", "info");
		setLoading(false);
	}
});

refreshBtn.addEventListener("click", async () => {
	setLoading(true, "Actualizando...");
	await refreshData();
	setLoading(false);
});

tabLogin.addEventListener("click", () => setAuthTab("login"));
tabRegister.addEventListener("click", () => setAuthTab("register"));

dateInput.addEventListener("change", async () => {
	setLoading(true, "Actualizando fecha...");
	await refreshData();
	setLoading(false);
});

const today = new Date();
dateInput.value = today.toISOString().slice(0, 10);
setAuthTab("login");

const storedToken = localStorage.getItem("deskbooking_token");
if (storedToken) {
	setAuth(storedToken, null);
}

updateAuthUI();

if (storedToken) {
	try {
		const result = await verifyToken(storedToken);
		setAuth(storedToken, result.user ?? null);
		updateAuthUI();
		setStatus("Sesion valida", "success");
		await refreshData();
	} catch {
		clearAuth();
		localStorage.removeItem("deskbooking_token");
		setStatus("Sesion expirada, vuelve a login.", "error");
		updateAuthUI();
		renderDesks();
		renderReservations();
	}
} else {
	await refreshData();
}
