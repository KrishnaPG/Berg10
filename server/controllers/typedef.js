/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const { sendJWT, verifyJWT } = require('./jwt');
const Typedef = require('../models/Typedef');

/**
* Get /user
* Returns the full user details and also renews the JWT
*/
exports.getUserDetails = (req, res, next) => {
	verifyJWT(req, res, jwtPayload => {
		// Typedef.findOne({ name:  }, (err, existingUser) => {
		// 	if (err) { return next(err); }
		// 	existingUser ?
		// 		sendJWT(existingUser, req, res) :
		// 		res.status(404).send(RPCError.invalidRequest(`No user exists with eMail: ${jwtPayload.email}`));
		// });
	});
};