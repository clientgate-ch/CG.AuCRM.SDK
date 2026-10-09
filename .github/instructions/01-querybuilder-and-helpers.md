# QueryBuilder and Query Helpers

## Overview

The QueryBuilder pattern provides a fluent API for constructing entity queries against the CRM database. It's part of the extensions library located in `modules/frontend/src/extensions/`.

## Key Components

### QueryBuilder (`QueryBuilder.ts`)

**Purpose**: Fluent API for building entity queries with a chainable syntax.

**File Location**: `modules/frontend/src/extensions/QueryBuilder.ts`

**Basic Usage**:
```typescript
import { QueryBuilder } from '../../frontend/src/extensions/QueryBuilder';

const query = new QueryBuilder()
  .select(['field1', 'field2', 'field3'])
  .from('C079')  // Entity/info area ID
  .with('C080')
  .with('C081')
  .build();
```

**API Methods**:
- `.select(fields: string[])` - Specify which fields to retrieve
- `.from(entity: string)` - Set root entity
- `.with(relatedEntity: string)` - Join related entities
- `.build()` - Generate query request object

### QueryExecutor (`QueryExecutor.ts`)

**Purpose**: Orchestrates query execution against the CRM database using the QueryCommand API.

**File Location**: `modules/frontend/src/extensions/QueryExecutor.ts`

**Key Method**:
```typescript
export async function executeEntityQuery(queryRequest: any): Promise<any>
```

**Usage**:
```typescript
import { QueryExecutor } from '../../frontend/src/extensions/QueryExecutor';

const result = await QueryExecutor.executeEntityQuery(queryRequest);
```

**Responsibilities**:
- Sends query request to CRM via `u8.services.QueryCommand`
- Handles response extraction (extracts `resultSet` from response object)
- Returns normalized result structure with `.rows` property

### QueryParser (`QueryParser.ts`)

**Purpose**: Normalizes and groups CRM query results into hierarchical entity structures.

**File Location**: `modules/frontend/src/extensions/QueryParser.ts`

**Key Methods**:

```typescript
export function parseQueryResult(result: any): any[]
```
Handles multiple CRM result formats:
- `result.rows` - Direct rows array
- `result.result.rows` - Nested result format
- `result.resultSet` - Result wrapped in resultSet
- `result.resultSet.rows` - Rows within resultSet
- Direct array

```typescript
export function normalizeRow(row: any): any
```
Converts CRM row format `{uids: [...], values: [...]}` into nested object structure:
```typescript
// Input: {uids: [uid1, uid2, uid3], values: [v1, v2, v3]}
// Output: {C078: {...}, C079: {...}, C080: {...}}
```

```typescript
export function buildEntityRecord(entity: any, withGetter?: boolean): any
```
Creates an object with optional `.get(propertyName)` accessor method.

## Important Limitations

### QueryBuilder Does NOT Support Qualified Joins

❌ **Does NOT work**:
```typescript
// QueryBuilder generates: with (C080) using link 300
// But CRM requires: with (C079.C080 using link 300)
// This causes CRM parse errors!
```

✅ **Workaround**: Use manual UQL string construction for queries requiring qualified joins:
```typescript
const uql = `
  select (C079.CapabilityType, C079.Description, C079.ID, C081.PropertyKey)
  from (C082)
  with (C079)
  with (C079.C080 using link 300)
  with (C080.C081 using link 300)
`;
```

## CRM Result Format Handling

CRM returns query results in various formats. Always use defensive parsing:

```typescript
// CRM may return:
{
  cancel: false,
  options: {...},
  resultSet: {
    rows: [...]  // ← Actual data here
  }
}

// Always check multiple paths:
const rows = result?.resultSet?.rows || result?.rows || result?.result?.rows || [];
```

## Row Structure

CRM returns normalized rows as:
```typescript
{
  uids: [uid1, uid2, uid3, ...],      // Unique IDs for each entity in the hierarchy
  values: [v0, v1, v2, v3, ...]       // Selected field values in query order
}
```

**Example with agent capability query**:
```typescript
// Query: select (C079.CapabilityType, C079.Description, C079.ID, ..., C081.PropertyKey, ...)
// Row structure:
{
  uids: [
    'C078|x0000044c00000015',   // Agent UID
    'C079|x0000000100000001',   // Capability UID
    'C080|x0000000200000001',   // Intermediate link UID
    'C081|x0000000300000001'    // Property UID
  ],
  values: [
    'Tool',                      // values[0] = C079.CapabilityType
    'Tool Description',          // values[1] = C079.Description
    '123',                       // values[3] = C079.ID
    'PropertyKey1',              // values[6] = C081.PropertyKey
    'string',                    // values[7] = C081.PropertyType
    'Property description'       // values[8] = C081.PropertyDescription
  ]
}
```

## Best Practices

1. **For simple queries without qualified joins**: Use QueryBuilder
   ```typescript
   const query = new QueryBuilder()
     .select(['Name', 'Description'])
     .from('C001')
     .build();
   ```

2. **For complex hierarchical queries with qualified joins**: Use manual UQL
   ```typescript
   const uql = `
     select (C079.ID, C079.Description, C081.PropertyKey)
     from (C082)
     with (C079)
     with (C079.C080 using link 300)
     with (C080.C081 using link 300)
   `;
   ```

3. **Always validate result structure** before processing:
   ```typescript
   if (!Array.isArray(result?.rows) && !result?.resultSet?.rows) {
     console.warn('Unexpected result format:', result);
   }
   ```

4. **Parse rows with correct field mapping**:
   ```typescript
   // Don't assume dot notation access (C079.ID doesn't work)
   // Instead, map values array index to query fields
   const capabilityId = row.values[3]; // if C079.ID was at index 3 in SELECT
   ```

## Debugging

Add logging to understand data flow:
```typescript
console.log('Query request:', queryRequest);
console.log('Raw result:', result);
console.log('Parsed rows:', QueryParser.parseQueryResult(result));
console.log('Normalized row:', QueryParser.normalizeRow(row));
```
