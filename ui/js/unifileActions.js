
// eventemitter			
globals = window.globals || {};
globals.ee = new EventEmitter();
// event names
globals.events = {
	"UNIFILE_LOADED": "evUnifileLoaded",	// raised when this file is loaded  (trigger at the EOF)
	"LOGIN_COMPLETE": "evLoginComplete"		// raised when auth modal is dismissed successfully
};
// urls list
globals.urls = {
	"unifile_AUTH_URL": "api/v1.0/www-auth",
	"unifile_AUTH_SUBMIT_URL": "/api/v1.0/www-auth-submit"
}

function ajaxGetJSON(url) {
	return $.ajax({
		url: url,
		type: 'GET',
		dataType: "json",
	});
}

function unifileAction(cmd, params) {
	var promise = new Promise(function (resolve, reject) {
		var url = "api/v1.0/www/exec/" + cmd + params;
		var req = ajaxGetJSON(url);
		req.done(function (data) {
			resolve(jsonToTree(data,"/"));
		}).fail(function (jqXHR, textStatus, errorThrown) {
			if (jqXHR.status == 401) // login required
			{
				startLoginProcess(function () { // executed upon completion
					unifileAction(cmd, params).then(data => resolve(data), err => reject(err));
				});
			} else {
				reject(jqXHR);
			}
		});
	});
	return promise;
}

console.log("unifile loaded");