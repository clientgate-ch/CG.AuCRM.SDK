/**
 * QueryExecutor - Orchestrates query execution with parsing and grouping
 * Combines QueryBuilder + QueryParser for end-to-end entity query workflow
 * Shared utility in frontend extensions
 */

import { QueryBuilder } from './QueryBuilder';
import { QueryParser } from './QueryParser';
import type {
  EntityQueryRequest,
  EntityQueryResponse,
  CRMRow,
  EntityHierarchyConfig,
  QueryExecutorOptions,
} from '../types/EntityQuery';

export class QueryExecutor {
  /**
   * Execute an entity query with full parsing and grouping
   * @param request - EntityQueryRequest with UQL config
   * @param queryExecuteFn - Function that executes the CRM query (returns promise)
   * @param options - Execution options (link context, lookup scope, etc.)
   * @returns Parsed and grouped entity query response
   */
  static async executeEntityQuery(
    request: EntityQueryRequest,
    queryExecuteFn: (queryCommand: any) => Promise<any>,
    options: QueryExecutorOptions = {}
  ): Promise<EntityQueryResponse> {
    // Create query command-like object
    const queryCommand = {
      statement: request.statement,
      link: options.link || request.link || null,
    };

    // Execute the query
    const rawResult = await queryExecuteFn(queryCommand);

    // Parse rows from result
    const rows = QueryParser.parseQueryResult(rawResult);

    // Initialize response
    const response: EntityQueryResponse = {
      rows,
      entities: new Map(),
      groupedBy: request.groupByKey || null,
      totalCount: rows.length,
      toJSON() {
        return {
          rows: this.rows,
          entities: Array.from(this.entities.entries()).map(([key, entity]) => ({
            groupKey: key,
            entity,
          })),
          groupedBy: this.groupedBy,
          totalCount: this.totalCount,
        };
      },
    };

    // If no grouping key, return raw rows
    if (!request.groupByKey) {
      return response;
    }

    // Group rows by key
    const groupedRows = QueryParser.groupRowsByKey(rows, request.groupByKey);

    // Store grouped entities in response
    for (const [groupKey, rowsForGroup] of groupedRows) {
      const normalizedRows = rowsForGroup.map(row => QueryParser.normalizeRow(row));

      // For now, store normalized rows as entities
      // Caller can further process using buildEntityHierarchy if needed
      response.entities.set(groupKey, {
        groupKey,
        rowCount: rowsForGroup.length,
        normalizedRows,
      });
    }

    return response;
  }

  /**
   * Execute a capability query (common pattern: C079 with C081 children)
   * Builds full hierarchy with parent capability and child properties
   * @param request - EntityQueryRequest
   * @param queryExecuteFn - CRM query executor function
   * @param options - Execution options
   * @returns Response with capabilities and property records
   */
  static async executeCapabilityQuery(
    request: EntityQueryRequest,
    queryExecuteFn: (queryCommand: any) => Promise<any>,
    options: QueryExecutorOptions = {}
  ): Promise<
    EntityQueryResponse<{
      capabilityRecord: any;
      propertyRecords: any[];
    }>
  > {
    // Execute base query
    const baseResponse = await this.executeEntityQuery(request, queryExecuteFn, options);

    // Build capability hierarchy
    const capabilityResponse: EntityQueryResponse<{
      capabilityRecord: any;
      propertyRecords: any[];
    }> = {
      rows: baseResponse.rows,
      entities: new Map(),
      groupedBy: baseResponse.groupedBy,
      totalCount: baseResponse.totalCount,
      toJSON() {
        return {
          rows: this.rows,
          entities: Array.from(this.entities.entries()).map(([key, entity]) => ({
            groupKey: key,
            entity,
          })),
          groupedBy: this.groupedBy,
          totalCount: this.totalCount,
        };
      },
    };

    if (!request.groupByKey) {
      return capabilityResponse;
    }

    // Re-group for hierarchy building
    const groupedRows = QueryParser.groupRowsByKey(baseResponse.rows, request.groupByKey);

    // Build hierarchy for each capability
    for (const [capabilityId, rowsForCapability] of groupedRows) {
      const hierarchyConfig: EntityHierarchyConfig = {
        parentEntity: 'C079',
        childEntity: 'C081',
        includeGetMethod: false, // Use plain objects (Option B)
      };

      const hierarchy = QueryParser.buildEntityHierarchy(rowsForCapability, hierarchyConfig);

      capabilityResponse.entities.set(capabilityId, {
        capabilityRecord: hierarchy.C079 || {},
        propertyRecords: hierarchy.C081 || [],
      });
    }

    return capabilityResponse;
  }

  /**
   * Create a standard capability query builder
   * Shortcut for common C079→C081 pattern
   * @returns Preconfigured QueryBuilder
   */
  static createCapabilityQueryBuilder(): QueryBuilder {
    return new QueryBuilder('C082')
      .select(
        'C079.CapabilityType',
        'C079.Description',
        'C079.DisplayName',
        'C079.ID',
        'C079.ToolType',
        'C079.ToolImplementation'
      )
      .join('C079', null, [
        'C079.CapabilityType',
        'C079.Description',
        'C079.DisplayName',
        'C079.ID',
        'C079.ToolType',
        'C079.ToolImplementation',
      ])
      .join('C080', 300, ['C080.ParamType'])
      .join('C081', 300, [
        'C081.PropertyKey',
        'C081.PropertyType',
        'C081.PropertyDescription',
      ])
      .groupBy('C079.ID');
  }
}
