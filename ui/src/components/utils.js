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

// returns the payload if token is parsed correctly, and is not expired
export function decodeJWT(token) {
	const base64Url = token.split('.')[1];
	const base64Str = base64Url.replace('-', '+').replace('_', '/');
	try {
		return JSON.parse(window.atob(base64Str));
	} catch (ex) {
		return null;
	}
}