/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const AQL = require('arangojs').aql;
const config = require('config');
const db = require('./db');

db.notifyChange = changeObj => console.log("change Object: ", changeObj);

class Typedef {

	static save(typeDef, cb) {
		return (typeDef._key ?
			db.typeDefColl.update({ [config.db.idField]: typeDef[config.db.idField] }, typeDef) :
			db.typeDefColl.save(typeDef))
			.then(_result => cb(null))
			.catch(ex => cb(ex));
	}	

	static count(filter) {
		const filterExpr = AQL.literal(Typedef.convertFilter(filter));
		return db.query(AQL`
			FOR r IN ${db.typeDefColl}
				${filterExpr}
				COLLECT WITH COUNT INTO length
			RETURN length
		`).then(cursor => cursor.next());
	}

	static find({ filter, limit = 20, offset = 0, sort = {} }) {
		const filterExpr = AQL.literal("");//Typedef.convertFilter(filter));
		//const sortExpr = AQL.literal(`SORT r.${sort} ${desc ? "DESC" : "ASC"}`);
		return db.query(AQL`
				FOR r IN ${db.typeDefColl}
				${filterExpr}
				LIMIT ${offset}, ${limit}
				RETURN r
		`).then(cursor => cursor.all());

		/* Ref: https://www.arangodb.com/docs/stable/drivers/js-reference-aql.html
				FOR u IN users
				FILTER u.active == true AND u.gender == "f"
				SORT u.age ASC
				LIMIT 5
				RETURN u
		*/
	}

	static findOne(query) {
		return Typedef.findByKey(query);
	}

	static findMany(keys) {
		return db.typeDefColl.lookupByKeys(query);
	}

	static findById(id) {
		return db.typeDefColl.firstExample(query);//{ [config.db.idField]: id }
	}

	static findByKey(query) {
		return db.typeDefColl.firstExample(query);//{ [config.db.keyField]: _key }
	}

	static create(params) {
		const parsedParams = Typedef.parseParams(params);
		return db.typeDefColl.save(parsedParams).then(result => {
			db.notifyChange({ op: 'Create', result });
			return result;
		});
	}

	static update(id, params) {
		const parsedParams = Typedef.parseParams(params);
		return db.typeDefColl.update({ [config.db.idField]: id }, parsedParams).then(result => {
			db.notifyChange({ op: 'Update', result });
			return result;
		});
	}

	static delete(id) {
		return db.typeDefColl.remove({ [config.db.idField]: id }).then(result => {
			db.notifyChange({ op: 'Delete', result });
			return result;
		});
	}

  /**
   * Check all params against values they hold. In case of wrong value it corrects it.
   *
   * What it does exactly:
   * - removes keys with empty strings for the `number`, `float` and 'reference' properties.
   *
   * @param   {Object}  params  received from AdminBro form
   *
   * @return  {Object}          converted params
   */
	static parseParams(params) {
		const parsedParams = { ...params };
		// Typedef.properties().forEach((property) => {
		// 	const value = parsedParams[property.name()]
		// 	if (['number', 'float', 'reference'].includes(property.type())) {
		// 		if (value === '') {
		// 			delete parsedParams[property.name()]
		// 		}
		// 	}
		// 	if (!property.isEditable()) {
		// 		delete parsedParams[property.name()]
		// 	}
		// })
		return parsedParams;
	}

	static convertFilter(filter) {
		if (!filter) {
			return "";
		}

		const { expr } = filter.reduce((memo, filterProperty) => {
			const { property, value } = filterProperty
			switch (property.type()) {
				case 'string':
					if (property.availableValues()) {
						return {
							expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] === "${escape(value)}"`,
							combiner: "&&"
						}
					}
					return {
						expr: `${memo.expr} ${memo.combiner} CONTAINS(r["${property.name()}"], "${escape(value)}")`,
						combiner: "&&"
					}
				case 'number':
					if (!Number.isNaN(Number(value))) {
						return {
							expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] === ${Number(value)}`,
							combiner: "&&"
						}
					}
					return memo
				case 'date':
				case 'datetime':
					if (value.from || value.to) {
						return {
							expr: `${memo.expr}` +
								(value.from ? ` ${memo.combiner} r["${property.name()}"] >= ${value.from}` : "") +
								(value.to ? ` ${memo.combiner} r["${property.name()}"] <= ${value.to}` : ""),
							combiner: "&&"
						}
					}
					break
				default:
					break
			}
			return {
				expr: `${memo.expr} ${memo.combiner} r["${property.name()}"] = ${value}`,
				combiner: "&&"
			}
		}, { expr: "", combiner: "" });

		return expr.length > 0 ? ("FILTER " + expr) : "";
	}

}

module.exports = Typedef;