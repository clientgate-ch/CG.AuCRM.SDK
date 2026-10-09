/**
 * QueryBuilder & QueryExecutor Jest Tests
 * Uses mock data from browser test
 */

import { QueryBuilder } from '../src/extensions/QueryBuilder';
import { QueryParser } from '../src/extensions/QueryParser';
import { QueryExecutor } from '../src/extensions/QueryExecutor';
import {
  EntityQueryRequest,
  EntityQueryResponse,
  CRMRow,
} from '../src/types/EntityQuery';

// ============================================================================
// MOCK FIXTURES (from browser test output)
// ============================================================================

const mockCrmRows: CRMRow[] = [
  {
    'C079.CapabilityType': 'AgentTool',
    'C079.Description': 'Get user identity information',
    'C079.DisplayName': 'getUserIdentity',
    'C079.ID': 'CAP_001',
    'C079.ToolType': 'function',
    'C079.ToolImplementation': 'getUserIdentity',
    'C080.ParamType': 'required',
    'C081.PropertyKey': 'includeDetails',
    'C081.PropertyType': '2',
    'C081.PropertyDescription': 'Include user details',
  },
  {
    'C079.CapabilityType': 'AgentTool',
    'C079.Description': 'Get user identity information',
    'C079.DisplayName': 'getUserIdentity',
    'C079.ID': 'CAP_001',
    'C079.ToolType': 'function',
    'C079.ToolImplementation': 'getUserIdentity',
    'C080.ParamType': 'required',
    'C081.PropertyKey': 'format',
    'C081.PropertyType': '0',
    'C081.PropertyDescription': 'Response format (json/xml)',
  },
  {
    'C079.CapabilityType': 'AgentTool',
    'C079.Description': 'Query CRM records',
    'C079.DisplayName': 'crmQuery',
    'C079.ID': 'CAP_002',
    'C079.ToolType': 'function',
    'C079.ToolImplementation': 'crmQuery',
    'C080.ParamType': 'required',
    'C081.PropertyKey': 'queryName',
    'C081.PropertyType': '0',
    'C081.PropertyDescription': 'Name of the stored query',
  },
  {
    'C079.CapabilityType': 'AgentTool',
    'C079.Description': 'Query CRM records',
    'C079.DisplayName': 'crmQuery',
    'C079.ID': 'CAP_002',
    'C079.ToolType': 'function',
    'C079.ToolImplementation': 'crmQuery',
    'C080.ParamType': 'optional',
    'C081.PropertyKey': 'maxRows',
    'C081.PropertyType': '1',
    'C081.PropertyDescription': 'Max rows to return',
  },
];

const mockCapabilityFixture = {
  'CAP_001': {
    capabilityRecord: {
      CapabilityType: 'AgentTool',
      Description: 'Get user identity information',
      DisplayName: 'getUserIdentity',
      ID: 'CAP_001',
      ToolType: 'function',
      ToolImplementation: 'getUserIdentity',
    },
    propertyRecords: [
      {
        PropertyKey: 'includeDetails',
        PropertyType: '2',
        PropertyDescription: 'Include user details',
      },
      {
        PropertyKey: 'format',
        PropertyType: '0',
        PropertyDescription: 'Response format (json/xml)',
      },
    ],
  },
  'CAP_002': {
    capabilityRecord: {
      CapabilityType: 'AgentTool',
      Description: 'Query CRM records',
      DisplayName: 'crmQuery',
      ID: 'CAP_002',
      ToolType: 'function',
      ToolImplementation: 'crmQuery',
    },
    propertyRecords: [
      {
        PropertyKey: 'queryName',
        PropertyType: '0',
        PropertyDescription: 'Name of the stored query',
      },
      {
        PropertyKey: 'maxRows',
        PropertyType: '1',
        PropertyDescription: 'Max rows to return',
      },
    ],
  },
};

// ============================================================================
// QUERY BUILDER TESTS
// ============================================================================

