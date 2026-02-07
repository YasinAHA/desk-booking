import {
    cancelReservation,
    createReservation,
    getDesks,
    listMyReservations,
    login,
    logout,
} from "./apiClient.js";
import {
    clearAuth,
    setAuth,
    setDesks,
    setReservations,
    state,
} from "./state.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const logoutBtn = document.getElementById("logoutBtn");
const dateInput = document.getElementById("dateInput");
const refreshBtn = document.getElementById("refreshBtn");
const desksGrid = document.getElementById("desksGrid");
const reservationsList = document.getElementById("reservationsList");
const statusEl = document.getElementById("status");
const authSection = document.getElementById("authSection");

function setStatus(message, isError = false) {
	statusEl.textContent = message;
	statusEl.classList.toggle("error", isError);
}

function setLoading(isLoading) {
	refreshBtn.disabled = isLoading;
	logoutBtn.disabled = !state.token || isLoading;
}

function updateAuthUI() {
	authSection.style.display = state.token ? "none" : "block";
	logoutBtn.disabled = !state.token;
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
			statusText = desk.is_mine ? "Reservado (mio)" : "Reservado";
		}
		status.textContent = statusText;

		const action = document.createElement("button");
		action.className = "btn";
		action.textContent = desk.is_mine ? "Cancelar" : "Reservar";
		action.disabled = desk.is_reserved && !desk.is_mine;

		action.addEventListener("click", async () => {
			try {
				setLoading(true);
				if (desk.is_mine) {
					await cancelReservation(desk.reservation_id, state.token);
				} else {
					if (!dateInput.value) {
						const today = new Date();
						dateInput.value = today.toISOString().slice(0, 10);
					}
					await createReservation(dateInput.value, desk.id, state.token);
				}
				await refreshData();
			} catch (err) {
				setStatus(err.message ?? "Error", true);
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

	setStatus("Cargando...");
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
		setStatus("OK");
	} catch (err) {
		setStatus(err.message ?? "Error", true);
	}
}

loginForm.addEventListener("submit", async event => {
	event.preventDefault();

	try {
		setLoading(true);
		const result = await login(emailInput.value, passwordInput.value);
		setAuth(result.token, result.user);
		localStorage.setItem("deskbooking_token", result.token);
		updateAuthUI();
		await refreshData();
	} catch (err) {
		setStatus(err.message ?? "Login error", true);
	} finally {
		setLoading(false);
	}
});

logoutBtn.addEventListener("click", async () => {
	try {
		setLoading(true);
		await logout(state.token);
	} catch (err) {
		setStatus(err.message ?? "Logout error", true);
	} finally {
		clearAuth();
		localStorage.removeItem("deskbooking_token");
		updateAuthUI();
		renderDesks();
		renderReservations();
		setLoading(false);
	}
});

refreshBtn.addEventListener("click", async () => {
	setLoading(true);
	await refreshData();
	setLoading(false);
});

dateInput.addEventListener("change", async () => {
	setLoading(true);
	await refreshData();
	setLoading(false);
});

function init() {
	const today = new Date();
	dateInput.value = today.toISOString().slice(0, 10);

	const token = localStorage.getItem("deskbooking_token");
	if (token) {
		setAuth(token, null);
	}

	updateAuthUI();
	refreshData();
}

init();
