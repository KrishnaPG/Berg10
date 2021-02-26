/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

		
const RPCError = (err, id = null) => ({ "jsonrpc": "2.0", "error": { code: err.code, message: err.message, title: err.name || err.title || "Error" }, id });

RPCError.duplicate = (message, id = null, code = -32409) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Already Exists" }, id });
RPCError.invalidRequest = (message, id = null, code = -32600) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Invalid Request" }, id });
RPCError.notFound = (message, id = null, code = -32601) => ({ "jsonrpc": "2.0", "error": { code, message, title: "NotFound" }, id });
RPCError.unAuthenticated = (message, id = null, code = -32401) => ({ "jsonrpc": "2.0", "error": { code, message, title: "UnAuthenticated" }, id });
RPCError.unAuthorized = (message, id = null, code = -32403) => ({ "jsonrpc": "2.0", "error": { code, message, title: "UnAuthorized" }, id });
RPCError.generic = (message, id = null, title = "Error", code = -32000) => ({ "jsonrpc": "2.0", "error": { code, message, title }, id });

module.exports = {
	RPCResponse: (result, id = null) => ({ "jsonrpc": "2.0", result, id }),
	RPCError,
	ErrorCode: {
		BadRequest: 400,
		Conflict: 409,
		MethodNotAllowed: 405,
		NotFound: 404,
		NotReady: 425,	// too early, server is not ready
		Timeout: 408,
		TooManyRequests: 429,
		UnAuthenticated: 401,
		UnAuthorized: 403,

		InternalError: 500,
		MethodNotImplemented: 501,
		ServerBusy: 503,	// overloaded server, unable to complete the request
		ServerDown: 521,
	}
}