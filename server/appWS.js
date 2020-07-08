/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

const collMethods = {
	"findOne": (coll, query) => coll.firstExample(query),
	"findMany": (coll, ids) => coll.lookupByKeys(ids),
	"find": (coll, { offset, limit, sort, desc }) => {
		return db.query(AQL`
				FOR r IN ${coll}
				LIMIT ${offset}, ${limit}
				SORT r.${sort} ${desc ? "DESC" : "ASC"}
				RETURN r
		`).then(cursor => cursor.all());
	}
};

function makeCollectionQuery(method, { collName, query }) {
	const coll = db.collection(collName);
	const fn = collMethods[method];
	if (!fn) return Promise.reject({ code: -32601, message: "Method not found", ctx: { method, collName } });
	return fn(coll, query);
}

function safeParse(jsonStr) {
	try {
		return JSON.parse(jsonStr);
	}
	catch (ex) {
		console.error("JSON.parse failed for: " + jsonStr);
	}
}

module.exports = function (app) {
	const expressWs = require('express-ws')(app, null, {
		wsOptions: {
			maxPayload: 1048576,		// maximum 1MB size message
			path: '',						// only accept matching paths of ws://localhost:3000/
			verifyClient: function ({ origin, req, source }, next) {	// Ref: https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
				if (req.headers['x-fastify-header'] == 'fastify is awesome !') {
					return next(false, 401, "unAuthorized", { 'x-Retry-After': 120 });
				}
				next(true);
			}
		}
	});
	app.ws('/schepes', (ws, req) => {
		ws.on("message", msg => {
			console.log("socket message: ", msg);
			const rpcReq = safeParse(msg);
			if (!rpcReq) return; // conn.socket.send(`{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}`);
			makeCollectionQuery(rpcReq.method, rpcReq.params).then(result => ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id: rpcReq.id,
				result
			}))).catch(ex => {
				const error = { code: ex.code, message: ex.message, ctx: ex.ctx };
				ws.send(`{"jsonrpc": "2.0", "error": ${JSON.stringify(error)}, "id": "${rpcReq.id}"}`);
			});
		});
	});	
}

