import {
	cancelReservation,
	checkInByQr,
	changePassword,
	createReservation,
	forgotPassword,
	getAdminDesks,
	getDesks,
	listMyReservations,
	login,
	logout,
	refreshToken,
	register,
	regenerateAllDeskQr,
	regenerateDeskQr,
	resetPassword,
	verifyToken,
} from "./apiClient.js";
import { clearAuth, setAdminDesks, setAuth, setDesks, setReservations, state } from "./state.js";

const ACCESS_TOKEN_KEY = "deskbooking_token";
const REFRESH_TOKEN_KEY = "deskbooking_refresh_token";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const changePasswordForm = document.getElementById("changePasswordForm");
const qrCheckInForm = document.getElementById("qrCheckInForm");

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
const qrPublicIdInput = document.getElementById("qrPublicIdInput");

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
const adminSection = document.getElementById("adminSection");
const adminDesksGrid = document.getElementById("adminDesksGrid");
const regenerateAllQrBtn = document.getElementById("regenerateAllQrBtn");
const printAllQrBtn = document.getElementById("printAllQrBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

const loginSubmit = loginForm.querySelector("button[type='submit']");
const registerSubmit = registerForm.querySelector("button[type='submit']");
const forgotSubmit = forgotPasswordForm.querySelector("button[type='submit']");
const resetSubmit = resetPasswordForm.querySelector("button[type='submit']");
const changeSubmit = changePasswordForm.querySelector("button[type='submit']");
let pendingDeskQr = null;

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
	if (regenerateAllQrBtn) {
		regenerateAllQrBtn.disabled = isLoading;
	}
	if (printAllQrBtn) {
		printAllQrBtn.disabled = isLoading;
	}

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
		DESK_ALREADY_RESERVED: "Ese escritorio ya está reservado.",
		USER_ALREADY_HAS_RESERVATION: "Ya tienes una reserva activa para ese día.",
		INVALID_TOKEN: "Token inválido.",
		EXPIRED_TOKEN: "Token expirado.",
		TOKEN_ALREADY_USED: "El token ya fue utilizado.",
		RESERVATION_NOT_FOUND: "No existe una reserva válida para ese QR y fecha.",
		RESERVATION_NOT_ACTIVE: "La reserva no está activa para check-in.",
	};
	return map[code] ?? err?.message ?? fallback;
}


