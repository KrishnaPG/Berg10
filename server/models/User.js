/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./db');

class User {
	constructor(u) { 
		Object.assign(this, { tokens: [], profile:{} }, u);
	}
	static findOne(query, cb = (err, existingUser) => {}) {
		return db.userColl.firstExample(query).then(user => cb(null, makeInstance(user))).catch(ex => {
			if (ex.code == 404) return cb(null, null);
			cb(ex);
		});
	}
	static findById(id, cb = (err, user) => { }) { //TODO: implement caching - this is a high frequency call
		return db.userColl.firstExample({ [config.db.idField]: id }).then(user => cb(null, makeInstance(user))).catch(ex => {
			if (ex.code == 404) return cb(null, null);
			cb(ex);
		});
	}
	static hashPassword(user) {
		if (!user.password) return Promise.resolve(user);
		return new Promise((resolve, reject) => {
			bcrypt.genSalt(10, (err, salt) => {
				if (err) { return reject(err); }
				bcrypt.hash(user.password, salt, (err, hash) => {
					if (err) { return reject(err); }
					user.password = hash;
					resolve(user);
				});
			});
		});
	}
	save(cb = (err, user) => { }) {
		return saveUser(this, cb);
	}
};

function saveUser(user, cb) {
	return User.hashPassword(user)
		.then(user => user[config.db.idField] ? db.userColl.update({ [config.db.idField]: user[config.db.idField] }, user) : db.userColl.save(user))
		.then(_result => cb(null))
		.catch(ex => cb(ex));
}

function makeInstance(user) {
	user.save = function (cb = err => { }) { return saveUser(this, cb); }
	user.comparePassword = function(candidatePassword, cb) {
		bcrypt.compare(candidatePassword, this.password, cb);
	}
	user.gravatar = function(size) {
		if (!size) {
			size = 200;
		}
		if (!this.email) {
			return `https://gravatar.com/avatar/?s=${size}&d=retro`;
		}
		const md5 = crypto.createHash('md5').update(this.email).digest('hex');
		return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
	}
	return user;
}
	
module.exports = User;