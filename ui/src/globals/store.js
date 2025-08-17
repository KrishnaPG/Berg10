/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

let yDoc = null;
let idbP = null;

function init() {
	return Promise.all([
		import(/* webpackChunkName: "yJS", webpackPreload: true */ 'yjs'),
		import(/* webpackChunkName: "yIDB", webpackPreload: true */ 'y-indexeddb')
	]).then(([yJS, yIDB]) => {
		yDoc = new yJS.Doc();
		idbP = new yIDB.IndexeddbPersistence('Berg10', yDoc);
		idbP.whenSynced.then(() => {});
		return yDoc;
	});
}

export const lastSession = init().then(() => idbP.get("lastSession"));

export function saveSession(sessionData) {
	// save the session details to local storage
	idbP.set("lastSession", sessionData);
}

export function clearSession() {
	// delete the session details from the storage
	idbP.del("lastSession");
}

export function closeYDB() {
	// safely close the db access
	idbP.destroy();
}