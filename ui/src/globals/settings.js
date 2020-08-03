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
	}
};

export function getNotificationLogLimit() {
	return settings.Notifications.maxQLength.value;
}

export default settings;