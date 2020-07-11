/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export const yDoc = new Y.Doc();

export const idbP = new IndexeddbPersistence('Berg10', yDoc);
idbP.whenSynced.then(() => {
	console.log('loaded data from indexed db');
});

export const lastSession = idbP.get("lastSession");

export default yDoc;