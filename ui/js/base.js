/* Copyright (C) 2015. Cenacle Research India Private Limited
 */

PNotify.prototype.options.styling = "fontawesome";

// ajax loading helpers
$.ajaxSetup({
	async: true, cache: true, ifModified: false,
	type: 'GET',
	dataType: "html",
});
function loadAjaxContent(url, failureCB) {
	$('.preloader').show(); 	
	var seq = [ {
		url: url, 
		bodyTarget: document.getElementById('ajax-content'),
		bodyPlacement: 'replace',
		fail: function (xhr) {
			failureCB ? failureCB(xhr) : notifyError(xhr.statusText, "Unable to get " + url);
		},
		always: function () { $('.preloader').hide(); }
	}];
	bootloader.mergeSequence(seq);
}
function notifyError(title, text) {
	new PNotify({ title: title, text: text, type: 'error', icon: false, before_close: function (e) { } });
}
function notifyInfo(title, text) {
	new pNotify({ title: title, text: text, type: 'info', icon: false });
}

// overwrite ajax clicks
$('.sidebar-menu').on('click', 'a.ajax-link', function (e) {
	e.preventDefault();
	var linkEl = e.currentTarget;
	loadAjaxContent(linkEl.href, function (e) { notifyError(e.statusText, "Failure in accessing '" + linkEl.querySelector('span').innerText + "'"); });
});

// Read the data about sites
function loadMetadata(ctx, inputs) {
	var bForcedRefresh = inputs[0];
	if (!globals.metadata || bForcedRefresh) {
		getFile('index.json', function (metadata) {
			if (!_.isEmpty(metadata))
				globals.metadata = metadata;
			else
				bootstrapMetadata();
			ctx.done();
		},
		function (xhr) {
			if (xhr.status == 404) {
				bootstrapMetadata();
				return ctx.done();
			}
			else
				notifyError(xhr.statusText, "Unable to access sites metadata !!");
			ctx.fail(xhr);
		});
	}
}

// create a sample site in an empty metadata
function bootstrapMetadata() {
	if (!_.isEmpty(globals.metadata))
		return notifyError("Inconsistent codepath", "Cannot bootstrap non-empty metadata");
	globals.metadata = {};
	var site = {
		title: "My Website",
		url: "www.mysite.com",
	};
	globals.metadata["default"] = site;
	globals.metadata["default1"] = site;
	globals.metadata["default2"] = site;
}

//# sourceURL=js/base.js