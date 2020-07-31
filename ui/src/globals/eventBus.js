/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

export const gEventBus = new EventTarget();

export default gEventBus;

// Logout
export function subscribeToEvLogout(fn) {
	gEventBus.addEventListener("ev.logout", fn);
}
export function unSubscribeToEvLogout(fn) {
	gEventBus.removeEventListener("ev.logout", fn);
}

// Notify
export function subscribeToEvNotify(fn) {
	gEventBus.addEventListener("ev.notify", fn);
}
export function unSubscribeToEvNotify(fn) {
	gEventBus.removeEventListener("ev.notify", fn);
}

// Panel Add
export function subscribeToEvPanelAdd(fn) {
	gEventBus.addEventListener("ev.panel.add", fn);
}
export function unSubscribeToEvPanelAdd(fn) {
	gEventBus.removeEventListener("ev.panel.add", fn);
}