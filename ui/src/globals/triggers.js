/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import gEventBus from './eventBus';
import { logEvent } from './log';

export const triggerLogout = () => {
	gEventBus.dispatchEvent(new Event("ev.logout"));
}

export const triggerNotifyError = error => {
	logEvent({ t: new Date(), type: "error", ...error });
	gEventBus.dispatchEvent(new CustomEvent("ev.notify.error", { bubbles: false, detail: error }));
}
export const triggerNotifyWarning = warning => {
	logEvent({ t: new Date(), type: "warning", ...warning });
	gEventBus.dispatchEvent(new CustomEvent("ev.notify.warning", { bubbles: false, detail: warning }));
}

export const triggerPanelAdd = panelSpec => {
	gEventBus.dispatchEvent(new CustomEvent("ev.panel.add", { bubbles: false, detail: panelSpec }));
}

export const triggerEvTabSwitch = ev => {
	gEventBus.dispatchEvent(new CustomEvent("ev.tab.switch", { bubbles: false, detail: ev }));
}

export const triggerPanelDMN = () => {
	triggerPanelAdd({
		bringToFocus: true,
		id: "DMNEditor",
		component: "DMN.AddNew",
		name: "DMN",
		config: {}
	});
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

export const triggerPanelUsers = () => {
	triggerPanelAdd({
		bringToFocus: true,
		id: "Users",
		component: "Users",
		name: "Users",
		config: {}
	});
}

export const triggerPanelAQLQueries = () => {
	triggerPanelAdd({
		bringToFocus: true,
		id: "AQL Queries",
		component: "AQLQueries",
		name: "AQL Queries",
		config: {}
	});
}