describe('QueryBuilder', () => {
  describe('constructor & chaining', () => {
    it('should create a builder with default root entity', () => {
      const builder = new QueryBuilder();
      expect(builder.getRootEntity()).toBe('C082');
    });

    it('should allow custom root entity', () => {
      const builder = new QueryBuilder('C001');
      expect(builder.getRootEntity()).toBe('C001');
    });

    it('should support fluent API chaining', () => {
      const builder = new QueryBuilder()
        .select('C079.ID', 'C079.Name')
        .join('C080', 300)
        .groupBy('C079.ID');

      expect(builder.getSelectedFields()).toHaveLength(2);
      expect(builder.getJoins()).toHaveLength(1);
      expect(builder.getGroupByKey()).toBe('C079.ID');
    });
  });

  describe('select()', () => {
    it('should add fields to selection', () => {
      const builder = new QueryBuilder().select('C079.ID', 'C079.Name', 'C079.Description');
      expect(builder.getSelectedFields()).toEqual(['C079.ID', 'C079.Name', 'C079.Description']);
    });

    it('should filter out empty strings', () => {
      const builder = new QueryBuilder().select('C079.ID', '', 'C079.Name', '  ');
      expect(builder.getSelectedFields()).toEqual(['C079.ID', 'C079.Name']);
    });

    it('should accumulate multiple select calls', () => {
      const builder = new QueryBuilder()
        .select('C079.ID')
        .select('C079.Name')
        .select('C079.Description');

      expect(builder.getSelectedFields()).toHaveLength(3);
    });
  });

  describe('join()', () => {
    it('should add a join without link number', () => {
      const builder = new QueryBuilder().join('C079', null, ['C079.ID']);
      const joins = builder.getJoins();

      expect(joins).toHaveLength(1);
      expect(joins[0].entity).toBe('C079');
      expect(joins[0].linkNum).toBeNull();
    });

    it('should add a join with link number', () => {
      const builder = new QueryBuilder().join('C080', 300, ['C080.Type']);
      const joins = builder.getJoins();

      expect(joins).toHaveLength(1);
      expect(joins[0].linkNum).toBe(300);
    });

    it('should support multiple joins', () => {
      const builder = new QueryBuilder()
        .join('C079', null, ['C079.ID'])
        .join('C080', 300, ['C080.Type'])
        .join('C081', 300, ['C081.Property']);

      expect(builder.getJoins()).toHaveLength(3);
    });

    it('should throw on invalid entity code', () => {
      const builder = new QueryBuilder();
      expect(() => builder.join('', null)).toThrow('Entity code must be a non-empty string');
      expect(() => builder.join('  ', null)).toThrow('Entity code must be a non-empty string');
    });
  });

  describe('groupBy()', () => {
    it('should set grouping key', () => {
      const builder = new QueryBuilder().groupBy('C079.ID');
      expect(builder.getGroupByKey()).toBe('C079.ID');
    });

    it('should allow null grouping key', () => {
      const builder = new QueryBuilder().groupBy(null);
      expect(builder.getGroupByKey()).toBeNull();
    });

    it('should trim whitespace', () => {
      const builder = new QueryBuilder().groupBy('  C079.ID  ');
      expect(builder.getGroupByKey()).toBe('C079.ID');
    });
  });

  describe('build()', () => {
    it('should generate valid UQL statement', () => {
      const builder = new QueryBuilder('C082')
        .select('C079.ID')
        .join('C079', null, ['C079.Name']);

      const request = builder.build();

      expect(request.statement).toContain('select (');
      expect(request.statement).toContain('C079.ID');
      expect(request.statement).toContain('from (C082)');
      expect(request.statement).toContain('with (C079)');
    });

    it('should include link numbers in UQL', () => {
      const builder = new QueryBuilder()
        .select('C079.ID')
        .join('C080', 300, ['C080.Type']);

      const request = builder.build();
      expect(request.statement).toContain('using link 300');
    });

    it('should throw if no fields selected', () => {
      const builder = new QueryBuilder().join('C079', null);
      expect(() => builder.build()).toThrow('At least one field must be selected');
    });

    it('should return EntityQueryRequest with all config', () => {
      const builder = new QueryBuilder('C082')
        .select('C079.ID')
        .join('C079', null, ['C079.Name'])
        .groupBy('C079.ID');

      const request = builder.build();

      expect(request).toHaveProperty('statement');
      expect(request).toHaveProperty('joins');
      expect(request).toHaveProperty('groupByKey', 'C079.ID');
      expect(request).toHaveProperty('selectedFields');
    });
  });

  describe('fromRequest()', () => {
    it('should reconstruct builder from request', () => {
      const original = new QueryBuilder('C082')
        .select('C079.ID')
        .join('C079', null, ['C079.Name'])
        .groupBy('C079.ID')
        .build();

      const reconstructed = QueryBuilder.fromRequest(original);

      expect(reconstructed.getSelectedFields()).toEqual(original.selectedFields);
      expect(reconstructed.getGroupByKey()).toBe(original.groupByKey);
    });
  });
});

