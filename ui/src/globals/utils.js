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

function isTokenAlive(decoded) {
	const now = Date.now() / 1000;
	if (decoded.exp && decoded.exp < now) {
		return null; // token expired
	}
	if (decoded.nbf && decoded.nbf > now) {
		return null; //token not yet valid
	}
	return decoded;
}

// returns the payload if token is parsed correctly, and is not expired
export function decodeJWT(token) {
	try {
		const base64Url = token.split('.')[1];
		const base64Str = base64Url.replace('-', '+').replace('_', '/');
		const decoded = JSON.parse(window.atob(base64Str));
		return isTokenAlive(decoded);
	} catch (ex) {
		return null;
	}
}

export function safeParse(jsonStr) {
	try {
		return JSON.parse(jsonStr);
	}
	catch (ex) {
		console.error("JSON.parse failed for: " + jsonStr);
	}
	return null;
}

// wrapper helper to create json-rpc request objects easily
export function jsonRPCObj(method, params = {}, id = performance.now()) {
	return { jsonrpc: "2.0", method, params, id };
}