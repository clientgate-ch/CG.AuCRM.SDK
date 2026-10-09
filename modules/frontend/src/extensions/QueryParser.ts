/**
 * QueryParser - Parses and normalizes CRM query results
 * Handles both nested and flat row formats
 * Supports entity grouping and hierarchy building
 * Shared utility in frontend extensions
 */

import type {
  CRMRow,
  GroupedRows,
  EntityHierarchy,
  NormalizedRow,
  QueryParserOptions,
  EntityHierarchyConfig,
} from '../types/EntityQuery';

export class QueryParser {
  /**
   * Normalize a single row from various CRM formats
   * Converts flat dot-notation to nested structure
   * @param row - Raw row from CRM (nested or flat format)
   * @returns Normalized row with nested entity structure
   */
  static normalizeRow(row: CRMRow): NormalizedRow {
    const normalized: NormalizedRow = {};

    for (const [key, value] of Object.entries(row)) {
      if (key.includes('.')) {
        // Flat notation: "C079.ID" → { C079: { ID: value } }
        const parts = key.split('.');
        const entity = parts[0];
        const field = parts.slice(1).join('.'); // Handle nested field names

        if (!normalized[entity]) {
          normalized[entity] = {};
        }

        // Set value, preserving null/undefined
        normalized[entity][field] = value;
      } else {
        // Already nested or primitive field
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Already nested object
          normalized[key] = value;
        } else {
          // Primitive or array - store as-is
          if (!normalized[key]) {
            normalized[key] = {};
          }
          normalized[key] = value;
        }
      }
    }

    return normalized;
  }

  /**
   * Extract rows from various CRM result formats
   * @param result - Raw CRM query result
   * @returns Array of rows
   */
  static parseQueryResult(result: any): CRMRow[] {
    // Try various result structures
    if (Array.isArray(result?.rows)) {
      return result.rows;
    }

    if (Array.isArray(result?.result?.rows)) {
      return result.result.rows;
    }

    if (Array.isArray(result?.resultSet?.rows)) {
      return result.resultSet.rows;
    }

    if (Array.isArray(result?.resultSet)) {
      return result.resultSet;
    }

    if (Array.isArray(result)) {
      return result;
    }

    console.warn('QueryParser: Could not extract rows from result', {
      type: result?.constructor?.name,
      keys: Object.keys(result || {}),
    });

    return [];
  }

  /**
   * Build an entity record from a normalized row entity
   * Optionally includes a .get() method for backward compatibility
   * @param normalizedRowEntity - Entity object from normalized row
   * @param includeGetMethod - Whether to add .get() accessor method
   * @returns Plain object record
   */
  static buildEntityRecord(normalizedRowEntity: any, includeGetMethod: boolean = false): any {
    const record = { ...normalizedRowEntity };

    if (includeGetMethod) {
      record.get = (fieldName: string) => record[fieldName] ?? null;
    }

    return record;
  }

  /**
   * Group normalized rows by a composite key
   * @param rows - Array of raw CRM rows
   * @param keyField - Key path in format 'ENTITY.Field' (e.g., 'C079.ID')
   * @returns Map of grouped rows by key value
   */
  static groupRowsByKey(rows: CRMRow[], keyField: string): Map<string, CRMRow[]> {
    const grouped = new Map<string, CRMRow[]>();

    // Parse key field
    const [entity, field] = keyField.split('.');
    if (!entity || !field) {
      throw new Error(`Invalid key field format: "${keyField}". Expected format: "ENTITY.Field"`);
    }

    for (const row of rows) {
      const normalized = this.normalizeRow(row);
      const groupKey = normalized[entity]?.[field];

      if (!groupKey) {
        // Skip rows without the grouping key
        continue;
      }

      const groupKeyStr = String(groupKey);

      if (!grouped.has(groupKeyStr)) {
        grouped.set(groupKeyStr, []);
      }

      grouped.get(groupKeyStr)!.push(row);
    }

    return grouped;
  }

  /**
   * Build entity hierarchy from grouped rows
   * Extracts parent entity (first row only) and child entities (all rows)
   * @param groupedRows - Array of rows for a single entity group
   * @param config - Configuration with parent/child entity codes
   * @returns Entity hierarchy object
   */
  static buildEntityHierarchy(
    groupedRows: CRMRow[],
    config: EntityHierarchyConfig
  ): EntityHierarchy {
    const { parentEntity, childEntity, includeGetMethod = false } = config;

    const hierarchy: EntityHierarchy = {
      [parentEntity]: {},
      [childEntity]: [],
    };

    for (const row of groupedRows) {
      const normalized = this.normalizeRow(row);

      // Extract parent entity (only from first row to avoid duplicates)
      if (Object.keys(hierarchy[parentEntity]).length === 0 && normalized[parentEntity]) {
        hierarchy[parentEntity] = this.buildEntityRecord(
          normalized[parentEntity],
          includeGetMethod
        );
      }

      // Extract child entities (all unique instances)
      if (normalized[childEntity] && Object.keys(normalized[childEntity]).length > 0) {
        const childRecord = this.buildEntityRecord(normalized[childEntity], includeGetMethod);

        // Avoid duplicates based on a unique key if available
        const childKey = childRecord.id || childRecord.ID || childRecord.PropertyKey || JSON.stringify(childRecord);
        const exists = (hierarchy[childEntity] as any[]).some(
          existing =>
            JSON.stringify(existing) === JSON.stringify(childRecord)
        );

        if (!exists) {
          (hierarchy[childEntity] as any[]).push(childRecord);
        }
      }
    }

    return hierarchy;
  }

  /**
   * Extract values from a field array structure
   * Used for BusinessObject-like responses
   * @param fieldArray - Array of { field, value } pairs
   * @param fieldName - Name of field to extract
   * @returns Field value or null
   */
  static extractFieldValue(fieldArray: Array<{ field: string; value: any }>, fieldName: string): any {
    if (!Array.isArray(fieldArray)) {
      return null;
    }

    const pair = fieldArray.find(p => p.field === fieldName);
    return pair?.value ?? null;
  }

  /**
   * Validate that a normalized row has all required fields
   * @param normalized - Normalized row
   * @param entity - Entity code to check
   * @param requiredFields - Fields that must be present and non-empty
   * @returns true if all required fields are present
   */
  static hasRequiredFields(normalized: NormalizedRow, entity: string, requiredFields: string[]): boolean {
    if (!normalized[entity]) {
      return false;
    }

    return requiredFields.every(field => {
      const value = normalized[entity][field];
      return value !== null && value !== undefined && String(value).trim().length > 0;
    });
  }
}
