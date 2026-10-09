# Chat Capabilities System

## Overview

The chat capabilities system enables the SDK to dynamically load tool definitions from the CRM database, allowing AI agents to discover and execute capabilities defined in the CRM rather than relying only on hardcoded tools.

## Architecture

### Components

1. **AgentEntity Class** (`modules/aiSDK/src/chat.ts`)
   - Queries the CRM for agent capabilities
   - Parses capability records with their properties
   - Returns structured capability objects

2. **Tool Registry** (`modules/aiSDK/src/chat.ts`)
   - Hardcoded tools (5 default: openCampaign, addToTargetGroup, etc.)
   - Dynamic tools loaded from database via AgentEntity
   - Combined in `buildToolsForPrompt()`

3. **Capability Query Hierarchy**
   - `C082`: Service/Tool registry root
   - `C079`: Capability definitions
   - `C080`: Link entity (join table)
   - `C081`: Capability properties/parameters

## AgentEntity Class

### Location
`modules/aiSDK/src/chat.ts` (lines ~230-435)

### Purpose
Abstracts capability loading from the CRM database, providing a clean interface for querying agent capabilities and transforming raw CRM rows into tool-compatible capability objects.

### Public Interface

#### `loadCapabilities(agentUid)`

Async method to load all capabilities for an agent.

**Parameters**:
```typescript
agentUid: {
  infoAreaId: string;  // Usually "C078" for agents
  recordId: string;    // Agent record ID (e.g., "x0000044c00000015")
}
```

**Returns**:
```typescript
Promise<Array<{
  capabilityRecord: {
    get(field: string): any  // Accessor for C079 fields
  };
  parameterRecords: Array<{
    get(field: string): any  // Accessor for parameters
  }>;
  propertyRecords: Array<{
    get(field: string): any  // Accessor for C081 fields
  }>;
}>>
```

**Usage**:
```typescript
const agentEntity = new AgentEntity();
const capabilities = await agentEntity.loadCapabilities({
  infoAreaId: 'C078',
  recordId: 'x0000044c00000015'
});

console.log(`Loaded ${capabilities.length} capabilities`);
```

### Implementation Details

#### Query Construction (`buildQueryRequest()`)

The query uses **qualified joins** to navigate the capability hierarchy:

```typescript
const uql = `
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
`;
```

**Why qualified joins are necessary**:
- `with (C079)` - Get capabilities for this agent
- `with (C079.C080 using link 300)` - Navigate through C080 link entity
- `with (C080.C081 using link 300)` - Get actual property records

#### Row Parsing (`parseCapabilities()`)

**Input**: Query response with rows in normalized CRM format
```typescript
{
  uids: [agentUid, capabilityUid, linkUid, propertyUid],
  values: [
    value0,  // C079.CapabilityType
    value1,  // C079.Description
    value2,  // C079.DisplayName
    value3,  // C079.ID           ← Capability identifier
    value4,  // C079.ToolType
    value5,  // C079.ToolImplementation
    value6,  // C081.PropertyKey
    value7,  // C081.PropertyType
    value8   // C081.PropertyDescription
  ]
}
```

**Processing**:
1. Group rows by capability ID (values[3])
2. For each unique capability:
   - Create `capabilityRecord` with `.get()` accessor mapping fields to value indices
   - Collect all `propertyRecords` from the same capability ID
3. Return array of grouped capabilities

**Key: Index Mapping**

The `.get()` method maps field names to their position in the values array:

```typescript
// For capability records:
{
  get: (prop: string) => {
    const propMap = {
      CapabilityType: 0,
      Description: 1,
      DisplayName: 2,
      ID: 3,
      ToolType: 4,
      ToolImplementation: 5
    };
    return row.values[propMap[prop]];
  }
}

// Usage:
capabilityRecord.get('DisplayName');  // Returns values[2]
capabilityRecord.get('ID');           // Returns values[3]
```

## Capability Schema Mapping

### From Database to Tool Schema

The `mapCapabilityRecordToToolSchema()` function converts a capability record into a tool definition:

```typescript
{
  name: capabilityRecord.get('ID'),
  description: capabilityRecord.get('Description'),
  displayName: capabilityRecord.get('DisplayName'),
  toolType: capabilityRecord.get('ToolType'),
  toolImplementation: capabilityRecord.get('ToolImplementation'),
  parameters: buildParameterSchema(propertyRecords)
}
```

### Property Records to Parameters

Property records (C081) define capability parameters:

```typescript
propertyRecords.map(prop => ({
  name: prop.get('PropertyKey'),
  type: prop.get('PropertyType'),       // 'string', 'number', etc.
  description: prop.get('PropertyDescription'),
  required: true  // Can be extended based on property metadata
}))
```

## Integration with Tool System

### readToolCapability() Function

Refactored to use AgentEntity:

