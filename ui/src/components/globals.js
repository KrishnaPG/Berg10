/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

export const gEventBus = new EventTarget();

export const triggerLogout = () => {
	gEventBus.dispatchEvent(new Event("logout"));
}

export const triggerPanelAdd = () => {
	gEventBus.dispatchEvent(new Event("panel.add"));
}