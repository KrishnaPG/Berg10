/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const settings = window.gSettings;

export function getNotificationLogLimit() {
	return settings.Notifications.maxQLength.value;
}

export function getServerBaseURL() {
	return settings.server.baseURL;
}

export default settings;