/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
/*eslint-env node, es6 */
"use strict";

const base = require("./base")
const bundle = base.bundle

async function getHANAVersion(db) {
	base.debug(`getHANAVersion`)
	const statement = await db.preparePromisified(
		`SELECT *
                 FROM M_DATABASE`)
	const object = await db.statementExecPromisified(statement, [])
	if (object.length < 1) {
		throw new Error(bundle.getText("errMDB"))
	}
	object[0].versionMajor = object[0].VERSION.charAt(0)
	base.debug(`HANA Version ${JSON.stringify(object)}`)
	return object[0]
}
module.exports.getHANAVersion = getHANAVersion

async function getView(db, scheam, viewId) {
	base.debug(`getView ${scheam} ${viewId}`)
	//Select View
	let statementString = ``
	const vers = await await getHANAVersion(db)
	if (vers.versionMajor < 2) {
		statementString = `SELECT SCHEMA_NAME, VIEW_NAME, VIEW_OID, COMMENTS, IS_COLUMN_VIEW, VIEW_TYPE, HAS_STRUCTURED_PRIVILEGE_CHECK, HAS_CACHE
		FROM VIEWS 
		 WHERE SCHEMA_NAME LIKE ?
		   AND VIEW_NAME = ?`
	} else {
		statementString = `SELECT SCHEMA_NAME, VIEW_NAME, VIEW_OID, COMMENTS, IS_COLUMN_VIEW, VIEW_TYPE, HAS_STRUCTURED_PRIVILEGE_CHECK, HAS_PARAMETERS, HAS_CACHE, CREATE_TIME
		FROM VIEWS 
		 WHERE SCHEMA_NAME LIKE ?
		   AND VIEW_NAME = ?`
	}
	const statement = await db.preparePromisified(statementString)
	const object = await db.statementExecPromisified(statement, [scheam, viewId]);
	if (object.length < 1) {
		throw new Error(bundle.getText("errInput"));
	}
	return object;
}
module.exports.getView = getView;

async function getDef(db, schema, Id) {
	base.debug(`getDef ${schema} ${Id}`)
	//Select View
	var inputParams = {
		SCHEMA: `"${schema}"`,
		OBJECT: `"${Id}"`
	};
	let hdbext = require("@sap/hdbext");
	let sp = await db.loadProcedurePromisified(hdbext, "SYS", "GET_OBJECT_DEFINITION");
	let object = await db.callProcedurePromisified(sp, inputParams);
	if (object.length < 1) {
		throw new Error(bundle.getText("errObj"));
	}
	let output = object.results[0].OBJECT_CREATION_STATEMENT;
	output = output.toString();
	output = output.replace(new RegExp(" ,", "g"), ",\n");
	return output;
}
module.exports.getDef = getDef;

async function getViewFields(db, viewOid) {
	base.debug(`getViewFields ${viewOid}`)
	//Select Fields
	const statement = await db.preparePromisified(
		`SELECT SCHEMA_NAME, VIEW_NAME, VIEW_OID, COLUMN_NAME, POSITION, DATA_TYPE_NAME, OFFSET, LENGTH, SCALE, IS_NULLABLE, DEFAULT_VALUE, COLUMN_ID, COMMENTS
         FROM VIEW_COLUMNS 
				  WHERE VIEW_OID = ? ORDER BY POSITION`);
	const fields = await db.statementExecPromisified(statement, [viewOid]);
	return fields;
}
module.exports.getViewFields = getViewFields;