// ============================================================================
// QUERY PARSER TESTS
// ============================================================================

describe('QueryParser', () => {
  describe('normalizeRow()', () => {
    it('should convert flat dot-notation to nested structure', () => {
      const row = {
        'C079.ID': 'CAP_001',
        'C079.Name': 'Test',
        'C081.PropertyKey': 'prop1',
      };

      const normalized = QueryParser.normalizeRow(row);

      expect(normalized.C079).toEqual({ ID: 'CAP_001', Name: 'Test' });
      expect(normalized.C081).toEqual({ PropertyKey: 'prop1' });
    });

    it('should handle deeply nested field names', () => {
      const row = {
        'C079.Field.Nested': 'value',
      };

      const normalized = QueryParser.normalizeRow(row);
      expect(normalized.C079['Field.Nested']).toBe('value');
    });

    it('should preserve null and undefined values', () => {
      const row = {
        'C079.ID': null,
        'C079.Name': undefined,
      };

      const normalized = QueryParser.normalizeRow(row);
      expect(normalized.C079.ID).toBeNull();
      expect(normalized.C079.Name).toBeUndefined();
    });
  });

  describe('parseQueryResult()', () => {
    it('should extract rows from result.rows', () => {
      const result = { rows: mockCrmRows };
      const rows = QueryParser.parseQueryResult(result);
      expect(rows).toEqual(mockCrmRows);
    });

    it('should extract rows from result.result.rows', () => {
      const result = { result: { rows: mockCrmRows } };
      const rows = QueryParser.parseQueryResult(result);
      expect(rows).toEqual(mockCrmRows);
    });

    it('should treat direct array as rows', () => {
      const rows = QueryParser.parseQueryResult(mockCrmRows);
      expect(rows).toEqual(mockCrmRows);
    });

    it('should return empty array for invalid result', () => {
      const rows = QueryParser.parseQueryResult({ invalid: 'structure' });
      expect(rows).toEqual([]);
    });
  });

  describe('buildEntityRecord()', () => {
    it('should create plain object without get method', () => {
      const entity = { ID: 'CAP_001', Name: 'Test' };
      const record = QueryParser.buildEntityRecord(entity, false);

      expect(record).toEqual({ ID: 'CAP_001', Name: 'Test' });
      expect(record.get).toBeUndefined();
    });

    it('should add get method when requested', () => {
      const entity = { ID: 'CAP_001', Name: 'Test' };
      const record = QueryParser.buildEntityRecord(entity, true);

      expect(typeof record.get).toBe('function');
      expect(record.get('ID')).toBe('CAP_001');
      expect(record.get('Name')).toBe('Test');
      expect(record.get('Missing')).toBeNull();
    });
  });

  describe('groupRowsByKey()', () => {
    it('should group rows by composite key', () => {
      const grouped = QueryParser.groupRowsByKey(mockCrmRows, 'C079.ID');

      expect(grouped.has('CAP_001')).toBe(true);
      expect(grouped.has('CAP_002')).toBe(true);
      expect(grouped.get('CAP_001')).toHaveLength(2);
      expect(grouped.get('CAP_002')).toHaveLength(2);
    });

    it('should throw on invalid key field format', () => {
      expect(() => QueryParser.groupRowsByKey(mockCrmRows, 'InvalidFormat')).toThrow(
        'Invalid key field format'
      );
    });

    it('should skip rows without grouping key', () => {
      const rows = [
        { 'C079.ID': 'CAP_001', 'C081.PropertyKey': 'prop1' },
        { 'C081.PropertyKey': 'prop2' }, // Missing C079.ID
      ];

      const grouped = QueryParser.groupRowsByKey(rows, 'C079.ID');
      expect(grouped.size).toBe(1);
    });
  });

  describe('buildEntityHierarchy()', () => {
    it('should build parent-child hierarchy from grouped rows', () => {
      const groupedRows = mockCrmRows.filter(r => r['C079.ID'] === 'CAP_001');

      const hierarchy = QueryParser.buildEntityHierarchy(groupedRows, {
        parentEntity: 'C079',
        childEntity: 'C081',
        includeGetMethod: false,
      });

      expect(hierarchy.C079).toHaveProperty('ID', 'CAP_001');
      expect(hierarchy.C081).toHaveLength(2);
      expect(hierarchy.C081[0]).toHaveProperty('PropertyKey');
    });

    it('should avoid duplicate child entities', () => {
      const rows = [
        {
          'C079.ID': 'CAP_001',
          'C079.Name': 'Test',
          'C081.PropertyKey': 'prop1',
        },
        {
          'C079.ID': 'CAP_001',
          'C079.Name': 'Test',
          'C081.PropertyKey': 'prop1', // Duplicate
        },
        {
          'C079.ID': 'CAP_001',
          'C079.Name': 'Test',
          'C081.PropertyKey': 'prop2', // Different
        },
      ];

      const hierarchy = QueryParser.buildEntityHierarchy(rows, {
        parentEntity: 'C079',
        childEntity: 'C081',
      });

      expect(hierarchy.C081).toHaveLength(2);
    });
  });

  describe('hasRequiredFields()', () => {
    it('should validate required fields presence', () => {
      const normalized = {
        C079: { ID: 'CAP_001', Name: 'Test' },
      };

      expect(QueryParser.hasRequiredFields(normalized, 'C079', ['ID', 'Name'])).toBe(true);
      expect(QueryParser.hasRequiredFields(normalized, 'C079', ['ID', 'Missing'])).toBe(false);
    });

    it('should return false for missing entity', () => {
      const normalized = { C079: { ID: 'CAP_001' } };
      expect(QueryParser.hasRequiredFields(normalized, 'C080', ['ID'])).toBe(false);
    });
  });
});

