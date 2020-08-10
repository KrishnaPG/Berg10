/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const settings = {
	Notifications: {
		maxQLength: {
			value: 100,
			help: "Maximum No. of items to display in the Notification Log. Old items will be discarded once this limit is reached."
		}
	},
	Server: {
		baseURL: "http://localhost:8080/api/",	// TODO: when this is changed, axios configuration should be updated
		db: {
			idField: "_id"
		}
	}
};

export function getNotificationLogLimit() {
	return settings.Notifications.maxQLength.value;
}

export function getServerBaseURL() {
	return settings.Server.baseURL;
}
export function getServerDBIdField() {
	return settings.Server.db.idField;
}

export default settings;