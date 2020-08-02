/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import gEventBus from './eventBus';

export const triggerLogout = () => {
	gEventBus.dispatchEvent(new Event("ev.logout"));
}

export const triggerNotifyError = error => {
	gEventBus.dispatchEvent(new CustomEvent("ev.notify.error", { bubbles: false, detail: error }));
}
export const triggerNotifyWarning = warning => {
	gEventBus.dispatchEvent(new CustomEvent("ev.notify.warning", { bubbles: false, detail: warning }));
}

export const triggerPanelAdd = panelSpec => {
	gEventBus.dispatchEvent(new CustomEvent("ev.panel.add", { bubbles: false, detail: panelSpec }));
}

export const triggerPanelTypeRepo = () => {
	triggerPanelAdd({
		bringToFocus: true,
		id: "TypeRepo",
		component: "TypeRepo",
		name: "TypeRepo",
		config: { text: "i was added" }
	});
}