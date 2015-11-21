globals = window.globals || {};

function slugify(text) {
	return text.toString().trim().toLowerCase()
	    .replace(/\s+/g, '-')           // Replace spaces with -
	    .replace(/&/g, '-and-')         // Replace & with 'and'
	    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
	    .replace(/\-\-+/g, '-');        // Replace multiple - with single -	
}

/* Generates unique Ids based on current timestamp.
 * Works on seconds as base-resolution.
 * Uses Radix-64 for base64 encoding (which has 32-bit limit).
 * Encoding the time difference using 32-bits at per-second resolution
 * gives roughly 68-years of unique ids (starting from base time stamp).
 */
globals.idGen = {
	baseTime: moment("2015-01-01").unix(),
	lastReqTime: moment(),
	newId: function () {
		var now = moment();
		var secs = now.diff(this.baseTime, "days");
		return globals.Base64.fromInt(secs) + globals.Base64.fromInt(now.milliseconds()*1000);
	}
}

/* Base64 Radix: http://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript */ 
globals.Base64 = {};
globals.Base64.baseDigitsStr = 
	//   0       8       16      24      32      40      48      56     63
	//   v       v       v       v       v       v       v       v      v
		"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
globals.Base64.baseDigits = globals.Base64.baseDigitsStr.split('');
globals.Base64.baseDigitsMap = {};
_.each(globals.Base64.baseDigits, function (digit, i) { globals.Base64.baseDigitsMap[digit] = i; });
globals.Base64.fromInt = function (int32) {
	var result = '';
	while (true) {
		result = this.baseDigits[int32 & 0x3f] + result;
		int32 >>>= 6;
		if (int32 === 0)
			break;
	}
	return result;
};
globals.Base64.toInt = function (digitsStr) {
	var result = 0;
	for (var i = 0; i < digitsStr.length; i++) {
		result = (result << 6) + this.baseDigitsMap[digitsStr[i]];
	}
	return result;
};

//# sourceURL=js/utils.js