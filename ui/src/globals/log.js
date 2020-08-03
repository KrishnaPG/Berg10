/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import { getNotificationLogLimit } from './settings';

const gEventLog = [];

export function logEvent(obj) {
	gEventLog.unshift(obj);
	if (gEventLog.length > getNotificationLogLimit())
		gEventLog.pop(); // cap the limit
	// TODO: save to localStorage with debouncer
}

export default gEventLog;