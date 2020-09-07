/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

		
const RPCError = (err, id = null) => ({ "jsonrpc": "2.0", "error": { code: err.code, message: err.message, title: err.name || "Error" }, id });

RPCError.duplicate = (message, code = -32409, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Already Exists" }, id });
RPCError.invalidRequest = (message, code = -32600, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Invalid Request" }, id });
RPCError.notFound = (message, code = -32601, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "NotFound" }, id });
RPCError.unAuthenticated = (message, code = -32401, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "UnAuthenticated" }, id });
RPCError.unAuthorized = (message, code = -32403, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "UnAuthorized" }, id });
RPCError.generic = (message, title = "Error", code = -32000, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title }, id });

module.exports = {
	RPCResponse: (result, id = null) => ({ "jsonrpc": "2.0", result, id }),
	RPCError
}