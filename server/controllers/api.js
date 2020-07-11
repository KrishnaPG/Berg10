/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const Utils = require('../auth/utils');

const AllowedOrigins = config.cors.allowedOrigins.map(el => Utils.wildcardToRegExp(el)); // pre-bake to regExps

exports.getUser = (req, res, next) => {
  const allowed = AllowedOrigins.some(regEx => req.headers.origin.match(regEx));
  if (!allowed) return res.sendStatus(403);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  req.isAuthenticated() ? res.send({ sessionID: req.sessionID, user: req.user }) : res.sendStatus(401);
};

exports.logout = (req, res, next) => {
  const allowed = AllowedOrigins.some(regEx => req.headers.origin.match(regEx));
  if (!allowed) return res.sendStatus(403);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  req.logout();
  res.clearCookie(config.session.name);
  req.session.destroy(err => {
    req.user = null;
    err ? res.send(err) : res.send({ result: "success" });
  });
};



/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
  res.render('api/index', {
    title: 'API Examples'
  });
};

/**
 * GET /api/upload
 * File Upload API example.
 */

exports.getFileUpload = (req, res) => {
  res.render('api/upload', {
    title: 'File Upload'
  });
};

exports.postFileUpload = (req, res) => {
  req.flash('success', { msg: 'File was uploaded successfully.' });
  res.redirect('/api/upload');
};
