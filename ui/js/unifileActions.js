
globals = window.globals || {};
// event names
globals.unifileEvents = {
	"UNIFILE_LOADED": "evUnifileLoaded",	// raised when this file is loaded  (trigger at the EOF)
	"LOGIN_COMPLETE": "evLoginComplete"		// raised when auth modal is dismissed successfully
};
// urls list
globals.unifileURLs = {
	"AUTH": "api/v1.0/www-auth",// /open-pages-auth
	"AUTH_SUBMIT": "/api/v1.0/www-auth-submit",
	"WRITE_FILE": "api/v1.0/www/exec/put/",
	"GET_FILE": "api/v1.0/www/exec/get/",
	"LIST_DIR": "api/v1.0/www/exec/ls/"
}

function unifileAction(cmd, params) {
	var promise = new Promise(function (resolve, reject) {
		listDir(params, function (data) { resolve(jsonToTree(data, params)); }, function (jqXHR) { reject(jqXHR) });
	});
	return promise;
}

function ajaxGetJSON(ctx, inputs) {
	var url = inputs[0];
	return $.ajax({
		url: url,
		type: 'GET',
		dataType: "json",
	})
	.done(function (results) { ctx.done(results); })
	.fail(function (jqXHR, textStatus, errorThrown) {
		if (jqXHR.status == 401) // login required
		{
			startLoginProcess(function () { ajaxGetJSON(ctx, inputs); });
		} else {
			ctx.fail(jqXHR);
		}
	});
}

function ajaxPostData(ctx, inputs) {
	var url = inputs[0], data = inputs[1];
	var formData = new FormData();
	formData.append("data", data);
	return $.ajax({
		url: url,
		data: formData,
		cache: false,
		contentType: false,
		processData: false,
		type: 'POST'
	})
	.done(function (results) { ctx.done(results); })
	.fail(function (jqXHR, textStatus, errorThrown) { 
		if (jqXHR.status == 401) // login required
		{
			startLoginProcess(function () { ajaxPostData(ctx, inputs); });
		} else {
			ctx.fail(jqXHR);
		}
	});
}

function writeFile(fileName, fileContent, successCB, failureCB) {
	var seq = [
		{
			inputs: [globals.unifileURLs.WRITE_FILE + fileName, fileContent],
			fn: ajaxPostData,
			done: successCB,
			fail: failureCB
		}
	];
	bootloader.executeSequence(seq);
}

function getFile(filepath, successCB, failureCB) {
	var seq = [
		{
			inputs: [globals.unifileURLs.GET_FILE + filepath],
			fn: ajaxGetJSON,
			done: successCB,
			fail: failureCB
		}
	];
	bootloader.executeSequence(seq);
}

function listDir(dirPath, successCB, failureCB) {
	var seq = [
		{
			inputs: [globals.unifileURLs.LIST_DIR + dirPath],
			fn: ajaxGetJSON,
			done: successCB,
			fail: failureCB
		}
	];
	bootloader.executeSequence(seq);
}

//# sourceURL=js/unifileActions.js