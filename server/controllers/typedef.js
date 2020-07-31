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
				res.status(404).send(RPCError.invalidRequest(`No typeDef record exists for query: ${JSON.stringify(req.query)}`));
		});
	});
};