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

SAFE_CALL = function (x, arg1, arg2) { if (x) return x(arg1, arg2); }

// the bootloader
bootloader = window.bootloader || {};

/* Gets the content of given url, asynchronously
 * @param url the url get download
 * @param successcb(xhr) gets called on completion
 * @param errorcb(xhr) gets called in case of errors (both network and 400+ errors)
 */
bootloader.getURL = function (url, successcb, errorcb) {
	var oReq = new XMLHttpRequest();
	oReq.onload = function (e) { e.target.status >= 400 ? errocb(e.target) : successcb(e.target); }
	oReq.onerror = function (e) { errorcb(e.target) } ;	// gets fired only on network errors
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
bootloader.ajaxMerge = function (ctx, inputs) {
	var url = inputs[0], replaceHead = inputs[1], bodyContainer = inputs[2];

	bootloader.getURL(url, function (xhr) {
		var pseudoDoc = new DOMParser().parseFromString(xhr.response, "text/html");

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
			done: function () { ctx.done(); }
		}
		];		
		bootloader.executeSequence(seq);

		pseudoDoc = null; // delete the document

	},function (xhr) {
		ctx.fail(xhr);
	});
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

/* This is a specialization of executeSequence that only does ajaxMerge
 * for each entry in the input array.
 * 
 * @param seq[] is an array of objects of format: 
 *		{url:'http://...', 
 *		 replaceHead: true/false, 
 *		 bodyContainer: '#container', 
 *		 done: function(results) { },
 *		 fail: function(e) { }, 
 *		 always: function(ctx, seq) { },
 *		}
 */ 
bootloader.mergeSequence = function (seq, completionCB) {
	var newseq = _.map(seq, function (cur) {
		cur.inputs = [];
		cur.inputs.push(cur.url);
		cur.inputs.push(cur.replaceHead);
		cur.inputs.push(cur.bodyContainer);
		cur.fn = cur.url ? bootloader.ajaxMerge : function (ctx) { ctx.fail(new Error("bootloader.mergeSequence: URL not specified")); };
		return cur;
	});
	bootloader.executeSequence(newseq, completionCB);
}

/* Executes given sequence of asynchronous functions one by one.
 * 
 * @param seq[] is any array of objects of format:
 *	{
 *		inputs:[],
 *		beforeFn: function(ctx, seq) { },
 *		fn: function(ctx, inputs) { ctx.done(); },
 *		done: function(results) { },
 *		fail: function(e) { },
 *		always: function(e) { }
 *	}
 *	Each fn function should call ctx.done / ctx.fail when its operation completes, so 
 *	that the execution can proceed to next function in the sequence.
 *	If done() / fail() callback at any stage returns true, the sequence will be stopped.
 *	The beforeFn() gets called just before the function is scheduled for execution, 
 *	and always() gets called after done() / fail() callbacks are complete. 
 */	
bootloader.executeSequence = function (seq, completionCB) {
	if (seq.length <= 0) return SAFE_CALL(completionCB);
	var context = {};
	var cur = seq.shift();
	context.done = function (results) {
		var shouldStop = SAFE_CALL(cur.done, results);
		SAFE_CALL(cur.always, context, cur, results);
		if(shouldStop) return SAFE_CALL(completionCB);
		bootloader.executeSequence(seq);
	};
	context.fail = function (e) {
		var shouldStop = SAFE_CALL(cur.fail, e);
		SAFE_CALL(cur.always, context, cur, e);
		if(shouldStop) return SAFE_CALL(completionCB);
		bootloader.executeSequence(seq);
	}
	SAFE_CALL(cur.beforeFn, context, cur);
	cur.fn(context, cur.inputs);
}

//# sourceURL=js/bootloader.js