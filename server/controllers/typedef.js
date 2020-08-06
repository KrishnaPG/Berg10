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
exports.get = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		Typedef.findOne(req.query, (err, typeDef) => {
			if (err) { return next(err); }
			typeDef ?
				res.send(typeDef) :
				res.status(404).send(RPCError.notFound(`No typeDef record exists for the query:\n ${JSON.stringify(req.query, null, " ")}`));
		});
	});
};

/**
* Post /typedef
* Creates a new type definition entry from the given query params
*/
exports.postNew = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		Typedef.save(req.body, (err, typeDef) => {
			if (err) { return next(err); }
			typeDef ?
				res.send(typeDef) :
				res.status(500).send(RPCError.generic(ex.message));
		});
	});
};