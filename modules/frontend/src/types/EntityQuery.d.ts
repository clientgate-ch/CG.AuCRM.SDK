/**
 * EntityQuery Type Definitions
 * Shared contracts for querying CRM entities with fluent API
 */

/**
 * Represents a single join in the query hierarchy
 */
export interface QueryJoin {
  entity: string;
  linkNum?: number | null;
  fields: string[];
}

/**
 * Request contract for entity query execution
 */
export interface EntityQueryRequest {
  statement: string;
  link?: any | null;
  groupByKey?: string | null;
  joins: QueryJoin[];
  selectedFields: string[];
}

/**
 * Represents a row in the raw CRM result (can be nested or flat)
 */
export interface CRMRow {
  [key: string]: any;
}

/**
 * Grouped rows by entity ID
 */
export interface GroupedRows {
  [groupKey: string]: CRMRow[];
}

/**
 * Entity hierarchy structure (e.g., capability with child properties)
 * Uses plain objects for JSON serialization
 */
export interface EntityHierarchy {
  [entityKey: string]: any;
}

/**
 * Response from entity query execution
 */
export interface EntityQueryResponse<T = any> {
  rows: CRMRow[];
  entities: Map<string, T>;
  groupedBy: string | null;
  totalCount: number;

  toJSON(): {
    rows: CRMRow[];
    entities: Array<{ groupKey: string; entity: T }>;
    groupedBy: string | null;
    totalCount: number;
  };
}

/**
 * Configuration for building entity hierarchy from grouped rows
 */
export interface EntityHierarchyConfig {
  parentEntity: string;
  childEntity: string;
  includeGetMethod?: boolean;
}

/**
 * Result from normalizing a row (converts flat to nested structure)
 */
export interface NormalizedRow {
  [entityCode: string]: {
    [fieldName: string]: any;
  };
}

/**
 * Parser options
 */
export interface QueryParserOptions {
  includeGetMethod?: boolean;
  excludeEmptyEntities?: boolean;
}

/**
 * Executor options for query execution
 */
export interface QueryExecutorOptions {
  link?: any;
  queryLookupScope?: string;
  maxRows?: number;
}
