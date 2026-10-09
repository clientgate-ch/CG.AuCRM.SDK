# Low-Level CRM Query Usage (u8.services.*)

## Overview

Direct access to the CRM QueryCommand API provides fine-grained control over entity queries. This is the underlying API that QueryBuilder and QueryExecutor wrap, but sometimes it's necessary to use directly for maximum control.

## Global CRM Services

The CRM exposes global services via the `u8` namespace:

```typescript
// Access CRM services
u8.services.QueryCommand     // Query execution service
u8.services.BatchManager     // Batch operations (CRUD)
u8.services.QueryHandler     // Stored query execution
```

## QueryCommand API

### Basic Query Execution

**Function**: `u8.services.QueryCommand.executeQuery(queryRequest)`

**Parameter Structure**:
```typescript
interface QueryRequest {
  query: string;              // UQL query string
  options?: {
    [key: string]: any;       // Optional query parameters
  };
}
```

**Returns**: Promise resolving to query result

**Basic Example**:
```typescript
const queryRequest = {
  query: `
    select (C001.Name, C001.Description)
    from (C001)
  `
};

const result = await u8.services.QueryCommand.executeQuery(queryRequest);
console.log(result);
```

## UQL Query Language

### Basic Syntax

```
select (entity.field1, entity.field2, ...)
from (rootEntity)
with (relatedEntity1)
with (relatedEntity2)
```

### Entity References

Each entity is identified by its **info area code** (C-number):
- `C001` - Company
- `C078` - Agent (migration context)
- `C079` - Agent Capability
- `C080` - Capability-Property link
- `C081` - Property
- `C082` - Service/Tool registry

### Qualified Joins

For hierarchical relationships, use **qualified join** syntax:

```
with (ParentEntity.ChildEntity using link LinkCode)
```

**Example - Agent Capabilities with Properties**:
```sql
select (
  C079.ID, 
  C079.Description, 
  C079.DisplayName, 
  C079.CapabilityType,
  C081.PropertyKey, 
  C081.PropertyType, 
  C081.PropertyDescription
)
from (C082)
with (C079)                          -- Include capabilities
with (C079.C080 using link 300)      -- Link capabilities to properties via C080
with (C080.C081 using link 300)      -- Get actual property entities
```

**Key Points**:
- `link 300` = The relationship code between entities (CRM-specific)
- Order matters: must navigate parent → link → child
- Must use **qualified** parent.child notation (not just `with (C080)`)

### Field Selection

**Dot Notation**: `Entity.FieldName`

```typescript
C079.ID              // ID field of capability entity
C079.Description     // Description field
C079.ToolType        // Tool type classification
C081.PropertyKey     // Property key
C081.PropertyValue   // Property value
```

## CRM Result Formats

### Result Structure

```typescript
// Typical CRM response
{
  cancel: false,              // Query cancelled flag
  options: {
    queryId: 'abc123',
    // Other query metadata
  },
  resultSet: {                // ← ACTUAL DATA HERE
    rows: [
      {
        uids: [uid1, uid2, ...],     // Entity hierarchy UIDs
        values: [val1, val2, ...]    // Selected field values
      },
      // ... more rows
    ]
  }
}
```

### Extracting Rows

**Safe extraction pattern**:
```typescript
const result = await u8.services.QueryCommand.executeQuery(queryRequest);

// CRM returns result in resultSet property
const rows = result?.resultSet?.rows || 
             result?.rows || 
             result?.result?.rows || 
             [];

console.log(`Retrieved ${rows.length} rows`);
```

### Row Structure Details

Each row is an object with two arrays:

```typescript
{
  uids: [
    'C078|x0000044c00000015',    // First entity in hierarchy
    'C079|x0000000100000001',    // Second entity
    'C080|x0000000200000001',    // Third entity (join link)
    'C081|x0000000300000001'     // Fourth entity
  ],
  values: [
    value0,                       // SELECT field at position 0
    value1,                       // SELECT field at position 1
    value2,                       // SELECT field at position 2
    // ... one value per SELECT field in order
  ]
}
```

**Value Array Mapping**:
The `values` array corresponds **exactly** to your `select (...)` list in order:

```typescript
// Query: select (C079.ID, C079.Description, C079.DisplayName, C081.PropertyKey)
// Row values:
{
  values: [
    '123',                       // values[0] = C079.ID
    'Tool Description',          // values[1] = C079.Description
    'My Tool',                   // values[2] = C079.DisplayName
    'PropertyKey1'               // values[3] = C081.PropertyKey
  ]
}
```

## Complete Example: Agent Capabilities Query

```typescript
// 1. Build query request
const queryRequest = {
  query: `
    select (
      C079.CapabilityType, 
      C079.Description, 
      C079.DisplayName, 
      C079.ID, 
      C079.ToolType, 
      C079.ToolImplementation,
      C081.PropertyKey, 
      C081.PropertyType, 
      C081.PropertyDescription
    )
    from (C082)
    with (C079)
    with (C079.C080 using link 300)
    with (C080.C081 using link 300)
  `
};

// 2. Execute query
const result = await u8.services.QueryCommand.executeQuery(queryRequest);

// 3. Extract rows
const rows = result?.resultSet?.rows || [];
console.log(`Retrieved ${rows.length} capabilities`);

// 4. Process rows
for (const row of rows) {
  const capabilityId = row.values[3];      // C079.ID at index 3
  const displayName = row.values[2];       // C079.DisplayName at index 2
  const propertyKey = row.values[6];       // C081.PropertyKey at index 6
  
  console.log(`Capability: ${displayName} (ID: ${capabilityId})`);
  console.log(`  Property: ${propertyKey}`);
}
```

## Error Handling

### Query Syntax Errors

```typescript
try {
  const result = await u8.services.QueryCommand.executeQuery(queryRequest);
  
  if (result.cancel) {
    console.error('Query cancelled');
    return [];
  }
  
  const rows = result?.resultSet?.rows || [];
  return rows;
} catch (error) {
  console.error('Query execution failed:', error);
  throw error;
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Parse error in UQL | Invalid qualified join syntax | Use `ParentEntity.ChildEntity using link Code` |
| No results | Wrong entity IDs or join links | Verify C-numbers and link codes |
| Missing field | Field doesn't exist in entity | Check CRM data model documentation |
| resultSet is undefined | Checking wrong result path | Use `result?.resultSet?.rows` |

## Performance Considerations

1. **Minimize field selection**: Only select fields you need
2. **Avoid unnecessary joins**: Don't include entities if not needed
3. **Use efficient link codes**: Verify correct relationship codes
4. **Consider pagination**: For large result sets, implement batching

## Relationship/Link Codes

Common CRM link codes:

| Code | Relationship | Example |
|------|--------------|---------|
| 300 | Parent-to-child link | C079 → C080 → C081 |
| 400 | Document links | - |
| 500 | Address links | - |

**Reference**: Check CRM data model or `docs/FSBBi80.xml` for complete link definitions.

## Testing Queries

Quick validation approach:

```typescript
const testQuery = {
  query: `select (C079.ID) from (C082) with (C079)`
};

const result = await u8.services.QueryCommand.executeQuery(testQuery);
console.log('Query succeeded:', result?.resultSet?.rows?.length > 0);
console.log('Result structure:', {
  hasCancel: 'cancel' in result,
  hasOptions: 'options' in result,
  hasResultSet: 'resultSet' in result,
  resultSetKeys: Object.keys(result?.resultSet || {}),
  firstRowKeys: Object.keys(result?.resultSet?.rows?.[0] || {}),
});
```
