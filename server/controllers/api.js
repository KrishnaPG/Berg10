/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const { RPCResponse, RPCError } = require('../utils/rpc');
const { wildcardToRegExp } = require('../utils/auth');
const { verifyJWT } = require('./jwt');
const { rpcRequest: JSONRPCRequest } = require('../interfaces/validators');

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

// JSON-RPC method
exports.invokeProviderMethod = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		// validate the request
		const { error: requestError, value: rpcRequest } = JSONRPCRequest.validate(req.body);
		if (requestError) return res.status(406).json(RPCError.invalidRequest(requestError.details[0].message, rpcRequest.id));
		
		const acl = {
			userId: jwtPayload.id,
			appCtx: jwtPayload.appCtx,
			rgCtx: jwtPayload.appCtx + "-" + rpcRequest.params["@rgCtx"],
			ugCtx: jwtPayload.appCtx + "-" + rpcRequest.params["@ugCtx"],
			permCtx: jwtPayload.appCtx + "-" + rpcRequest.params["@permCtx"],
		};
		
		const methodDetails = ProviderMethods[rpcRequest.method];
		if (!methodDetails) return res.status(404).json(RPCError.notFound(`Unknown method: ${rpcRequest.method}`, rpcRequest.id));

		const { error: inputError, value: methodParams } = methodDetails.inputSchema.validate(rpcRequest.params, { allowUnknown: true, stripUnknown: true });
		if (inputError) return res.status(406).json(RPCError.invalidRequest(inputError.details[0].message, rpcRequest.id));

		return methodDetails.fn(db, acl, methodParams)
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