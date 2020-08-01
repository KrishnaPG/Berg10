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

// Notify Error
export function subscribeToEvNotifyError(fn) {
	gEventBus.addEventListener("ev.notify.error", fn);
}
export function unSubscribeToEvNotifyError(fn) {
	gEventBus.removeEventListener("ev.notify.error", fn);
}

// Notify Warning
export function subscribeToEvNotifyWarning(fn) {
	gEventBus.addEventListener("ev.notify.warning", fn);
}
export function unSubscribeToEvNotifyWarning(fn) {
	gEventBus.removeEventListener("ev.notify.warning", fn);
}

// Panel Add
export function subscribeToEvPanelAdd(fn) {
	gEventBus.addEventListener("ev.panel.add", fn);
}
export function unSubscribeToEvPanelAdd(fn) {
	gEventBus.removeEventListener("ev.panel.add", fn);
}