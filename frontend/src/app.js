import {
	cancelReservation,
	changePassword,
	createReservation,
	forgotPassword,
	getDesks,
	listMyReservations,
	login,
	logout,
	refreshToken,
	register,
	resetPassword,
	verifyToken,
} from "./apiClient.js";
import { clearAuth, setAuth, setDesks, setReservations, state } from "./state.js";

const ACCESS_TOKEN_KEY = "deskbooking_token";
const REFRESH_TOKEN_KEY = "deskbooking_refresh_token";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const changePasswordForm = document.getElementById("changePasswordForm");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const registerEmail = document.getElementById("registerEmail");
const registerFirstName = document.getElementById("registerFirstName");
const registerLastName = document.getElementById("registerLastName");
const registerSecondLastName = document.getElementById("registerSecondLastName");
const registerPassword = document.getElementById("registerPassword");
const forgotEmailInput = document.getElementById("forgotEmailInput");
const resetTokenInput = document.getElementById("resetTokenInput");
const resetTokenLabel = document.getElementById("resetTokenLabel");
const resetPasswordInput = document.getElementById("resetPasswordInput");
const toggleManualTokenBtn = document.getElementById("toggleManualTokenBtn");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");

const logoutBtn = document.getElementById("logoutBtn");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const tabForgot = document.getElementById("tabForgot");
const tabReset = document.getElementById("tabReset");
const dateInput = document.getElementById("dateInput");
const refreshBtn = document.getElementById("refreshBtn");
const desksGrid = document.getElementById("desksGrid");
const reservationsList = document.getElementById("reservationsList");
const statusEl = document.getElementById("status");
const authSection = document.getElementById("authSection");
const changePasswordSection = document.getElementById("changePasswordSection");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

const loginSubmit = loginForm.querySelector("button[type='submit']");
const registerSubmit = registerForm.querySelector("button[type='submit']");
const forgotSubmit = forgotPasswordForm.querySelector("button[type='submit']");
const resetSubmit = resetPasswordForm.querySelector("button[type='submit']");
const changeSubmit = changePasswordForm.querySelector("button[type='submit']");

function setStatus(message, type = "info") {
	statusEl.textContent = message;
	statusEl.classList.remove("error", "success", "info");
	statusEl.classList.add(type);
}

function setLoading(isLoading, message = "Cargando...") {
	refreshBtn.disabled = isLoading;
	logoutBtn.disabled = !state.token || isLoading;
	loginSubmit.disabled = isLoading;
	registerSubmit.disabled = isLoading;
	forgotSubmit.disabled = isLoading;
	resetSubmit.disabled = isLoading;
	changeSubmit.disabled = isLoading;

	loadingOverlay.classList.toggle("hidden", !isLoading);
	loadingText.textContent = message;
}

function getErrorMessage(err, fallback) {
	const code = err?.code;
	if (!code) {
		return err?.message ?? fallback;
	}

	const map = {
		INVALID_CREDENTIALS: "Credenciales inválidas.",
		EMAIL_NOT_CONFIRMED: "Tu email aún no está confirmado.",
		DOMAIN_NOT_ALLOWED: "Dominio de email no permitido.",
		EMAIL_EXISTS: "Email ya registrado.",
		WEAK_PASSWORD: "Contraseña débil. Debe cumplir la política indicada.",
		CONFLICT: "No se pudo completar la reserva por conflicto.",
		DATE_IN_PAST: "La fecha seleccionada está en el pasado.",
		CANNOT_CANCEL_PAST: "No se puede cancelar una reserva pasada.",
		UNAUTHORIZED: "Sesión no válida. Inicia sesión de nuevo.",
		INVALID_TOKEN: "Token inválido.",
		EXPIRED_TOKEN: "Token expirado.",
		TOKEN_ALREADY_USED: "El token ya fue utilizado.",
	};
	return map[code] ?? err?.message ?? fallback;
}

function setAuthTab(tab) {
	const isLogin = tab === "login";
	loginForm.classList.toggle("hidden", !isLogin);
	registerForm.classList.toggle("hidden", isLogin);
	tabLogin.classList.toggle("active", isLogin);
	tabRegister.classList.toggle("active", !isLogin);
}

function setRecoveryTab(tab) {
	const isForgot = tab === "forgot";
	forgotPasswordForm.classList.toggle("hidden", !isForgot);
	resetPasswordForm.classList.toggle("hidden", isForgot);
	tabForgot.classList.toggle("active", isForgot);
	tabReset.classList.toggle("active", !isForgot);
}

function setResetTokenManualMode(isManualVisible) {
	resetTokenLabel.classList.toggle("hidden", !isManualVisible);
	toggleManualTokenBtn.classList.toggle("hidden", isManualVisible);
}

function extractResetTokenFromLocation() {
	const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
	if (fromHash) {
		return { token: fromHash, source: "hash" };
	}

	const fromQuery = new URLSearchParams(window.location.search).get("token");
	if (fromQuery) {
		return { token: fromQuery, source: "query" };
	}

	return { token: null, source: null };
}