// ============================================================================
// QUERY EXECUTOR TESTS
// ============================================================================

describe('QueryExecutor', () => {
  const mockQueryExecute = jest.fn();

  beforeEach(() => {
    mockQueryExecute.mockClear();
    mockQueryExecute.mockResolvedValue({ rows: mockCrmRows });
  });

  describe('createCapabilityQueryBuilder()', () => {
    it('should create preconfigured capability query builder', () => {
      const builder = QueryExecutor.createCapabilityQueryBuilder();
      expect(builder.getRootEntity()).toBe('C082');
      expect(builder.getSelectedFields().length).toBeGreaterThan(0);
      expect(builder.getJoins().length).toBeGreaterThan(0);
      expect(builder.getGroupByKey()).toBe('C079.ID');
    });
  });

  describe('executeCapabilityQuery()', () => {
    it('should execute query and return parsed response', async () => {
      const builder = QueryExecutor.createCapabilityQueryBuilder();
      const request = builder.build();

      const response = await QueryExecutor.executeCapabilityQuery(request, mockQueryExecute);

      expect(mockQueryExecute).toHaveBeenCalled();
      expect(response.rows).toEqual(mockCrmRows);
      expect(response.totalCount).toBe(mockCrmRows.length);
    });

    it('should group capabilities correctly', async () => {
      const builder = QueryExecutor.createCapabilityQueryBuilder();
      const request = builder.build();

      const response = await QueryExecutor.executeCapabilityQuery(request, mockQueryExecute);

      expect(response.entities.has('CAP_001')).toBe(true);
      expect(response.entities.has('CAP_002')).toBe(true);
      expect(response.entities.size).toBe(2);
    });

    it('should build correct capability structure', async () => {
      const builder = QueryExecutor.createCapabilityQueryBuilder();
      const request = builder.build();

      const response = await QueryExecutor.executeCapabilityQuery(request, mockQueryExecute);

      const cap001 = response.entities.get('CAP_001');
      expect(cap001).toBeDefined();
      expect(cap001?.capabilityRecord).toBeDefined();
      expect(cap001?.propertyRecords).toBeDefined();
      expect(cap001?.propertyRecords).toHaveLength(2);
    });

    it('should match mock capability fixture', async () => {
      const builder = QueryExecutor.createCapabilityQueryBuilder();
      const request = builder.build();

      const response = await QueryExecutor.executeCapabilityQuery(request, mockQueryExecute);

      for (const [capId, expected] of Object.entries(mockCapabilityFixture)) {
        const actual = response.entities.get(capId);
        expect(actual).toBeDefined();
        expect(actual?.capabilityRecord.ID).toBe(expected.capabilityRecord.ID);
        expect(actual?.capabilityRecord.DisplayName).toBe(expected.capabilityRecord.DisplayName);
        expect(actual?.propertyRecords).toHaveLength(expected.propertyRecords.length);
      }
    });

    it('should handle empty result', async () => {
      mockQueryExecute.mockResolvedValueOnce({ rows: [] });

      const builder = QueryExecutor.createCapabilityQueryBuilder();
      const request = builder.build();

      const response = await QueryExecutor.executeCapabilityQuery(request, mockQueryExecute);

      expect(response.rows).toEqual([]);
      expect(response.entities.size).toBe(0);
      expect(response.totalCount).toBe(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('QueryBuilder + QueryParser + QueryExecutor Integration', () => {
  it('should execute complete capability query workflow', async () => {
    const mockExecute = jest.fn().mockResolvedValue({ rows: mockCrmRows });

    // 1. Build query using fluent API
    const builder = QueryExecutor.createCapabilityQueryBuilder();
    const request = builder.build();

    // 2. Execute query
    const response = await QueryExecutor.executeCapabilityQuery(request, mockExecute);

    // 3. Verify structure
    expect(response.rows).toHaveLength(4);
    expect(response.entities.size).toBe(2);
    expect(response.groupedBy).toBe('C079.ID');

    // 4. Verify each capability
    const capabilities = Array.from(response.entities.values());
    capabilities.forEach(cap => {
      expect(cap.capabilityRecord).toHaveProperty('ID');
      expect(cap.capabilityRecord).toHaveProperty('DisplayName');
      expect(cap.capabilityRecord).toHaveProperty('Description');
      expect(Array.isArray(cap.propertyRecords)).toBe(true);
      expect(cap.propertyRecords.length).toBeGreaterThan(0);
    });
  });

  it('should convert response to JSON for serialization', async () => {
    const mockExecute = jest.fn().mockResolvedValue({ rows: mockCrmRows });

    const builder = QueryExecutor.createCapabilityQueryBuilder();
    const request = builder.build();
    const response = await QueryExecutor.executeCapabilityQuery(request, mockExecute);

    const json = response.toJSON();

    expect(json).toHaveProperty('rows');
    expect(json).toHaveProperty('entities');
    expect(json).toHaveProperty('groupedBy');
    expect(json).toHaveProperty('totalCount');
    expect(Array.isArray(json.entities)).toBe(true);

    // Verify JSON is serializable
    const stringified = JSON.stringify(json);
    expect(() => JSON.parse(stringified)).not.toThrow();
  });
});