```typescript
async function readToolCapability(
  serviceLink: any
): Promise<{
  capabilityRecords: any[];
  parameterRecords: any[];
  propertyRecords: any[];
  capabilityCount: number;
}> {
  const agentEntity = new AgentEntity();
  const capabilities = await agentEntity.loadCapabilities(serviceLink);
  
  return {
    capabilityCount: capabilities.length,
    capabilities  // Array of {capabilityRecord, parameterRecords[], propertyRecords[]}
  };
}
```

### buildToolsForPrompt() Integration

```typescript
async function buildToolsForPrompt(
  serviceLink: any,
  userMessage: string
): Promise<Array<{name: string; description: string}>> {
  // 1. Load hardcoded tools (5 default)
  const hardcodedTools = [
    { name: 'openCampaign', description: '...' },
    // ... 4 more
  ];
  
  // 2. Load database capabilities
  const { capabilities } = await readToolCapability(serviceLink);
  const dynamicTools = capabilities
    .map(cap => mapCapabilityRecordToToolSchema(cap));
  
  // 3. Combine
  const allTools = [...hardcodedTools, ...dynamicTools];
  
  // 4. Filter based on user message (optional)
  return filterToolsByRelevance(allTools, userMessage);
}
```

## Data Flow Example

### Query Execution Sequence

```
1. readToolCapability(agentUid)
   ↓
2. AgentEntity.loadCapabilities()
   ↓
3. buildQueryRequest() → Creates UQL string
   ↓
4. QueryExecutor.executeEntityQuery(queryRequest)
   ↓
5. u8.services.QueryCommand.executeQuery()
   ↓
6. CRM returns result with resultSet.rows
   ↓
7. AgentEntity.parseCapabilities(rows)
   ↓
8. Returns Array<{capabilityRecord, propertyRecords[]}>
   ↓
9. mapCapabilityRecordToToolSchema() transforms to tool definitions
   ↓
10. buildToolsForPrompt() combines with hardcoded tools
    ↓
11. Send complete tool list to AI model
```

## Debugging Tips

### Console Logging Points

```typescript
// Enable these logs to trace execution:

// 1. Query construction
console.log("AgentEntity.loadCapabilities: Built query request with UQL:", uql);

// 2. Raw result
console.log("AgentEntity query raw result:", {
  hasRows: !!result.resultSet?.rows,
  rowCount: result.resultSet?.rows?.length
});

// 3. Parsed capabilities
console.log("AgentEntity.parseCapabilities: Built capability:", {
  id: capabilityRecord.get('ID'),
  displayName: capabilityRecord.get('DisplayName'),
  propertyCount: propertyRecords.length
});

// 4. Final count
console.log("Loaded N total capabilities");
```

### Common Issues

| Issue | Symptom | Debug Steps |
|-------|---------|-------------|
| 0 capabilities loaded | Rows retrieved but not parsed | Check row.values structure in console |
| Parse errors in UQL | CRM rejects query | Verify qualified join syntax: `with (C079.C080 using link 300)` |
| resultSet undefined | Rows showing 0 | Check if result is wrapped in resultSet: `result.resultSet.rows` |
| Properties not appearing | Capability has 0 properties | Verify C080→C081 join link code (300) is correct |

## Entity Relationships

```
C082 (Service Registry)
  └─ C079 (Capability)
      └─ C080 (Link Entity) [link 300]
          └─ C081 (Property/Parameter)
```

**Navigation Path**:
1. Start from C082 (root service registry)
2. Join C079 (capabilities) via unqualified join
3. Join C079.C080 with link 300 (capability → property link)
4. Join C080.C081 with link 300 (get actual properties)

## Field Reference

### C079 (Capability)

| Field | Type | Purpose |
|-------|------|---------|
| ID | string | Unique capability identifier |
| DisplayName | string | Human-readable name |
| Description | string | Capability description |
| CapabilityType | string | Classification (e.g., "Tool") |
| ToolType | string | Tool category |
| ToolImplementation | string | Implementation reference |

### C081 (Property/Parameter)

| Field | Type | Purpose |
|-------|------|---------|
| PropertyKey | string | Parameter name |
| PropertyType | string | Data type ("string", "number", etc.) |
| PropertyDescription | string | Parameter description |

## Testing Capabilities Query

Manually test the capability query:

```typescript
// In browser console:
const agentEntity = new AgentEntity();
const capabilities = await agentEntity.loadCapabilities({
  infoAreaId: 'C078',
  recordId: 'x0000044c00000015'
});

console.log('Capabilities:', capabilities);
console.log('Count:', capabilities.length);
capabilities.forEach(cap => {
  console.log('  -', cap.capabilityRecord.get('DisplayName'), 
    `(${cap.propertyRecords.length} properties)`);
});
```

## Future Enhancements

1. **Caching**: Cache capabilities to avoid repeated DB queries
2. **Filtering**: Filter capabilities based on user context or message
3. **Versioning**: Support multiple capability versions
4. **Parameters**: Distinguish required vs optional parameters
5. **Validation**: Validate parameter values before execution
