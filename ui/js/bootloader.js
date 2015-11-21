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

/*  Merges the given url content with current active document in the window
 *  @param inputs[0] the url to be retrieved *  
 *  Notes: the way we do here is, we remove the <link><style> and <script> tags from the remote dom and 
 *		add them manually in a controlled manner, so that stylesheets get loaded *before* scripts get executed.
 *		Here we first load the stylesheets, then the content. This avoids flicker. Finally we add the scripts.
 *		The css and script links *always* go to the bodyTarget (and not head). This makes it easy to remove the 
 *		page completely. (Though the loaded scripts may continue to run, hence ajax page creator should be careful).
 *		The remaining head content (such as title, meta tags etc.) has the option to replace or append existing head.
 */
bootloader.ajaxMerge = function (ctx, inputs) {
	var url = inputs[0];
	var mergeOptions = _.defaults(inputs[1] || {}, {
		headTarget: document.head,
		headPlacement: 'append',	// possible values: ['append', 'replace']
		bodyTarget: document.body,
		bodyPlacement: 'append'
	});

	bootloader.getURL(url, function (xhr) {
		var pseudoDoc = new DOMParser().parseFromString(xhr.response, "text/html");

		// detach the css links and scripts
		var cssLinks = [];
		var pseudoCSSLinks = pseudoDoc.querySelectorAll("link[rel='stylesheet'], style"); // this is a static node list
		_.each(pseudoCSSLinks, function (pseudoCSSLink) { cssLinks.push(pseudoCSSLink.parentNode.removeChild(pseudoCSSLink)); });
		var scripts = [];
		var pseudoScripts = pseudoDoc.scripts; // this is live nodeset (so removal should happen carefully)
		while (pseudoScripts.length > 0) { scripts.push(pseudoScripts[0].parentNode.removeChild(pseudoScripts[0])); }
		
		// prepare the targets if cleanup is required
		if (mergeOptions.headPlacement === 'replace')
			mergeOptions.headTarget.innerHTML = "";
		if (mergeOptions.bodyPlacement === 'replace') {
			mergeOptions.bodyTarget.innerHTML = "";
			mergeOptions.bodyTarget.className = "";
		}		
		// Launch the sequence
		var seq = [
			{
			inputs: [cssLinks, mergeOptions],
			fn: bootloader.loadStylesheets,
		},
			{
			inputs: [pseudoDoc, mergeOptions],
			fn: bootloader.loadContent,
		},
			{
			inputs: [scripts, mergeOptions],
			fn: bootloader.loadScripts,
			done: function () { ctx.done(); }
		}
		];		
		bootloader.executeSequence(seq);

		pseudoDoc = null; // delete the temp document

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
	var cssLinks = inputs[0], mergeOptions = inputs[1];
	var cssCount = cssLinks.length;
	if (cssCount <= 0) { return ctx.done(); }
	// trigger the parallel css loads 
	_.each(cssLinks, function (cssLink) {
		cssLink.onerror = cssLink.onload = function () {
			if (--cssCount <= 0) return ctx.done();
		}
		mergeOptions.bodyTarget.appendChild(cssLink);
	});
}

bootloader.loadContent = function (ctx, inputs) {	
	var pseudoDoc = inputs[0], mergeOptions = inputs[1];
	// merge the head content
	mergeOptions.headTarget.insertAdjacentHTML('beforeEnd', pseudoDoc.head.innerHTML);	
	// merge the body content
	mergeOptions.bodyTarget.insertAdjacentHTML('beforeEnd', pseudoDoc.body.innerHTML);	
	// merge body classes
	if (pseudoDoc.body.attributes['class'])
		mergeOptions.bodyTarget.className = mergeOptions.bodyTarget.className + " " + pseudoDoc.body.attributes['class'].value;	
	return ctx.done();
}


/* Appends the given script tags into the document body
 * @param inputs[0] the array of script tags
 * @param inputs[1] the merge options
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
	var mergeOptions = inputs[1];
	var script = scripts.shift();
	var newEl = document.createElement('script');
	_.each(script.attributes, function (attrib) { // copy the attributes
		newEl.setAttribute(attrib.name, attrib.value);
	});
	newEl.innerHTML = script.innerHTML;
	newEl.onerror = newEl.onload = function () { bootloader.loadScripts(ctx, [scripts, mergeOptions]); }; // continue with remaining scripts in sequence
	mergeOptions.bodyTarget.appendChild(newEl);
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
		if (cur.url) {
			cur.inputs = cur.inputs || [];
			cur.inputs.push(cur.url);
			cur.inputs.push({ headTarget: cur.headTarget, headPlacement: cur.headPlacement, bodyTarget: cur.bodyTarget, bodyPlacement: cur.bodyPlacement });
		}		
		if (!cur.fn)
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