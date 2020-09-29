/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

module.exports = {
	UnAuthorized: message => ({ code: 403, message, title: "UnAuthorized" }),
	NotFound: message => ({ code: 404, message, title: "Not Found" }),
	Invalid: message => ({ code: 406, message, title: "Invalid Request" }),	
};