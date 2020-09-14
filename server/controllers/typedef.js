/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const Typedef = require('../models/Typedef');
const { RPCResponse, RPCError } = require('../utils/rpc');
const { sendJWT, verifyJWT } = require('./jwt');

/**
* Get /typedef
* Returns the type definition for the given query params
*/
exports.find = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		console.log("req.params: ", req.query);
		Typedef.find(req.query).then(results => {
			results ?
				res.send(RPCResponse(results)) :
				res.status(404).send(RPCError.notFound(`No typeDef record exists for the query:\n ${JSON.stringify(req.query, null, " ")}`));
		}).catch(err => res.status(err.statusCode).send(RPCError(err)));
	});
};

/**
* Post /typedef
* Creates a new type definition entry from the given query params
*/
exports.create = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		return Typedef.create(req.body)
			.then(typeDef =>
				res.send(RPCResponse(typeDef)))
			.catch(err => res.status(err.statusCode).send(RPCError(err)));
	});
};

exports.get = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		Typedef.findByKey(req.body)
			.then(typeDef =>
				res.send(RPCResponse(typeDef)))
			.catch(err =>
				res.status(err.statusCode).send(RPCError(err)));
	});
}

exports.update = exports.remove = (req, res, next) => {
	res.status(404).send(RPCError.notFound(`Not Implemented`));
}