async function getTable(db, schema, tableId) {
	base.debug(`getTable ${schema} ${tableId}`)
	//Select Table
	let statementString = ``
	const vers = await await getHANAVersion(db)
	if (vers.versionMajor < 2) {
		statementString = `SELECT SCHEMA_NAME, TABLE_NAME, TABLE_OID, TABLE_TYPE, HAS_PRIMARY_KEY, UNLOAD_PRIORITY, IS_PRELOAD
		FROM TABLES 
		WHERE SCHEMA_NAME LIKE ?
		  AND TABLE_NAME = ?`
	} else {
		statementString = `SELECT SCHEMA_NAME, TABLE_NAME, TABLE_OID, TABLE_TYPE, HAS_PRIMARY_KEY, UNLOAD_PRIORITY, IS_PRELOAD, CREATE_TIME
		FROM TABLES 
		WHERE SCHEMA_NAME LIKE ?
		  AND TABLE_NAME = ?`
	}
	const statement = await db.preparePromisified(statementString)
	const object = await db.statementExecPromisified(statement, [schema, tableId]);
	if (object.length < 1) {
		throw new Error(bundle.getText("errTable"));
	}
	return object;
}
module.exports.getTable = getTable;

async function getTableFields(db, tableOid) {
	base.debug(`getTableFields ${tableOid}`)
	//Select Fields
	let statementString = ``
	const vers = await await getHANAVersion(db)
	if (vers.versionMajor < 2) {
		statementString =
			`SELECT SCHEMA_NAME, TABLE_NAME, TABLE_OID, COLUMN_NAME, POSITION, DATA_TYPE_NAME, OFFSET, LENGTH, SCALE, IS_NULLABLE, DEFAULT_VALUE, COLUMN_ID, COMMENTS
		FROM TABLE_COLUMNS 
				WHERE TABLE_OID = ? ORDER BY POSITION`
	} else {
		statementString =
			`SELECT SCHEMA_NAME, TABLE_NAME, TABLE_OID, COLUMN_NAME, POSITION, DATA_TYPE_NAME, OFFSET, LENGTH, SCALE, IS_NULLABLE, DEFAULT_VALUE, COLUMN_ID, COMMENTS
		FROM TABLE_COLUMNS 
				WHERE TABLE_OID = ? ORDER BY POSITION`
	}
	const statement = await db.preparePromisified(statementString)
	const fields = await db.statementExecPromisified(statement, [tableOid]);
	return fields;
}
module.exports.getTableFields = getTableFields;

async function getConstraints(db, object) {
	base.debug(`getConstraints ${JSON.stringify(object)}`)
	//Select Constraints
	const statement = await db.preparePromisified(
		`SELECT * from CONSTRAINTS 
	          WHERE SCHEMA_NAME LIKE ? 
	           AND TABLE_NAME = ? 
	           AND IS_PRIMARY_KEY = ? 
	         ORDER BY POSITION `
	);
	const constraints = await db.statementExecPromisified(statement, [object[0].SCHEMA_NAME, object[0].TABLE_NAME, "TRUE"]);
	return constraints;
}
module.exports.getConstraints = getConstraints;

async function getProcedure(db, schema, procedure) {
	base.debug(`getProcedure ${schema} ${procedure}`)
	//Select View
	let statementString = ``
	const vers = await await getHANAVersion(db)
	if (vers.versionMajor < 2) {
		statementString = `SELECT SCHEMA_NAME, PROCEDURE_NAME, PROCEDURE_OID, SQL_SECURITY, DEFAULT_SCHEMA_NAME,
		INPUT_PARAMETER_COUNT, OUTPUT_PARAMETER_COUNT, INOUT_PARAMETER_COUNT, RESULT_SET_COUNT,
		PROCEDURE_TYPE, READ_ONLY, IS_VALID, IS_HEADER_ONLY, OWNER_NAME
		FROM PROCEDURES 
		WHERE SCHEMA_NAME LIKE ?
		  AND PROCEDURE_NAME = ?`
	} else {
		statementString = `SELECT SCHEMA_NAME, PROCEDURE_NAME, PROCEDURE_OID, SQL_SECURITY, DEFAULT_SCHEMA_NAME,
		INPUT_PARAMETER_COUNT, OUTPUT_PARAMETER_COUNT, INOUT_PARAMETER_COUNT, RESULT_SET_COUNT,
		IS_ENCRYPTED, PROCEDURE_TYPE, READ_ONLY, IS_VALID, IS_HEADER_ONLY, OWNER_NAME, CREATE_TIME
		FROM PROCEDURES 
		WHERE SCHEMA_NAME LIKE ?
		  AND PROCEDURE_NAME = ?`
	}

	const statement = await db.preparePromisified(statementString)
	const object = await db.statementExecPromisified(statement, [schema, procedure]);
	if (object.length < 1) {
		throw new Error(bundle.getText("errProc"));
	}
	return object;
}
module.exports.getProcedure = getProcedure;

