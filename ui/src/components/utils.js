/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

export function getMatchingRoute(location, key) {
	const regex = new RegExp(`(?:&?)${key}=([^&]*)`);
	const match = location.hash ? location.hash.match(regex) : null;
	if (match !== null) {
		const [, value] = match;
		return [value, regex];
	}
	return [null, regex];
}		
