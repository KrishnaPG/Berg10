/* Copyright (C) 2015. Cenacle Research India Private Limited
 */

globals.filetreeEvents = {
	"FILE_SELECTED": "evfileSelected",	// raised when a file item is clicked in the file tree
	"DIR_SELECTED": "evDirSelected",	// raised when a folder item is clicked in the file tree
};
 
$(document).ready(function () {
	$('#fileTreeContainer').fileTree({
		expandSpeed: 100,
		collapseSpeed: 100,
		expandEasing: 'swing',
		collapseEasing: 'swing',
		multiSelect: true,
		script: function (treeInfo) {
			return unifileAction("ls", treeInfo.dir);
		},
		errorFn: function ($el, err) {
			$el.append("<ul class='jqueryFileTree'><li class='error'>" + err.statusText + "</li></ul>");
		}
	}, function (selectedFile) {
		//globals.ee.trigger(globals.filetreeEvents.FILE_SELECTED, [selectedFile]);
	})
	//.on('filetreeexpanded', function (e, data) {
	//	$('#website-crud li.header span').text(data.value);
	//	globals.ee.trigger(globals.filetreeEvents.DIR_SELECTED, [data]);
	//})
	//.on('filetreecollapsed', function (e, data) {
	//	globals.ee.trigger(globals.filetreeEvents.DIR_SELECTED, [data]);
	//})
});


/* Helper functions */
function getFilePathExtension(path)
{
	// Ref: http://benohead.com/getting-a-file-extension-with-javascript/
	var filename = path.split('\\').pop().split('/').pop();
	return filename.substr((Math.max(0, filename.lastIndexOf(".")) || Infinity) + 1);
}

/**
 * @param path should end with /
 */
function jsonToTree(jsonArr, path) {
	return "<ul class='jqueryFileTree'  style='display: none;'>" +
	_.map(jsonArr, function (obj) {
		var type = obj.is_dir ? "directory " : "file ";
		var ext = obj.is_dir ? "collapsed" : "ext_" + getFilePathExtension(obj.name);
		var rel = path + (obj.is_dir ? (obj.name + "/") : obj.name); // directories shoudl end with /
		return "<li class='" + type + ext + "'><a href='#' rel='" + rel + "'>" + obj.name + "</a></li>";
	}).join('\n') +	"</ul>";
}
//# sourceURL=js/filetree.js