/**
 * QueryBuilder - Fluent API for constructing entity queries
 * Supports arbitrary join depth and configurable grouping
 * Shared utility in frontend extensions
 */

import type {
  EntityQueryRequest,
  QueryJoin,
} from '../types/EntityQuery';

export class QueryBuilder {
  private rootEntity: string;
  private selectedFields: string[] = [];
  private joins: QueryJoin[] = [];
  private groupByKeyField: string | null = null;

  /**
   * Create a new QueryBuilder for a root entity
   * @param rootEntity - Root CRM entity code (e.g., 'C082')
   */
  constructor(rootEntity: string = 'C082') {
    this.rootEntity = rootEntity;
  }

  /**
   * Select fields from the root entity
   * @param fields - Field names in format 'ENTITY.Field' (e.g., 'C079.ID')
   * @returns Self for chaining
   */
  select(...fields: string[]): this {
    this.selectedFields.push(...fields.filter(f => typeof f === 'string' && f.trim().length > 0));
    return this;
  }

  /**
   * Add a join to the query
   * @param entity - Entity code to join (e.g., 'C079')
   * @param linkNum - Optional link number for the join
   * @param fields - Fields to select from this entity
   * @returns Self for chaining
   */
  join(entity: string, linkNum?: number | null, fields: string[] = []): this {
    if (typeof entity !== 'string' || entity.trim().length === 0) {
      throw new Error('Entity code must be a non-empty string');
    }

    const filteredFields = fields.filter(f => typeof f === 'string' && f.trim().length > 0);

    this.joins.push({
      entity: entity.trim(),
      linkNum: linkNum ?? null,
      fields: filteredFields,
    });

    return this;
  }

  /**
   * Set the grouping key for entity hierarchy
   * @param keyField - Field path in format 'ENTITY.Field' (e.g., 'C079.ID')
   * @returns Self for chaining
   */
  groupBy(keyField: string | null): this {
    if (keyField !== null && (typeof keyField !== 'string' || keyField.trim().length === 0)) {
      throw new Error('Group key must be a non-empty string or null');
    }
    this.groupByKeyField = keyField ? keyField.trim() : null;
    return this;
  }

  /**
   * Build the EntityQueryRequest with constructed UQL and configuration
   * @returns EntityQueryRequest ready for execution
   */
  build(): EntityQueryRequest {
    // Construct SELECT clause
    const selectList = [...this.selectedFields];
    for (const j of this.joins) {
      selectList.push(...j.fields);
    }

    if (selectList.length === 0) {
      throw new Error('At least one field must be selected before building the query');
    }

    // Construct FROM and WITH clauses
    let uql = `select (${selectList.join(', ')})\nfrom (${this.rootEntity})`;

    for (const j of this.joins) {
      uql += `\nwith (${j.entity})`;
      if (j.linkNum !== null && j.linkNum !== undefined) {
        uql += ` using link ${j.linkNum}`;
      }
    }

    return {
      statement: uql,
      link: null,
      groupByKey: this.groupByKeyField,
      joins: [...this.joins],
      selectedFields: [...this.selectedFields],
    };
  }

  /**
   * Create a QueryBuilder from an existing EntityQueryRequest
   * @param req - Existing request to reconstruct from
   * @returns New QueryBuilder instance
   */
  static fromRequest(req: EntityQueryRequest): QueryBuilder {
    const builder = new QueryBuilder();
    builder.rootEntity = 'C082'; // Inferred from standard pattern
    builder.selectedFields = [...(req.selectedFields || [])];
    builder.joins = [...(req.joins || [])];
    builder.groupByKeyField = req.groupByKey || null;
    return builder;
  }

  /**
   * Get the current root entity
   */
  getRootEntity(): string {
    return this.rootEntity;
  }

  /**
   * Get the current selected fields
   */
  getSelectedFields(): string[] {
    return [...this.selectedFields];
  }

  /**
   * Get the current joins configuration
   */
  getJoins(): QueryJoin[] {
    return JSON.parse(JSON.stringify(this.joins)); // Deep copy
  }

  /**
   * Get the current group by key
   */
  getGroupByKey(): string | null {
    return this.groupByKeyField;
  }
}