function handleSessionExpired(err) {
	if (err?.code !== "UNAUTHORIZED") {
		return false;
	}
	clearAuth();
	setAdminDesks([]);
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
	updateAuthUI();
	renderDesks();
	renderReservations();
	renderAdminDesks();
	setStatus("Sesión expirada, vuelve a login.", "error");
	return true;
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
	const fromHash = new URLSearchParams(globalThis.location.hash.replace(/^#/, "")).get("token");
	if (fromHash) {
		return { token: fromHash, source: "hash" };
	}

	const fromQuery = new URLSearchParams(globalThis.location.search).get("token");
	if (fromQuery) {
		return { token: fromQuery, source: "query" };
	}

	return { token: null, source: null };
}

function extractDeskQrFromLocation() {
	const fromHash = new URLSearchParams(globalThis.location.hash.replace(/^#/, "")).get("desk_qr");
	if (fromHash) {
		return { qrPublicId: fromHash, source: "hash" };
	}

	const fromQuery = new URLSearchParams(globalThis.location.search).get("desk_qr");
	if (fromQuery) {
		return { qrPublicId: fromQuery, source: "query" };
	}

	return { qrPublicId: null, source: null };
}

function removeParamFromUrl(source, key) {
	const url = new URL(globalThis.location.href);
	if (source === "hash") {
		const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
		hashParams.delete(key);
		const nextHash = hashParams.toString();
		url.hash = nextHash ? `#${nextHash}` : "";
	} else if (source === "query") {
		url.searchParams.delete(key);
	}
	history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function updateAuthUI() {
	authSection.style.display = state.token ? "none" : "block";
	changePasswordSection.classList.toggle("hidden", !state.token);
	if (!state.token) {
		adminSection.classList.add("hidden");
	}
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
			if (desk.isMine) {
				statusText = "Reservado (mío)";
			} else if (desk.occupantName) {
				statusText = `Reservado (${desk.occupantName})`;
			} else {
				statusText = "Reservado";
			}
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
					} else {
						if (!dateInput.value) {
							dateInput.value = new Date().toISOString().slice(0, 10);
						}
						await createReservation(dateInput.value, desk.id, desk.officeId, state.token, "user");
					}
					await refreshData({ silent: true });
					if (desk.isMine) {
						setStatus("Reserva cancelada.", "success");
					} else {
						const updatedDesk = state.desks.find(item => item.id === desk.id);
						if (updatedDesk?.isMine) {
							setStatus("Reserva creada.", "success");
						} else {
							setStatus("No se pudo confirmar la reserva. Revisa disponibilidad e inténtalo de nuevo.", "error");
						}
					}
				} catch (err) {
					if (handleSessionExpired(err)) {
						return;
					}
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

function buildDeskQrPayload(qrPublicId) {
	const url = new URL(globalThis.location.href);
	url.hash = `desk_qr=${encodeURIComponent(qrPublicId)}`;
	return url.toString();
}

function buildDeskQrImageUrl(qrPublicId) {
	const payload = buildDeskQrPayload(qrPublicId);
	return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=220`;
}

function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function printDeskQr(item) {
	const qrImageUrl = buildDeskQrImageUrl(item.qr_public_id);

	const html = `<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8" />
	<title>QR ${escapeHtml(item.code)}</title>
	<style>
		body { font-family: Arial, sans-serif; padding: 24px; }
		.sheet { border: 1px solid #ddd; border-radius: 12px; padding: 16px; max-width: 320px; }
		.meta { margin: 0 0 12px; color: #444; }
		img { width: 260px; height: 260px; display: block; margin: 8px 0; }
		.token { font-size: 12px; word-break: break-all; color: #666; }
	</style>
</head>
<body>
	<div class="sheet">
		<h2>Desk ${escapeHtml(item.code)}</h2>
		<p class="meta">${escapeHtml(item.name ?? "Sin nombre")} | estado: ${escapeHtml(item.status)}</p>
		<img src="${escapeHtml(qrImageUrl)}" alt="QR ${escapeHtml(item.code)}" />
		<p class="token">${escapeHtml(item.qr_public_id)}</p>
	</div>
	<script>
		(() => {
			const img = document.querySelector("img");
			let done = false;
			const printNow = () => {
				if (done) return;
				done = true;
				window.focus();
				window.print();
			};
			if (img) {
				img.addEventListener("load", () => setTimeout(printNow, 50), { once: true });
				img.addEventListener("error", printNow, { once: true });
			}
			setTimeout(printNow, 1500);
		})();
	</script>
</body>
</html>`;

	const blob = new Blob([html], { type: "text/html" });
	const blobUrl = globalThis.URL.createObjectURL(blob);
	const printWindow = globalThis.open(blobUrl, "_blank", "width=600,height=800");
	if (!printWindow) {
		globalThis.URL.revokeObjectURL(blobUrl);
		setStatus("No se pudo abrir la ventana de impresión.", "error");
		return;
	}

	globalThis.setTimeout(() => {
		globalThis.URL.revokeObjectURL(blobUrl);
	}, 5000);
}

function printAllDeskQr(items) {
	if (!items?.length) {
		setStatus("No hay escritorios para imprimir.", "info");
		return;
	}

	const cards = items
		.map(
			item => `<article class="sheet">
	<h2>Desk ${escapeHtml(item.code)}</h2>
	<p class="meta">${escapeHtml(item.name ?? "Sin nombre")} | estado: ${escapeHtml(item.status)}</p>
	<img src="${escapeHtml(buildDeskQrImageUrl(item.qr_public_id))}" alt="QR ${escapeHtml(item.code)}" />
	<p class="token">${escapeHtml(item.qr_public_id)}</p>
</article>`
		)
		.join("");

	const html = `<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8" />
	<title>QR Desks</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 16px; }
		.grid { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 12px; }
		.sheet { border: 1px solid #ddd; border-radius: 12px; padding: 12px; break-inside: avoid; }
		.meta { margin: 0 0 10px; color: #444; font-size: 14px; }
		img { width: 220px; height: 220px; display: block; margin: 8px 0; }
		.token { font-size: 12px; word-break: break-all; color: #666; }
		@media print { body { margin: 0; } .grid { gap: 8px; } }
	</style>
</head>
<body>
	<section class="grid">${cards}</section>
	<script>
		(() => {
			const images = Array.from(document.images);
			let pending = images.length;
			let done = false;
			const printNow = () => {
				if (done) return;
				done = true;
				window.focus();
				window.print();
			};
			if (pending === 0) {
				setTimeout(printNow, 50);
			} else {
				for (const img of images) {
					const settle = () => {
						pending -= 1;
						if (pending <= 0) setTimeout(printNow, 50);
					};
					img.addEventListener("load", settle, { once: true });
					img.addEventListener("error", settle, { once: true });
				}
			}
			setTimeout(printNow, 2500);
		})();
	</script>
</body>
</html>`;

	const blob = new Blob([html], { type: "text/html" });
	const blobUrl = globalThis.URL.createObjectURL(blob);
	const printWindow = globalThis.open(blobUrl, "_blank", "width=960,height=900");
	if (!printWindow) {
		globalThis.URL.revokeObjectURL(blobUrl);
		setStatus("No se pudo abrir la impresión masiva.", "error");
		return;
	}
	globalThis.setTimeout(() => {
		globalThis.URL.revokeObjectURL(blobUrl);
	}, 7000);
}

function getCheckInDateForFlow() {
	if (dateInput.value) {
		return dateInput.value;
	}
	const today = new Date().toISOString().slice(0, 10);
	dateInput.value = today;
	return today;
}

async function runQrCheckInFlow(qrPublicId, options = {}) {
	const auto = options.auto === true;
	if (!state.token) {
		if (auto) {
			pendingDeskQr = qrPublicId;
			setStatus("QR detectado. Inicia sesión para completar el check-in.", "info");
		} else {
			setStatus("Debes iniciar sesión para hacer check-in.", "error");
		}
		return false;
	}

	const date = getCheckInDateForFlow();
	const result = await checkInByQr(date, qrPublicId, state.token);
	if (result?.status === "already_checked_in") {
		setStatus("Ya estabas en estado check-in para esta reserva.", "info");
	} else {
		setStatus("Check-in confirmado.", "success");
	}
	await refreshData({ silent: true });
	pendingDeskQr = null;
	return true;
}

function renderAdminDesks() {
	adminDesksGrid.innerHTML = "";
	if (!state.token || !state.adminDesks?.length) {
		adminSection.classList.add("hidden");
		return;
	}

	adminSection.classList.remove("hidden");

	state.adminDesks.forEach(item => {
		const card = document.createElement("div");
		card.className = "admin-card";

		const header = document.createElement("div");
		header.className = "admin-card-header";
		header.innerHTML = `<strong>${item.code}</strong><span>${item.status}</span>`;

		const name = document.createElement("div");
		name.textContent = item.name ?? "Sin nombre";

		const qr = document.createElement("img");
		qr.className = "admin-qr";
		qr.src = buildDeskQrImageUrl(item.qr_public_id);
		qr.alt = `QR ${item.code}`;

		const token = document.createElement("code");
		token.textContent = item.qr_public_id;

		const actions = document.createElement("div");
		actions.className = "admin-actions";

		const regenerateBtn = document.createElement("button");
		regenerateBtn.className = "btn btn-ghost";
		regenerateBtn.type = "button";
		regenerateBtn.textContent = "Regenerar QR";
		regenerateBtn.addEventListener("click", async () => {
			try {
				setLoading(true, `Regenerando QR de ${item.code}...`);
				await regenerateDeskQr(item.id, state.token);
				const adminData = await getAdminDesks(state.token);
				setAdminDesks(adminData.items ?? []);
				renderAdminDesks();
				setStatus(`QR regenerado para ${item.code}. Reemplaza la pegatina física.`, "success");
			} catch (err) {
				if (handleSessionExpired(err)) {
					return;
				}
				setStatus(getErrorMessage(err, "No se pudo regenerar el QR."), "error");
			} finally {
				setLoading(false);
			}
		});

		const printBtn = document.createElement("button");
		printBtn.className = "btn";
		printBtn.type = "button";
		printBtn.textContent = "Imprimir";
		printBtn.addEventListener("click", () => printDeskQr(item));

		actions.appendChild(regenerateBtn);
		actions.appendChild(printBtn);

		card.appendChild(header);
		card.appendChild(name);
		card.appendChild(qr);
		card.appendChild(token);
		card.appendChild(actions);
		adminDesksGrid.appendChild(card);
	});
}

if (regenerateAllQrBtn) {
	regenerateAllQrBtn.addEventListener("click", async () => {
		if (!state.token) {
			setStatus("Debes iniciar sesión.", "error");
			return;
		}
		try {
			setLoading(true, "Regenerando todos los QR...");
			const result = await regenerateAllDeskQr(state.token);
			const adminData = await getAdminDesks(state.token);
			setAdminDesks(adminData.items ?? []);
			renderAdminDesks();
			const updated = Number(result?.updated ?? 0);
			setStatus(`QR regenerados: ${updated}. Reemplaza las pegatinas físicas.`, "success");
		} catch (err) {
			if (handleSessionExpired(err)) {
				return;
			}
			setStatus(getErrorMessage(err, "No se pudieron regenerar todos los QR."), "error");
		} finally {
			setLoading(false);
		}
	});
}

if (printAllQrBtn) {
	printAllQrBtn.addEventListener("click", () => {
		printAllDeskQr(state.adminDesks ?? []);
	});
}

async function refreshData(options = {}) {
	const silent = options.silent === true;
	if (!state.token) {
		renderDesks();
		renderReservations();
		renderAdminDesks();
		return;
	}

	if (!dateInput.value) {
		dateInput.value = new Date().toISOString().slice(0, 10);
	}

	if (!silent) {
		setStatus("Cargando...", "info");
	}
	try {
		const [desks, reservations] = await Promise.all([
			getDesks(dateInput.value, state.token),
			listMyReservations(state.token),
		]);
		setDesks(desks.items ?? []);
		setReservations(reservations.items ?? []);
		try {
			const adminData = await getAdminDesks(state.token);
			setAdminDesks(adminData.items ?? []);
		} catch (err) {
			if (err?.code === "FORBIDDEN") {
				setAdminDesks([]);
			} else {
				throw err;
			}
		}
		renderDesks();
		renderReservations();
		renderAdminDesks();
		if (!silent) {
			setStatus("OK", "success");
		}
	} catch (err) {
		if (handleSessionExpired(err)) {
			return;
		}
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
		if (pendingDeskQr) {
			await runQrCheckInFlow(pendingDeskQr, { auto: true });
		}
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
		if (handleSessionExpired(err)) {
			return;
		}
		setStatus(getErrorMessage(err, "No se pudo cambiar la contraseña."), "error");
	} finally {
		setLoading(false);
	}
});

qrCheckInForm.addEventListener("submit", async event => {
	event.preventDefault();
	const qrPublicId = qrPublicIdInput.value.trim();
	if (!qrPublicId) {
		setStatus("Introduce el código QR público.", "error");
		return;
	}

	try {
		setLoading(true, "Procesando check-in...");
		await runQrCheckInFlow(qrPublicId, { auto: false });
		qrCheckInForm.reset();
	} catch (err) {
		if (handleSessionExpired(err)) {
			return;
		}
		setStatus(getErrorMessage(err, "No se pudo completar el check-in."), "error");
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
		setAdminDesks([]);
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		updateAuthUI();
		renderDesks();
		renderReservations();
		renderAdminDesks();
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
	removeParamFromUrl(resetTokenSource, "token");
} else {
	setResetTokenManualMode(true);
	setRecoveryTab("forgot");
}

const { qrPublicId: deskQrFromUrl, source: deskQrSource } = extractDeskQrFromLocation();
if (deskQrFromUrl) {
	pendingDeskQr = deskQrFromUrl;
	qrPublicIdInput.value = deskQrFromUrl;
	removeParamFromUrl(deskQrSource, "desk_qr");
	setStatus("QR detectado. Inicia sesión para completar el check-in.", "info");
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
		if (pendingDeskQr) {
			await runQrCheckInFlow(pendingDeskQr, { auto: true });
		}
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
				if (pendingDeskQr) {
					await runQrCheckInFlow(pendingDeskQr, { auto: true });
				}
			} catch {
				clearAuth();
				setAdminDesks([]);
				localStorage.removeItem(ACCESS_TOKEN_KEY);
				localStorage.removeItem(REFRESH_TOKEN_KEY);
				updateAuthUI();
				renderDesks();
				renderReservations();
				renderAdminDesks();
				setStatus("Sesión expirada, vuelve a login.", "error");
			}
		} else {
			clearAuth();
			setAdminDesks([]);
			localStorage.removeItem(ACCESS_TOKEN_KEY);
			updateAuthUI();
			renderDesks();
			renderReservations();
			renderAdminDesks();
			setStatus("Sesión expirada, vuelve a login.", "error");
		}
	}
} else {
	await refreshData();
}