async function getProcedurePrams(db, procOid) {
	base.debug(`getProcedurePrams ${procOid}`)
	//Select Fields
	const statement = await db.preparePromisified(
		`SELECT PARAMETER_NAME, DATA_TYPE_NAME, LENGTH, SCALE, POSITION, TABLE_TYPE_NAME, PARAMETER_TYPE, HAS_DEFAULT_VALUE, IS_NULLABLE
          FROM PROCEDURE_PARAMETERS 
				  WHERE PROCEDURE_OID = ?
				  ORDER BY POSITION`);
	const fields = await db.statementExecPromisified(statement, [procOid]);
	return fields;
}
module.exports.getProcedurePrams = getProcedurePrams;

async function getProcedurePramCols(db, procOid) {
	base.debug(`getProcedurePramCols ${procOid}`)
	//Select Fields
	const statement = await db.preparePromisified(
		`SELECT PARAMETER_NAME, PARAMETER_POSITION, COLUMN_NAME, POSITION, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE 
          FROM PROCEDURE_PARAMETER_COLUMNS 
				  WHERE PROCEDURE_OID = ?
				  ORDER BY PARAMETER_POSITION, POSITION`);
	const fields = await db.statementExecPromisified(statement, [procOid]);
	return fields;
}
module.exports.getProcedurePramCols = getProcedurePramCols;

async function getFunction(db, schema, functionName) {
	base.debug(`getFunction ${schema} ${functionName}`)
	//Select Functions
	let statementString = ``
	const vers = await await getHANAVersion(db)
	if (vers.versionMajor < 2) {
		statementString = `SELECT SCHEMA_NAME, FUNCTION_NAME, FUNCTION_OID, SQL_SECURITY, DEFAULT_SCHEMA_NAME,
		INPUT_PARAMETER_COUNT, RETURN_VALUE_COUNT,
		FUNCTION_TYPE, FUNCTION_USAGE_TYPE, IS_VALID, IS_HEADER_ONLY, OWNER_NAME
		FROM FUNCTIONS 
		WHERE SCHEMA_NAME LIKE ?
		  AND FUNCTION_NAME = ?`
	} else {
		statementString = `SELECT SCHEMA_NAME, FUNCTION_NAME, FUNCTION_OID, SQL_SECURITY, DEFAULT_SCHEMA_NAME,
		INPUT_PARAMETER_COUNT, RETURN_VALUE_COUNT,
		IS_ENCRYPTED, FUNCTION_TYPE, FUNCTION_USAGE_TYPE, IS_VALID, IS_HEADER_ONLY, OWNER_NAME, CREATE_TIME
		FROM FUNCTIONS 
		WHERE SCHEMA_NAME LIKE ?
		  AND FUNCTION_NAME = ?`
	}

	const statement = await db.preparePromisified(statementString)
	const object = await db.statementExecPromisified(statement, [schema, functionName]);
	if (object.length < 1) {
		throw new Error(bundle.getText("errFunc"));
	}
	return object;
}
module.exports.getFunction = getFunction;

