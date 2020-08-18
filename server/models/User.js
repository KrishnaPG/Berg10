/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
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
		return db.userColl.firstExample({ [db.idField]: id }).then(user => cb(null, makeInstance(user))).catch(ex => {
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

function createUser(user, { appCtx = db.defaults.appCtx } = {}) {
	return db.beginTransaction({ read: [], write: [db.userColl, db.membershipEdges, db.resGroupColl, db.userDefaultRG] }).then(trx => { 
		return trx.run(() => db.userColl.save(user))
			.then(userRecord => {
				const t = new Date();
				// add user to "Everyone" user-group
				const p1 = trx.run(() => db.membershipEdges.save({ t }, userRecord[db.idField], db.builtIn.userGroups.Everyone));
				// create a default resource-group for the user, and assign 
				const p2 = trx.run(() => db.resGroupColl.save({
					[db.keyField]: `rg-u${userRecord[db.keyField]}-${appCtx}`,
					name: "default",
					description: `Default Resource Group for the user [${userRecord[db.idField]}] under appCtx [${appCtx}]`
				}))
					.then(resGroup => trx.run(() =>
						db.userDefaultRG.save({ t, appCtx }, userRecord[db.idField], resGroup[db.idField])
					));
				return Promise.all([p1, p2]);
			})
			.then(() => trx.commit())
			.catch(ex => trx.abort().finally(() => { throw new Error(`createUser failed with error: ${ex.message}`); }));
	});
	// if we have to add to `LoginUsers` group we need AppCtx, since group memberships are context sensitive
}

function saveUser(user, cb) {
	return User.hashPassword(user)
		.then(user => user[db.idField] ? db.userColl.update({ [db.idField]: user[db.idField] }, user) : createUser(user))
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