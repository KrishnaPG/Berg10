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
	save(cb) {
		return saveUser(this, cb);
	}

	static find(currentUserId, { filter, limit = 20, offset = 0, sort = {} }) {
		const ugAdminId = `${}`
		const filterExpr = AQL.literal("");//Typedef.convertFilter(filter));
		//const sortExpr = AQL.literal(`SORT r.${sort} ${desc ? "DESC" : "ASC"}`);
		return db.query(AQL`
				// check if user is member of ug-Admin group
				LET ug = (
						FOR mem IN \`${db.collName.memberOf}\`
						FILTER mem._from == \'${currentUserId}\' && mem._to == \'${builtIn.userGroups.Admin}\' && mem.ugCtx in [null, @ugCtx]
						LIMIT 1
						RETURN mem._to
				)
				
				LET isAdmin = LENGTH(ug) > 0
				
				LET u = (
						FOR u IN `users`
						FILTER isAdmin || u._id == @userId
						LIMIT 0, 10
						RETURN u
				)
				
				RETURN { users: u,  isAdmin }
		`).then(cursor => cursor.all());

		/* Ref: https://www.arangodb.com/docs/stable/drivers/js-reference-aql.html
				FOR u IN `users`
				FILTER u.active == true AND u.gender == "f"
				SORT u["age"] ASC
				LIMIT 5
				RETURN u
		*/
	}	
};

function createUser(user, { appCtx = db.defaults.appCtx } = {}) {
	return db.userColl.save(user)
		.then(userRecord => {
			const t = new Date();
			// add user to "Everyone" user-group
			const p1 = db.membershipEdges.save({ t }, userRecord[db.idField], db.builtIn.userGroups.Everyone);
			// create a default resource-group for the user 
			const p2 = db.resGroupColl.save({
				[db.keyField]: `rg-u${userRecord[db.keyField]}-${appCtx}`,
				name: "default",
				description: `Default Resource Group for the user [${userRecord[db.idField]}] under appCtx [${appCtx}]`
			}).then(resGroup =>
				// assign the defaultRG to the user under the current appCtx
				db.userDefaultRG.save({ t, appCtx }, userRecord[db.idField], resGroup[db.idField])
			);
			return Promise.all([p1, p2]).then(() => userRecord);
		});
	// if we have to add to `LoginUsers` group we need AppCtx, since group memberships are context sensitive
}

function saveUser(user, cb) {
	return User.hashPassword(user)
		.then(user => {
			// if user already exists, just update the record
			if (user[db.idField]) {
				return db.userColl.update({ [db.idField]: user[db.idField] }, user)
					.then(() => { if(cb) cb(null, user); return user; })
			}
			// else create new user record
			return createUser(user)
				.then(userRecord => {
					Object.assign(user, userRecord);	// assign any ids the database might have sent
					if(cb) cb(null, user);
					return user;
				})
		}).catch(ex => {
			if (!cb) throw new Error(`[${user.email}] unable to save the record: ${ex.message}`);
			cb(ex);
		});
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