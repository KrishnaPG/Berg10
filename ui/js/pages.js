
globals = window.globals || {};
globals.metadata = globals.metadata || {};
globals.pageEditors = {};

// cross-browser fullscreen API
if (document.fullscreenEnabled)
	globals.fullscreen = {
		request: "requestFullscreen",
		element: "fullscreenElement",
		exit: "exitFullscreen",
		event: "fullscreenchange"
	};
else if (document.msfullscreenEnabled)
	globals.fullscreen = {
		request: "msRequestFullscreen",
		element: "msFullscreenElement",
		exit: "msExitFullscreen",
		event: "msfullscreenchange"
	};
else if (document.mozfullscreenEnabled)
	globals.fullscreen = {
		request: "mozRequestFullScreen",
		element: "mozFullScreenElement",
		exit: "mozCancelFullScreen",
		event: "mozfullscreenchange"
	};
else if (document.webkitFullscreenEnabled)
	globals.fullscreen = {
		request: "webkitRequestFullscreen",
		element: "webkitFullscreenElement",
		exit: "webkitExitFullscreen",
		event: "webkitfullscreenchange"
	};

function initCreatePageForm() {
	$.fn.editable.defaults.mode = 'inline';
	// customize xEditable buttons to avoid glyphicon
	$.fn.editableform.buttons =
		'<button type="submit" class="btn btn-primary btn-sm editable-submit">' +
			'<i class="fa fa-check"></i>' +
		'</button>' +
		'<button type="button" class="btn btn-default btn-sm editable-cancel">' +
			'<i class="fa fa-times"></i>' +
		'</button>';
	// initialize the editables
	$('div#create-page a.xEditable').editable();
	$('a.xEditableWebsites').editable({
		value: globals.metadata[_.keys(globals.metadata)[0]].url,
		source: _.map(globals.metadata, function (site, key) {
			return { value: site.url, text: site.url };
		})
	});
	$('div#create-page a.xEditableCat').editable({
		pk: 1,
		limit: 3,
		source: [
		 { value: 1, text: 'banana' },
		 { value: 2, text: 'peach' },
		 { value: 3, text: 'apple' },
		 { value: 4, text: 'watermelon' },
		 { value: 5, text: 'orange' }
		]
	});
	$('div#create-page a.xEditableDate').editable({
		value: moment().format(),
		combodate: {
			firstItem: 'name',
			minuteStep: 1,
			minYear: 2000,
			smartDays: true
		}
	});
	$('div#create-page a.xEditableEditor').editable({
		value: 1,
		source: [
			{ value: 1, text: 'Markdown - SMEditor', type: 'markdown' },
			{ value: 2, text: 'HTML - Summernote', type: 'html'},
			{ value: 3, text: 'HTML - CKEditor', type: 'html' },
			{ value: 4, text: 'HTML - SCEditor', type: 'html' },
			{ value: 5, text: 'HTML - AlloyEditor', type: 'html' }
	]
	});
	$('div#create-page .editable').on('hidden', function (e, reason) { //automatically open the next edits
		if (reason === 'save' || reason === 'nochange') {
			var $next = $(this).closest('div.form-group').next().find('.editable');
			if (false) { // for now, we disable this automatic opening
				setTimeout(function () {
					$next.editable('show');
				}, 300);
			} else {
				$next.focus();
			}
		}
	});
}

function initPageEditors() {
	globals.pageEditors.simplemde = new SimpleMDE({
		element: document.getElementById("pageEditor-smde"),
		autosave: {
			enabled: true,
			unique_id: "pageEditor-smde",
			delay: 5000,
		},
		hideIcons: [],
		renderingConfig: {
			codeSyntaxHighlighting: true
		},
		toolbar: ["bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "guide"]
	});
}

function setupFileTreeHandlers() {
	// handle the file tree selection events
	$('#fileTreeContainer')
		.on('filetreeclicked', function (e, data) {
		$('.selected-file').text($('a[rel="' + data.rel + '"]').text());
	})
		.on('filetreecollapsed', function (e, data) {
		$('#website-crud li.header span').text(data.value);
	})
		.on('filetreeexpanded', function (e, data) {
		$('#website-crud li.header span').text(data.value);
	});
}

function writeToIFrame(iFrame, content) {
	iFrame.contentDocument.open();
	iFrame.contentDocument.write(content);
	iFrame.contentDocument.close();
	return iFrame.contentDocument;
}

function onPagePreview() {
	var elem = document.getElementById('ifPreview');
	var content = "<h1>Please wait...</h1><xmp theme='united' style='display:none'>" + globals.pageEditors.simplemde.value() + "</xmp> <script src='http://strapdownjs.com/v/0.2/strapdown.js'></" + "script>";
	writeToIFrame(elem, content);
	elem[globals.fullscreen.request](); // invoke fullscreen request
}
function setupFullscreenHandlers() {
	var iFrame = document.getElementById('ifPreview');
	document.addEventListener(globals.fullscreen["event"], function (event) {
		if (document[globals.fullscreen["element"]] === iFrame) {
			iFrame.parentNode.className = ""; // we are in fullscreen
		} else {
			iFrame.parentNode.className = "fsPreview"; // hide the iframe in non-fullscreen mode
		}
	}, false);
}

function onSaveDraft() {
	var id = Date.now();
	var draft = _.extend({
		id: id,
		type: 'md',
		title: $('div#create-page a.xEditable').editable('getValue', true),
		editor: $('div#create-page a.xEditableEditor').editable('getValue', true),
		tags: $("div#create-page .tagsInput").tagsinput('items'),
		cat: $('div#create-page a.xEditableCat').editable('getValue', true),
		date: $('div#create-page a.xEditableDate').editable('getValue', true),
		status: 'draft' // 'draft', 'published', 'deleted'
	});
	console.log(draft);

	writeFile('sample', JSON.stringify(draft));
	//var request = new XMLHttpRequest();
	//request.open("POST", "");
	//request.send(formData);
}

function onPublish() {
}

//============ launch the sequence ==================//
initCreatePageForm();
initPageEditors();
setupFileTreeHandlers();
setupFullscreenHandlers();

//============ CSS Postprocessor ==================//
function cssPostProcess(cssURL) {
	$.ajax({ url: cssURL })
	.done(function (response) {
		// add the css content to current doc as disabled stylesheet (so that we can manipulate it)
		var uid = "" + Date.now();
		document.head.insertAdjacentHTML('beforeEnd', "<style disabled id='" + uid + "'>\n" + response + "\n</style>");

		var ss = document.styleSheets[_.findIndex(document.styleSheets, function (ss) { return ss.ownerNode.id === uid; })];
		var newCSS = 
			_.map(ss.cssRules, function (rule) {
				if (rule.type != 1) return rule.cssText; // we only process CSSStyleRule types, others we put as is
				var modifiedSelector = _.map(rule.selectorText.split(/\s*,\s*/), function (el) { return ".B10prvw " + el.trim(); }).join(", ");
				var modifiedRule = rule.cssText.replace(rule.selectorText, modifiedSelector)				
				return modifiedRule;
			}).join('\n');

		// replace the old css with new css (assumption: this whole function is executing in single-thread mode)
		var ssNode = document.head.querySelector("style[id='" + uid + "']");
		ssNode.innerHTML = newCSS;
		ssNode.removeAttribute('disabled');
	}).fail(function (err) {
		console.log(err);
	})
}

//# sourceURL=js/pages.js