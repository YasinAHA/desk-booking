const API_BASE_URL = "http://localhost:3001";
const ACCESS_TOKEN_KEY = "deskbooking_token";
const REFRESH_TOKEN_KEY = "deskbooking_refresh_token";
const AUTO_REFRESH_ENABLED = true; // Modo normal: renovacion automatica de sesion

function getStoredAccessToken() {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getStoredRefreshToken() {
	return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function persistTokens(accessToken, refreshToken) {
	localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
	localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearStoredTokens() {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function shouldSkipAutoRefresh(path) {
	return (
		path === "/auth/login" ||
		path === "/auth/register" ||
		path === "/auth/verify" ||
		path === "/auth/forgot-password" ||
		path === "/auth/reset-password" ||
		path === "/auth/refresh"
	);
}

function authHeaders(token) {
	const effectiveToken = getStoredAccessToken() ?? token;
	return effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {};
}

async function doFetch(path, options) {
	const headers = {
		"Content-Type": "application/json",
	};
	if (options?.headers) {
		Object.assign(headers, options.headers);
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers,
		...options,
	});

	if (response.status === 204) {
		return { ok: true, status: 204, data: null };
	}

	const data = await response.json().catch(() => null);
	return { ok: response.ok, status: response.status, data };
}

async function tryRefreshSession() {
	const refresh = getStoredRefreshToken();
	if (!refresh) {
		return false;
	}

	const refreshed = await doFetch("/auth/refresh", {
		method: "POST",
		body: JSON.stringify({ token: refresh }),
	});

	if (!refreshed.ok) {
		clearStoredTokens();
		return false;
	}

	const accessToken = refreshed.data?.accessToken;
	const refreshToken = refreshed.data?.refreshToken;
	if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
		clearStoredTokens();
		return false;
	}

	persistTokens(accessToken, refreshToken);
	return true;
}

async function request(path, options, canRetry = true) {
	const result = await doFetch(path, options);

	if (
		!result.ok &&
		result.status === 401 &&
		canRetry &&
		!shouldSkipAutoRefresh(path)
	) {
		const refreshed = await tryRefreshSession();
		if (refreshed) {
				const retryOptions = {
					...options,
					headers: {
						...options?.headers,
						...authHeaders(undefined),
					},
				};
			return request(path, retryOptions, false);
		}
	}

	if (!result.ok) {
		const message = result.data?.error?.message ?? "Request failed";
		const code = result.data?.error?.code ?? "ERROR";
		const err = new Error(message);
		err.code = code;
		throw err;
	}

	return result.data;
}

export async function login(email, password) {
	return request("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export async function register(email, password, firstName, lastName, secondLastName) {
	return request("/auth/register", {
		method: "POST",
		body: JSON.stringify({
			email,
			password,
			first_name: firstName,
			last_name: lastName,
			second_last_name: secondLastName || undefined,
		}),
	});
}

export async function forgotPassword(email) {
	return request("/auth/forgot-password", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export async function resetPassword(token, password) {
	return request("/auth/reset-password", {
		method: "POST",
		body: JSON.stringify({ token, password }),
	});
}

export async function changePassword(currentPassword, newPassword, token) {
	return request("/auth/change-password", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({
			current_password: currentPassword,
			new_password: newPassword,
		}),
	});
}

export async function logout(token) {
	return request("/auth/logout", {
		method: "POST",
		headers: authHeaders(token),
	});
}

export async function verifyToken(token) {
	return request("/auth/verify", {
		method: "POST",
		body: JSON.stringify({ token }),
	});
}

export async function refreshToken(token) {
	return request("/auth/refresh", {
		method: "POST",
		body: JSON.stringify({ token }),
	});
}

export async function getDesks(date, token) {
	const query = new URLSearchParams({ date }).toString();
	return request(`/desks?${query}`, {
		headers: authHeaders(token),
	});
}

export async function createReservation(date, deskId, officeId, token, source) {
	return request("/reservations", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({
			date,
			desk_id: deskId,
			office_id: officeId || undefined,
			source: source || undefined,
		}),
	});
}

export async function cancelReservation(reservationId, token) {
	return request(`/reservations/${reservationId}`, {
		method: "DELETE",
		headers: authHeaders(token),
	});
}

export async function listMyReservations(token) {
	return request("/reservations/me", {
		headers: authHeaders(token),
	});
}
