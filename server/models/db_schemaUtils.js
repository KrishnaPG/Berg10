const Merge = require('lodash.merge')

const $extends = (...args) => Merge({}, ...args);

const firstName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });
const lastName = () => ({ type: "string", max: 64, nullable: false, default: "", index: true });

const pk = (type = "uuid") => ({ type, nullable: false, unique: false, primaryKey: true, index: true });
const unique_pk = (type = "uuid") => ({ type, nullable: false, unique: true, primaryKey: true, index: true });
const fk = (foreignKey, relation = "ManyToOne") => ({ type: "fk", foreignKey, relation });

const namedEntity = Object.freeze({
	firstName: firstName,
	lastName: lastName
});
const autoInc = Object.freeze({
	id: { type: "increments", nullable: false, primaryKey: true, index: true }	// no need to set unique
});
const idCol = Object.freeze({
	id: unique_pk(),
	mtlId: { type: "string", max: 48, index: true, nullable: true }
});
const idHashCol = Object.freeze({
	id: { type: "string", max: 48, primaryKey: true, index: true, unique: true, nullable: false },
	mtlId: { type: "string", max: 48, index: true, nullable: true }
});
const trackModify = Object.freeze({
	createdAt: "dateTime",
	modifiedAt: "dateTime"
});
const timeBound = $extends(trackModify, {
	expiresAt: "dateTime",
	status: ["Not Started", "Postponed", "InProgress", "Cancelled", "Completed"]
});

module.exports = {
	builtIns: { namedEntity, autoInc, idCol, idHashCol, trackModify, timeBound, pk, unique_pk, fk },
	$extends	
}