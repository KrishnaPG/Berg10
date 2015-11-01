/*
 * Copyright (c) 2015. Cenacle Research India Private Limited
 * 
 */

// eventemitter			
globals = window.globals || {};
globals.ee = new EventEmitter();

globals.loadEvents = {
	"CSS_LOADED": "evCSSLoad",				// when one css on a page loaded
	"JS_LOADED": "evJSLoad",				// when one js on a page loaded
	"ALL_CSS_LOADED": "evAllCSSLoad",		// when all css on a page loaded
	"ALL_JS_LOADED": "evAllJSLoad",			// when all js on a page loaded
	"PAGE_MERGED": "evPageMerged"			// when all is done
}

SAFE_CALL = function(x, arg1, arg2) { if(x) return x(arg1, arg2); }

// the bootloader
bootloader = window.bootloader || {};

/* Gets the content of given url, asynchronously
 * @param url the url get download
 * @param successcb(e) gets called on completion with e.target === xhr
 * @param errorcb(e) gets called in case of errors with e.target === xhr
 */
bootloader.getURL = function (url, successcb, errorcb) {
	var oReq = new XMLHttpRequest();
	oReq.onload = successcb;
	oReq.onerror = errorcb;
	oReq.open("get", url, true);
	oReq.send(null); console.log("getURL: ", url);
	return oReq;
}

/* Gets array of urls in asynchronous mode (order is not guaranteed)
 * @param urls the array of urls to be retrieved
 * @param completioncb(xhr[]) gets called when all urls have been downloaded
 */ 
bootloader.getURLs = function (urls, completioncb) {
	var results = [];
	var successcb = function (e) {
		results.push(e.target);
		if (results.length >= urls.length && completioncb)
			completioncb(results);
	}
	_.each(urls, function (url) {
		getURL(url, successcb, successcb); // we treat success and failure as both same and store the results
	});
	if (urls.length <= 0 && completioncb) completioncb(results); // just for some sanity
}

/**
	when the target does not have body or head, and only pieces, use $('#container').load() from jQuery
	when the target is full blown html page, use ajaxMerge()
 **/
/*  Merges the given url content with current active document in the window
 *  @url the url to be retrieved
 *  @param replaceHead If true, content will replace the head tags. Else content will be appended before the end.
 *  @param bodyContainer if specified, content will be replaced in that continer, else content  will be appended to body tag at the end.
 *  Notes: the way we do here is, we remove the <link><style> and <script> tags from the remote dom and 
 *		add them manually in a controlled manner, so that stylesheets get loaded *before* scripts get executed.
 *		For now, we are loading content before loading the stylesheets (which may cause flicker). Better way would be
 *		to load the css first, then the content and then scripts.
 */
bootloader.ajaxMerge = function (url, replaceHead, bodyContainer) {
	bootloader.getURL(url, function (e) {
		var pseudoDoc = new DOMParser().parseFromString(e.target.response, "text/html");

		// detach the css links and scripts
		var cssLinks = [];
		var pseudoCSSLinks = pseudoDoc.querySelectorAll("link[rel='stylesheet'], style"); // this is a static node list
		_.each(pseudoCSSLinks, function (pseudoCSSLink) { cssLinks.push(pseudoCSSLink.parentNode.removeChild(pseudoCSSLink)); });
		var scripts = [];
		var pseudoScripts = pseudoDoc.scripts; // this is live nodeset (so removal should happen carefully)
		while (pseudoScripts.length > 0) { scripts.push(pseudoScripts[0].parentNode.removeChild(pseudoScripts[0])); }
		
		var seq = [
			{
			inputs: [cssLinks, url],
			fn: bootloader.loadStylesheets,
		},
			{
			inputs: [pseudoDoc, replaceHead, bodyContainer],
			fn: bootloader.loadContent,
		},
			{
			inputs: [scripts, url],
			fn: bootloader.loadScripts,
			done: function () { globals.ee.trigger(globals.loadEvents.PAGE_MERGED, [url]); }
		}
		];		
		bootloader.executeSequence(seq);

		pseudoDoc = null; // delete the document

	},function (e) {
		console.error(e.target);
	});
}

