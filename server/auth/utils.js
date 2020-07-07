const sodiumNative = require('sodium-native');
const base58 = require('bs58')

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
	}
}