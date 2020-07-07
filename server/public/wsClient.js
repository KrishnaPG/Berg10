//const { performance } = require('perf_hooks');
//const WebSocket = require('ws');

//const ws = new WebSocket('ws://127.0.0.1:3000/schepes');

class CallablePromise {
	constructor() {
		this.p = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		})
	}
}

const pendingQueries = new Map();
function addPendingQuery(id, query) {	
	const c = new CallablePromise();
	pendingQueries.set(id, c);
	return c.p;
}
function resolvePendingQuery(id, value) {
	const c = pendingQueries.get(id);
	if (!c) return;
	pendingQueries.delete(id);	
	c.resolve(value);
}
function rejectPendingQuery(id, err) {
	const c = pendingQueries.get(id);
	if (!c) return;
	pendingQueries.delete(id);
	c.reject(err);
}

class Collection {
	constructor(ws, migId, name) {
		this.schepeId = migId + "-" + name;
		this.migId = migId;
		this.name = name;
		this.ws = ws;
		this._callerId = this.name + Math.ceil(Math.random() * performance.now()).toString(36);
		this._callId = 0;
	}
	findOne(query) {
		const id = this._callId++ + this._callerId;		
		this.ws.send(`{ "jsonrpc": "2.0", "method": "findOne", "params": { "collName": "${this.schepeId}", "query": ${JSON.stringify(query)} }, "id": "${id}" }`);
		return addPendingQuery(id);
	}
	find(query = { offset: 0, limit: 10, sort: "_key", desc: false }) {
		const id = this._callId++ + this._callerId;
		this.ws.send(`{ "jsonrpc": "2.0", "method": "find", "params": { "collName": "${this.schepeId}", "query": ${JSON.stringify(query)} }, "id": "${id}" }`);
		return addPendingQuery(id);		
	}
};

/*
ws.on('open', function open() {
	const coll = new Collection(ws, "z8q1tEzDqq7F", "serviceOffered");

	console.log("socket opened");
	ws.send('something');
	//coll.findOne({ "_key": "352429" });
	coll.find();
});

ws.on('message', data => {
	try {
		const res = JSON.parse(data);
		console.log("received, ", res.id);
	} catch (ex) { console.error(ex); }
});

ws.on("error", ex => console.error("Error happened: ", ex));

ws.on('close', () => {
	console.log('Disconnected');
});*/