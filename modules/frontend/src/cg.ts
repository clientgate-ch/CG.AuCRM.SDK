import { QueryBuilder as QueryBuilderClass } from './extensions/QueryBuilder';
import { QueryParser as QueryParserClass } from './extensions/QueryParser';
import { QueryExecutor as QueryExecutorClass } from './extensions/QueryExecutor';
import * as Crud from './extensions/Crud';
import * as Queries from './extensions/Queries';

export namespace CG {
	export function helloWorld() {
		alert("Hello World");
	}

	export const QueryBuilder = QueryBuilderClass;
	export const QueryParser = QueryParserClass;
	export const QueryExecutor = QueryExecutorClass;

	// CRUD Operations
	export const read = Crud.read;
	export const create = Crud.create;
	export const update = Crud.update;
	export const executeBatch = Crud.executeBatch;
	export const readLink = Crud.readLink;

	// Query Operations
	export const executeQuery = Queries.executeQuery;
}

export default CG;

// Make CG available globally in browser
if (typeof window !== 'undefined') {
	(window as any).CG = CG;
} else if (typeof global !== 'undefined') {
	(global as any).CG = CG;
}

import "./cg.module.json";