bootloader.executeSequence = function (seq, completionCB) {
	if (seq.length <= 0) return SAFE_CALL(completionCB);
	var context = {};
	var cur = seq.shift();
	context.done = function (results) {
		if (SAFE_CALL(cur.done, results)) return SAFE_CALL(completionCB);
		bootloader.executeSequence(seq);
	}
	cur.fn(context, cur.inputs);
}

/*
 * Load the stylesheets and scripts.
 * Scripts are guaranteed to load *after* all the css are loaded.
 * But the load ordering among css is not guaranteed.
 * Scripts are loaded and executed in order.
 * @param cssLinks the <link> nodes 
 * @param scripts the <script> nodes
 */
bootloader.loadStylesheets = function (ctx, inputs) {
	var cssLinks = inputs[0], url = inputs[1];
	var cssCount = cssLinks.length;
	if (cssCount <= 0) { return ctx.done(); }
	// trigger the parallel css loads 
	_.each(cssLinks, function (cssLink) {
		cssLink.onerror = cssLink.onload = function () {
			if (--cssCount <= 0) return ctx.done();
		}
		document.head.appendChild(cssLink);
	});
}

bootloader.loadContent = function (ctx, inputs) {	
	var pseudoDoc = inputs[0], replaceHead = inputs[1], bodyContainer = inputs[2];

	// merge the head content
	if (replaceHead)
		document.head.innerHTML = pseudoDoc.head.innerHTML;
	else
		document.head.insertAdjacentHTML('beforeEnd', pseudoDoc.head.innerHTML);
	
	// merge the body content
	var bodyTarget = bodyContainer ?  document.getElementById(bodyContainer) : document.body;
	if (bodyContainer)
		bodyTarget.innerHTML = pseudoDoc.body.innerHTML; // replace the content
	else
		bodyTarget.insertAdjacentHTML('beforeEnd', pseudoDoc.body.innerHTML);
	
	// merge body classes
	if (pseudoDoc.body.attributes['class'])
		bodyTarget.className = bodyTarget.className + " " + pseudoDoc.body.attributes['class'].value;
	
	return ctx.done();
}


/* Appends the given script tags into the document body
 * @param scripts the array of script tags
 * @param cb the callback to indicate the completion
 * 
 * Notes: we could have retrieved all the script contents in parallel and 
 * merged it all to be in squence, but debugging it would be difficult. 
 * So, for now we just add the script tags as-is to the body, without 
 * doing anything with them and let the browser do the parsing and downloading it.
 * The only downside is, this is slightly slow (because the other scripts are 
 * waiting for the previous ones to be downloaded first). Downloading in parallel
 * could improve the page load performance. (Only script execution need to be
 * done in sequence, the download can happen in any order.)
 */
bootloader.loadScripts = function (ctx, inputs) {
	var scripts = inputs[0];
	if (scripts.length <= 0) {
		return ctx.done();
	}
	var script = scripts.shift();
	var newEl = document.createElement('script');
	_.each(script.attributes, function (attrib) { // copy the attributes
		newEl.setAttribute(attrib.name, attrib.value);
	});
	newEl.innerHTML = script.innerHTML;
	newEl.onerror = newEl.onload = function () { bootloader.loadScripts(ctx, [scripts]); }; // continue with remaining scripts in sequence
	document.body.appendChild(newEl);
	if (!newEl.src || newEl.src === '') newEl.onload(); // manually trigger onload for inline scripts
}

bootloader.loadSequence = function (seq) {
	if (seq.length <= 0) {
		return;
	}
	var current = seq.shift();
	if (current.url) {
		globals.ee.once(globals.loadEvents.PAGE_MERGED, function (context) {
			if (current.done) current.done();
			bootloader.loadSequence(seq);
		});
		bootloader.ajaxMerge(current.url);
	}
	else if (current.done)
		current.done();
}
//# sourceURL=js/bootloader.js