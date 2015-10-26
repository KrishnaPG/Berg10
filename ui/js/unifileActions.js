
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