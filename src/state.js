/**
 * Shared application state for the two loaded fonts.
 */

const listeners = [];

const state = {
	fontA: null, // { data, fontFamily, file, collectionIndex }
	fontB: null,
};

export function getState() {
	return state;
}

export function setFont(slot, fontInfo) {
	state[slot] = fontInfo;
	notify();
}

export function onStateChange(fn) {
	listeners.push(fn);
}

export function bothFontsLoaded() {
	return state.fontA !== null && state.fontB !== null;
}

function notify() {
	for (const fn of listeners) {
		fn(state);
	}
}
