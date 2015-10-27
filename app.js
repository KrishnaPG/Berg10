﻿#!/usr/bin/env node

var http = require('http');
var _ = require('lodash');
var unifile = require('unifile');
var express = require('express');
var compress = require('compression');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var FSStore = require('connect-fs2')(session);
var multer = require('multer');

// init express
var app = express();

// config
var options = unifile.defaultConfig;
options.www.USERS = { "admin": "admin" }; // define users (login/password) wich will be authorized to access the www folder (read and write)
options.www.ROOT = __dirname + "/ui/";
options.staticFolders.push({ name: "/",	path: __dirname + "/ui/" });

//// parse data for file upload
// app.use(options.apiRoot, multer({ dest: 'uploads/', limits: { fileSize: 1024 * 2014 } })); // 1mb max file upload size

// compress all requests
app.use(compress());

// parse data for post and get requests
app.use(options.apiRoot, bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(options.apiRoot, bodyParser.json({ limit: '1mb' }));

// session management: cookie-parser comes *before* session options
app.use(options.apiRoot, cookieParser());
app.use(options.apiRoot, session({
	name: 'Berg10.unifile.sid',
	store: new FSStore({dir: './sessions', beautify: false}),
	secret: options.sessionSecret,
	resave: false,
	saveUninitialized: false,
	cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// use unifile as a middleware
app.use(options.apiRoot, unifile.middleware(express, app, options));

// server 'loop'
app.listen(8001, function () {
	console.log('Listening on 8001');
});

// catch all errors and prevent nodejs to crash, production mode
process.on('uncaughtException', function (err) {
	console.log('---------------------');
	console.error('---------------------', 'Caught exception: ', err, '---------------------');
	console.log('---------------------');
});

/*
var http = require('http');
var _ = require('lodash');
var express = require('express');

var fs = require('fs');
var path = require('path');
var util = require('util');

var config = require('config');
var config_port = config.get('server.port');
var config_host = config.get('server.host');
var config_exclude_pattern = new RegExp(config.get("files.exclude_pattern"));

var app = express();
var dir = process.cwd();
app.use(express.static(dir)); //app public directory
app.use(express.static(__dirname)); //module directory

// find a free port to launch the server
var portfinder = require('portfinder');
portfinder.getPort({ port: config_port, host: config_host }, function (err, freePort) {
	// start the server
	var server = http.createServer(app);
	server.listen(freePort, config_host, function () {
		var connected_address = server.address();
		var url = "http://" + (connected_address.address === "0.0.0.0" ? "localhost":connected_address.address) + ":" + connected_address.port;
		console.log("Server running...\n\nPlease visit this link in your browser: " + url + "\n");
		// launch a browser automatically
		var opener = require('opener');
		opener(url);
	});
});

// serve the files 
app.get('/files', function (req, res) {	
	
	var currentDir = dir;
	var query = req.query.path || '';
	if (query) currentDir = path.join(dir, query);
	
	fs.readdir(currentDir, function (err, files) {
		if (err) {
			res.status(500).send({ error: err });
			return;
		}
		var data = [];
		files.filter(function (file) {
			return !config_exclude_pattern.test(file);
		}).forEach(function (file) {
			try {
				var fstat = fs.statSync(path.join(currentDir, file));				
				fstat.name = file;
				fstat.path = path.join(query, file);
				fstat.isDir = fstat.isDirectory();				
				if (!fstat.isDir) {
					fstat.ext = path.extname(file);
				}
				data.push(fstat);
			} catch (e) {
				console.log(e);
			}        
		});		
		res.json(data);
	});
});

app.get('/', function (req, res) {
	res.redirect('/ui/');
});
*/