/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import gEventBus from './eventBus';

export const triggerLogout = () => {
	gEventBus.dispatchEvent(new Event("logout"));
}

export const triggerPanelAdd = panelSpec => {
	gEventBus.dispatchEvent(new CustomEvent("panel.add", { bubbles: false, detail: panelSpec }));
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