async function getFunctionPrams(db, funcOid) {
	base.debug(`getFunctionPrams ${funcOid}`)
	//Select Fields
	const statement = await db.preparePromisified(
		`SELECT PARAMETER_NAME, DATA_TYPE_NAME, LENGTH, SCALE, POSITION, TABLE_TYPE_NAME, PARAMETER_TYPE, HAS_DEFAULT_VALUE, IS_NULLABLE
          FROM FUNCTION_PARAMETERS 
				  WHERE FUNCTION_OID = ?
				  ORDER BY POSITION`);
	const fields = await db.statementExecPromisified(statement, [funcOid]);
	return fields;
}
module.exports.getFunctionPrams = getFunctionPrams;

async function getFunctionPramCols(db, funcOid) {
	base.debug(`getFunctionPramCols ${funcOid}`)
	//Select Fields
	const statement = await db.preparePromisified(
		`SELECT PARAMETER_NAME, PARAMETER_POSITION, COLUMN_NAME, POSITION, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE 
          FROM FUNCTION_PARAMETER_COLUMNS 
				  WHERE FUNCTION_OID = ?
				  ORDER BY PARAMETER_POSITION, POSITION`);
	const fields = await db.statementExecPromisified(statement, [funcOid]);
	return fields;
}
module.exports.getFunctionPramCols = getFunctionPramCols;

let useHanaTypes = false;

module.exports.options = { set useHanaTypes(use) { useHanaTypes = use } }

