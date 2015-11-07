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
		replaceHead: false, 
		bodyContainer: 'ajax-content', 
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

// overwrite ajax clicks
$('.sidebar-menu').on('click', 'a.ajax-link', function (e) {
	e.preventDefault();
	var linkEl = e.currentTarget;
	loadAjaxContent(linkEl.href, function (e) { notifyError(e.statusText, "Failure in accessing '" + linkEl.querySelector('span').innerText + "'"); });
});

//# sourceURL=js/base.js