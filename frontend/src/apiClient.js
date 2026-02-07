const API_BASE_URL = "http://localhost:3001";

async function request(path, options) {
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
		return null;
	}

	const data = await response.json().catch(() => null);
	if (!response.ok) {
		const message = data?.error?.message ?? "Request failed";
		const code = data?.error?.code ?? "ERROR";
		const err = new Error(message);
		err.code = code;
		throw err;
	}

	return data;
}

function authHeaders(token) {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email, password) {
	return request("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export async function logout(token) {
	return request("/auth/logout", {
		method: "POST",
		headers: authHeaders(token),
	});
}

export async function getDesks(date, token) {
	const query = new URLSearchParams({ date }).toString();
	return request(`/desks?${query}`, {
		headers: authHeaders(token),
	});
}

export async function createReservation(date, deskId, token) {
	return request("/reservations", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({ date, desk_id: deskId }),
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
