/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const { performance } = require('perf_hooks');
const { RPCResponse, RPCError } = require('../utils/rpc');

const { createSigner, createVerifier } = require('fast-jwt');
const key = config.jwt.secret || (Math.random() * performance.timeOrigin + performance.now()).toString(Math.ceil(Math.random() * 33) + 2); // creates a variable length random string
const jwtSigner = createSigner(Object.assign({ key, algorithm: 'HS256' }, config.jwt));
const jwtVerifier = createVerifier(Object.assign({ key, algorithm: 'HS256' }, config.jwt));

exports.sendJWT = (user, appCtx, req, res) => {
	delete user.password; // do not leak it to the client
	const jwt = jwtSigner({
		id: user[config.db.idField],
		appCtx
	}); //TODO: customize the token expiration based on user's preference
	res.send(RPCResponse({ jwt, user }));
};

exports.verifyJWT = (req, res, cb) => {
	let payload = null;
	try {
		 payload = jwtVerifier((req.headers.authorization || '').replace('Bearer ', ''));
	} catch (err) {
		return res.status(401).send(RPCError.unAuthenticated(err.message));
	}
	if(payload) cb(payload);
}