async function formatCDS(db, object, fields, constraints, type, parent) {
	base.debug(`formatCDS ${type}`)
	let cdstable = "";
	if (type === "view" || type === "table") {
		cdstable += "@cds.persistence.exists \n"
	}
	if (type === "view" || type === "hdbview") {
		object[0].VIEW_NAME = object[0].VIEW_NAME.replace(/\./g, "_");
		object[0].VIEW_NAME = object[0].VIEW_NAME.replace(/:/g, "");
		cdstable += `Entity ![${object[0].VIEW_NAME}] {\n `;
	} else {
		object[0].TABLE_NAME = object[0].TABLE_NAME.replace(/\./g, "_");
		cdstable += `Entity ![${object[0].TABLE_NAME}] {\n `;
	}

	var isKey = "FALSE";
	for (let field of fields) {

		isKey = "FALSE";
		if (type === "table" || type === "hdbtable") {
			if (object[0].HAS_PRIMARY_KEY === "TRUE") {
				for (let constraint of constraints) {
					if (field.COLUMN_NAME === constraint.COLUMN_NAME) {
						constraint.COLUMN_NAME = constraint.COLUMN_NAME.replace(/\./g, "_");
						cdstable += "key ";
						isKey = "TRUE";
					}
				}
			}
		} else {
			cdstable += "key ";
			isKey = "TRUE";
		}
		let xref = {};
		xref.before = field.COLUMN_NAME;
		field.COLUMN_NAME = field.COLUMN_NAME.replace(/\./g, "_");
		xref.after = field.COLUMN_NAME;

		cdstable += "\t";
		cdstable += `![${field.COLUMN_NAME}]` + ": ";
		if (useHanaTypes) {
			switch (field.DATA_TYPE_NAME) {
				case "NVARCHAR":
					cdstable += `String(${field.LENGTH})`;
					break;
				case "NCLOB":
					cdstable += "LargeString";
					break;
				case "VARBINARY":
					cdstable += `Binary(${field.LENGTH})`;
					break;
				case "BLOB":
					cdstable += "LargeBinary";
					break;
				case "INTEGER":
					cdstable += "Integer";
					break;
				case "BIGINT":
					cdstable += "Integer64";
					break;
				case "DECIMAL":
					cdstable += field.SCALE ? `Decimal(${field.LENGTH}, ${field.SCALE})` : `Decimal(${field.LENGTH})`;
					break;
				case "DOUBLE":
					cdstable += "Double";
					break;
				case "DATE":
					cdstable += "Date";
					break;
				case "TIME":
					cdstable += "Time";
					break;
				case "SECONDDATE":
					cdstable += "String";
					break;
				case "TIMESTAMP":
					if (parent === 'preview') {
						cdstable += "String";
					} else {
						cdstable += "Timestamp";
					}
					break;
				case "BOOLEAN":
					cdstable += "Boolean";
					break;
				// hana types
				case "SMALLINT":
				case "TINYINT":
				case "SMALLDECIMAL":
				case "REAL":
				case "CLOB":
					cdstable += `hana.${field.DATA_TYPE_NAME}`;
					break;
				case "CHAR":
				case "NCHAR":
				case "BINARY":
					cdstable += `hana.${field.DATA_TYPE_NAME}(${field.LENGTH})`;
					break;
				case "VARCHAR":
					cdstable += `hana.${field.DATA_TYPE_NAME}(${field.LENGTH})`;
					break;
				case "ST_POINT":
				case "ST_GEOMETRY":
					cdstable += `hana.${field.DATA_TYPE_NAME}(${await getGeoColumns(db, object[0], field, type)})`
					break
				default:
					cdstable += `**UNSUPPORTED TYPE - ${field.DATA_TYPE_NAME}`;
			}
		} else {
			switch (field.DATA_TYPE_NAME) {
				case "NVARCHAR":
					cdstable += `String(${field.LENGTH})`;
					break;
				case "NCLOB":
					cdstable += "LargeString";
					break;
				case "VARBINARY":
					cdstable += `Binary(${field.LENGTH})`;
					break;
				case "BLOB":
					cdstable += "LargeBinary";
					break;
				case "INTEGER":
					cdstable += "Integer";
					break;
				case "BIGINT":
					cdstable += "Integer64";
					break;
				case "DECIMAL":
					cdstable += field.SCALE ? `Decimal(${field.LENGTH}, ${field.SCALE})` : `Decimal(${field.LENGTH})`;
					break;
				case "DOUBLE":
					cdstable += "Double";
					break;
				case "DATE":
					cdstable += "Date";
					break;
				case "TIME":
					cdstable += "Time";
					break;
				case "SECONDDATE":
					cdstable += "String";
					break;
				case "TIMESTAMP":
					if (parent === 'preview') {
						cdstable += "String";
					} else {
						cdstable += "Timestamp";
					}
					break;
				case "BOOLEAN":
					cdstable += "Boolean";
					break;
				case "VARCHAR":
					// backward compatible change
					cdstable += `String(${field.LENGTH})`;
					break;
				default:
					cdstable += `**UNSUPPORTED TYPE - ${field.DATA_TYPE_NAME}`;
			}
		}

		xref.dataType = field.DATA_TYPE_NAME
		global.__xRef.push(xref);
		//	if (field.DEFAULT_VALUE) {
		//		cdstable += ` default "${field.DEFAULT_VALUE}"`;
		//	}

		if (field.IS_NULLABLE === "FALSE") {
			if (isKey === "FALSE") {
				cdstable += " not null";
			}
		} else {
			//	if (isKey === "FALSE") {
			//		cdstable += " null";
			//	}
		}
		if (field.COMMENTS) {
			cdstable += `  @title: '${field.COLUMN_NAME}: ${field.COMMENTS}' `
		} else {
			cdstable += `  @title: '${field.COLUMN_NAME}' `
		}
		cdstable += "; ";

		cdstable += "\n";
	}
	cdstable += "}\n";
	return cdstable;
}
module.exports.formatCDS = formatCDS;


async function getGeoColumns(db, object, field, type) {
	base.debug(`getGeoColumns`)
	const statementString = `SELECT SRS_ID FROM ST_GEOMETRY_COLUMNS WHERE SCHEMA_NAME = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`
	const statement = await db.preparePromisified(statementString)
	let name = ''
	if (type === "view") {
		name = object.VIEW_NAME
	} else {
		name = object.TABLE_NAME
	}

	const geoColumns = await db.statementExecPromisified(statement, [object.SCHEMA_NAME, name, field.COLUMN_NAME])
	return geoColumns[0].SRS_ID
}
module.exports.getGeoColumns = getGeoColumns