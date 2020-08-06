const sodiumNative = require('sodium-native');
const base58 = require('bs58');

/**
 * RegExp-escapes all characters in the given string.
 */
function regExpEscape(s) {
	return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}	

module.exports = {
	/** creates a sealed box that only the recipient can open.
	 * @param String - message
	 * @param String - recipientPublicKey (base58 encoded)
	 */
	createSealedBox (message, recipientPublicKey) {
		const msgBuf = Buffer.from(typeof (message) !== "string" ? JSON.stringify(message) : message);
		const cipherBuf = Buffer.alloc(msgBuf.length + sodiumNative.crypto_box_SEALBYTES);
		sodiumNative.crypto_box_seal(cipherBuf, msgBuf, base58.decode(recipientPublicKey));
		return base58.encode(cipherBuf);
	},

	/**
	 * Creates a RegExp from the given string, converting asterisks to .* expressions,
	 * and escaping all other characters.
	 * Useful for specifying filtered origins, such as http://*.domain.com 
	 */
	wildcardToRegExp(s) {
		return new RegExp('^' + s.split(/\*+/).map(regExpEscape).join('.*') + '$');
	},

	RPCError: {
		invalidRequest: (message, code = -32600, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Invalid Request" }, id }),
		notFound: (message, code = -32601, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "NotFound" }, id }),
		generic: (message, code = -32000, id = null) => ({ "jsonrpc": "2.0", "error": { code, message, title: "Error" }, id }),
	}
}