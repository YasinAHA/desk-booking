export const state = {
	token: null,
	user: null,
	desks: [],
	reservations: [],
};

export function setAuth(token, user) {
	state.token = token;
	state.user = user;
}

export function clearAuth() {
	state.token = null;
	state.user = null;
}

export function setDesks(items) {
	state.desks = items;
}

export function setReservations(items) {
	state.reservations = items;
}
