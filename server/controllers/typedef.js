/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const Typedef = require('../models/Typedef');
const { RPCError } = require('../auth/utils');
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
				res.send(results) :
				res.status(404).send(RPCError.notFound(`No typeDef record exists for the query:\n ${JSON.stringify(req.query, null, " ")}`));
		});
	});
};

/**
* Post /typedef
* Creates a new type definition entry from the given query params
*/
exports.create = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		Typedef.create(req.body, (err, typeDef) => {
			if (err) { return res.status(err.statusCode).send(RPCError.generic(err.message, err.name, err.code)); }
			res.send(typeDef);
		});
	});
};

exports.get = exports.update = exports.remove = (req, res, next) => {
	res.status(404).send(RPCError.notFound(`Not Implemented`));
}