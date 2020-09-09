/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const { RPCResponse, RPCError } = require('../utils/rpc');
const { wildcardToRegExp } = require('../utils/auth');
const { verifyJWT } = require('./jwt');

const db = require('../models/db'); // should be loaded before the below line
const { rpcMethods: ProviderMethods } = require('../interfaces/'); // db.init() populates these rpcMethods (server/index.js invokes the init())

const AllowedOrigins = config.cors.allowedOrigins.map(el => wildcardToRegExp(el)); // pre-bake to regExps

exports.getUser = (req, res, next) => {
	const allowed = AllowedOrigins.some(regEx => req.headers.origin.match(regEx));
	if (!allowed) return res.sendStatus(403);
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Credentials', true);
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	req.isAuthenticated() ? res.send(RPCResponse({ sessionID: req.sessionID, user: req.user })) : res.sendStatus(401);
};

exports.logout = (req, res, next) => {
	const allowed = AllowedOrigins.some(regEx => req.headers.origin.match(regEx));
	if (!allowed) return res.sendStatus(403);
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Credentials', true);
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	req.logout();
	res.clearCookie(config.session.name);
	req.session ? req.session.destroy(err => {
		req.user = null;
		err ? res.send(RPCError(err)) : res.send(RPCResponse("success"));
	}) : res.send(RPCResponse("success"));
};



/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
	res.render('api/index', {
		title: 'API Examples'
	});
};

/**
 * GET /api/upload
 * File Upload API example.
 */

exports.getFileUpload = (req, res) => {
	res.render('api/upload', {
		title: 'File Upload'
	});
};

exports.postFileUpload = (req, res) => {
	req.flash('success', { msg: 'File was uploaded successfully.' });
	res.redirect('/api/upload');
};

exports.invokeProviderMethod = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		const rpcRequest = req.body;
		if (rpcRequest.jsonrpc !== "2.0")
			return res.status(501).json(RPCError.invalidRequest(`Only {jsonrpc: "2.0"} methods are supported`, rpcRequest.id));
		
		const acl = {
			userId: jwtPayload.id,
			appCtx: jwtPayload.appCtx,
			rgCtx: rpcRequest.params.rgCtx,
			ugCtx: rpcRequest.params.ugCtx,
			permCtx: rpcRequest.params.permCtx,
		};
		
		const fn = ProviderMethods[rpcRequest.method];
		if (!fn) return res.status(404).json(RPCError.notFound(`Unknown method: ${rpcRequest.method}`, rpcRequest.id));

		return fn(db, rpcRequest.params, acl)
			.then(result => res.json(RPCResponse(result, rpcRequest.id)))
			.catch(ex => res.status(ex.code || 500).json(RPCError(ex, rpcRequest.id)));
	});
}


let gCachedResponse_lPMethods = null;
exports.listProviderMethods = (req, res, next) => {
	if (gCachedResponse_lPMethods) return res.send(gCachedResponse_lPMethods);
	gCachedResponse_lPMethods = JSON.stringify(RPCResponse(Object.keys(ProviderMethods)));
	return res.send(gCachedResponse_lPMethods);
}