function removeTokenFromUrl(source) {
	const url = new URL(window.location.href);
	if (source === "hash") {
		url.hash = "";
	} else if (source === "query") {
		url.searchParams.delete("token");
	}
	history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function updateAuthUI() {
	authSection.style.display = state.token ? "none" : "block";
	changePasswordSection.classList.toggle("hidden", !state.token);
	logoutBtn.disabled = !state.token;
}

function validatePasswordPolicy(password) {
	const requirements = {
		minLength: password.length >= 12,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		digit: /\d/.test(password),
		special: /[!@#$%^&*\-_+=]/.test(password),
		noCommon: !/^(123|abc|qwerty|password|admin|letmein)/i.test(password),
	};
	return requirements;
}

function isPasswordValidPolicy(password) {
	const reqs = validatePasswordPolicy(password);
	return Object.values(reqs).every(Boolean);
}

function updatePasswordRequirements(password) {
	const reqs = validatePasswordPolicy(password);
	const requirementsDiv = document.getElementById("passwordRequirements");
	if (!requirementsDiv) {
		return;
	}

	const children = requirementsDiv.querySelectorAll("div");
	children[0].textContent = `${reqs.minLength ? "✓" : "✗"} Mínimo 12 caracteres`;
	children[0].classList.toggle("met", reqs.minLength);
	children[1].textContent = `${reqs.uppercase ? "✓" : "✗"} Al menos 1 mayúscula`;
	children[1].classList.toggle("met", reqs.uppercase);
	children[2].textContent = `${reqs.lowercase ? "✓" : "✗"} Al menos 1 minúscula`;
	children[2].classList.toggle("met", reqs.lowercase);
	children[3].textContent = `${reqs.digit ? "✓" : "✗"} Al menos 1 dígito`;
	children[3].classList.toggle("met", reqs.digit);
	children[4].textContent = `${reqs.special ? "✓" : "✗"} Al menos 1 carácter especial (!@#$%^&*-_+=)`;
	children[4].classList.toggle("met", reqs.special);
}

function renderDesks() {
	desksGrid.innerHTML = "";
	if (!state.token) {
		desksGrid.innerHTML = "<p>Login requerido.</p>";
		return;
	}
	if (state.desks.length === 0) {
		desksGrid.innerHTML = "<p>No hay escritorios disponibles.</p>";
		return;
	}

	state.desks.forEach(desk => {
		const card = document.createElement("div");
		card.className = "desk";
		if (desk.isReserved || desk.status !== "active") {
			card.classList.add("reserved");
		}
		if (desk.isMine) {
			card.classList.add("mine");
		}

		const title = document.createElement("div");
		title.className = "title";
		title.textContent = desk.name ? `${desk.code} - ${desk.name}` : desk.code;

		const status = document.createElement("div");
		let statusText = "Libre";
		if (desk.status !== "active") {
			statusText = `No disponible (${desk.status})`;
		}
		if (desk.isReserved) {
			statusText = desk.isMine
				? "Reservado (mío)"
				: desk.occupantName
					? `Reservado (${desk.occupantName})`
					: "Reservado";
		}
		status.textContent = statusText;

		const action = document.createElement("button");
		action.className = "btn";
		action.textContent = desk.isMine ? "Cancelar" : "Reservar";
		action.disabled = desk.status !== "active" || (desk.isReserved && !desk.isMine);

		action.addEventListener("click", async () => {
			try {
				setLoading(true, "Actualizando reserva...");
				if (desk.isMine) {
					await cancelReservation(desk.reservationId, state.token);
					setStatus("Reserva cancelada.", "success");
				} else {
					if (!dateInput.value) {
						dateInput.value = new Date().toISOString().slice(0, 10);
					}
					await createReservation(dateInput.value, desk.id, desk.officeId, state.token, "user");
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
		li.textContent = `${item.reservation_date} - ${item.desk_name}${cancelled}`;
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
		dateInput.value = new Date().toISOString().slice(0, 10);
	}

	setStatus("Cargando...", "info");
	try {
		const [desks, reservations] = await Promise.all([
			getDesks(dateInput.value, state.token),
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

registerPassword.addEventListener("input", () => updatePasswordRequirements(registerPassword.value));

loginForm.addEventListener("submit", async event => {
	event.preventDefault();
	try {
		setLoading(true, "Validando acceso...");
		const result = await login(emailInput.value, passwordInput.value);
		setAuth(result.accessToken, result.user);
		localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
		localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
		updateAuthUI();
		await refreshData();
		setStatus("Login correcto.", "success");
	} catch (err) {
		setStatus(getErrorMessage(err, "Error de login"), "error");
	} finally {
		setLoading(false);
	}
});

registerForm.addEventListener("submit", async event => {
	event.preventDefault();
	if (!isPasswordValidPolicy(registerPassword.value)) {
		setStatus("La contraseña no cumple la política.", "error");
		return;
	}

	try {
		setLoading(true, "Registrando...");
		await register(
			registerEmail.value,
			registerPassword.value,
			registerFirstName.value,
			registerLastName.value,
			registerSecondLastName.value
		);
		setStatus("Registro OK. Revisa tu email para confirmar.", "success");
		setAuthTab("login");
	} catch (err) {
		setStatus(getErrorMessage(err, "Error de registro"), "error");
	} finally {
		setLoading(false);
	}
});

forgotPasswordForm.addEventListener("submit", async event => {
	event.preventDefault();
	try {
		setLoading(true, "Enviando solicitud...");
		await forgotPassword(forgotEmailInput.value);
		forgotPasswordForm.reset();
		setStatus(
			"Si existe una cuenta compatible, recibirás instrucciones de recuperación.",
			"success"
		);
	} catch (err) {
		setStatus(getErrorMessage(err, "No se pudo procesar la solicitud."), "error");
	} finally {
		setLoading(false);
	}
});

resetPasswordForm.addEventListener("submit", async event => {
	event.preventDefault();
	if (!isPasswordValidPolicy(resetPasswordInput.value)) {
		setStatus("La nueva contraseña no cumple la política.", "error");
		return;
	}

	try {
		setLoading(true, "Restableciendo contraseña...");
		await resetPassword(resetTokenInput.value, resetPasswordInput.value);
		resetPasswordForm.reset();
		setStatus("Contraseña restablecida. Ya puedes iniciar sesión.", "success");
		setAuthTab("login");
	} catch (err) {
		setStatus(getErrorMessage(err, "No se pudo restablecer la contraseña."), "error");
	} finally {
		setLoading(false);
	}
});

changePasswordForm.addEventListener("submit", async event => {
	event.preventDefault();
	if (!state.token) {
		setStatus("Debes iniciar sesión para cambiar la contraseña.", "error");
		return;
	}
	if (!isPasswordValidPolicy(newPasswordInput.value)) {
		setStatus("La nueva contraseña no cumple la política.", "error");
		return;
	}

	try {
		setLoading(true, "Actualizando contraseña...");
		await changePassword(currentPasswordInput.value, newPasswordInput.value, state.token);
		changePasswordForm.reset();
		setStatus("Contraseña actualizada correctamente.", "success");
	} catch (err) {
		setStatus(getErrorMessage(err, "No se pudo cambiar la contraseña."), "error");
	} finally {
		setLoading(false);
	}
});

logoutBtn.addEventListener("click", async () => {
	try {
		setLoading(true, "Cerrando sesión...");
		await logout(state.token);
	} catch (err) {
		setStatus(getErrorMessage(err, "Error en logout"), "error");
	} finally {
		clearAuth();
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		updateAuthUI();
		renderDesks();
		renderReservations();
		setStatus("Sesión cerrada.", "info");
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
tabForgot.addEventListener("click", () => setRecoveryTab("forgot"));
tabReset.addEventListener("click", () => setRecoveryTab("reset"));
toggleManualTokenBtn.addEventListener("click", () => setResetTokenManualMode(true));

dateInput.addEventListener("change", async () => {
	setLoading(true, "Actualizando fecha...");
	await refreshData();
	setLoading(false);
});

const { token: resetTokenFromUrl, source: resetTokenSource } = extractResetTokenFromLocation();
if (resetTokenFromUrl) {
	resetTokenInput.value = resetTokenFromUrl;
	setResetTokenManualMode(false);
	setRecoveryTab("reset");
	removeTokenFromUrl(resetTokenSource);
} else {
	setResetTokenManualMode(true);
	setRecoveryTab("forgot");
}

dateInput.value = new Date().toISOString().slice(0, 10);
setAuthTab("login");
updateAuthUI();

const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
if (storedToken) {
	setAuth(storedToken, null);
}
updateAuthUI();

if (storedToken) {
	try {
		const result = await verifyToken(storedToken);
		setAuth(storedToken, result.user ?? null);
		updateAuthUI();
		setStatus("Sesión válida.", "success");
		await refreshData();
	} catch {
		if (storedRefreshToken) {
			try {
				const refreshed = await refreshToken(storedRefreshToken);
				localStorage.setItem(ACCESS_TOKEN_KEY, refreshed.accessToken);
				localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);
				const verified = await verifyToken(refreshed.accessToken);
				setAuth(refreshed.accessToken, verified.user ?? null);
				updateAuthUI();
				setStatus("Sesión renovada.", "success");
				await refreshData();
			} catch {
				clearAuth();
				localStorage.removeItem(ACCESS_TOKEN_KEY);
				localStorage.removeItem(REFRESH_TOKEN_KEY);
				updateAuthUI();
				renderDesks();
				renderReservations();
				setStatus("Sesión expirada, vuelve a login.", "error");
			}
		} else {
			clearAuth();
			localStorage.removeItem(ACCESS_TOKEN_KEY);
			updateAuthUI();
			renderDesks();
			renderReservations();
			setStatus("Sesión expirada, vuelve a login.", "error");
		}
	}
} else {
	await refreshData();
}
