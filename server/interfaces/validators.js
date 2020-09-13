/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const JOI = require('joi');

module.exports = {
	rpcRequest: JOI.object({
		id: JOI.alternatives().try(JOI.number(), JOI.string()).required(),
		jsonrpc: JOI.string().allow('2.0').required(),
		method: JOI.string().required(),
		params: JOI.object({
			"@rgCtx": JOI.string().min(1).max(64).empty('').default('rgCtx'),
			"@ugCtx": JOI.string().min(1).max(64).empty('').default('ugCtx'),
			"@permCtx": JOI.string().min(1).max(64).empty('').default('permCtx')
		})
	}).unknown(false),

	id: JOI.string().required().min(1).max(128)
};