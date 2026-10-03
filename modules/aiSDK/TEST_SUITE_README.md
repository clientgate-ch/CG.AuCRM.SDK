# Jest Test Suite for CRM Tool Schema Mapping

## Overview
This test suite (`chat.test.ts`) provides comprehensive unit testing for the mapping functions that convert CRM business objects into tool schemas compatible with LM Studio.

## Key Findings from Console Output

### 1. **Capability Record Structure (C079)**
The CRM returns capability records with this structure:
```
{
  businessObject: {
    uid: { infoAreaId: "C079", recordId: "..." },
    values: {
      "7000": "...",  // CapabilityType
      "7001": "...",  // Description
      "7002": "...",  // DisplayName
      "7003": "...",  // ID
      "7004": "...",  // ToolType
      "7005": "..."   // ToolImplementation
    },
    namedValues: { "ID": 7003, "DisplayName": 7002, ... },
    get: function(fieldName) { ... }  // Method to access fields by name
  }
}
```

**Key insight**: Fields are stored by numeric IDs (7000-7005) but accessed via field names through the `get()` method or `namedValues` mapping.

### 2. **Parameter Record Error (C080)**
❌ **Current Issue**: Trying to read C080 records with `fields: ["ParentCapLink"]` fails because:
- `ParentCapLink` is a field in C080, not C079
- When using `linkName: "$Link[C080]"` with `fields`, the CRM tries to validate fields against C079 (the parent)
- This causes: `"Field name 'ParentCapLink' was not found in info area AgentCapability(C079)."`

**Solution**: Don't include `fields` parameter when reading linked records. Use only:
```typescript
const parameterRecords = await read({
  uid: capabilityUid,
  linkName: "$Link[C080]"
});
```

### 3. **Property Records Error (C081)**
❌ **Current Issue**: Attempting to read C081 records fails because:
- We're passing an error object (from the failed parameter read) as the parameter UID
- The parameterBusinessObject has no `uid` property (it's an error response)
- Error: `"In order to read using the crud service, you have to specify either a valid record or a link thats allows to determine a record."`

**Solution**: 
1. Remove `fields` from the C080 read (see above)
2. This will return valid parameter records with proper UIDs
3. Then read C081 properties using those UIDs

## Test Suite Organization

### Test Categories

#### 1. `mapPropertyRecordToSchema` Tests
- ✅ Extract property fields from valid C081 records
- ✅ Handle null/empty inputs
- ✅ Return null when required fields are missing
- ✅ Support both BusinessObject instances and plain objects
- ✅ Support numeric field ID fallback (7006, 7007, 7008)

#### 2. `mapCapabilityRecordToToolSchema` Tests
- ✅ Extract capability fields from valid C079 records
- ✅ Generate correct JSON schema structure
- ✅ Handle multiple property records
- ✅ Return null for incomplete data
- ✅ Filter out invalid properties

#### 3. `PropertySchema.toJsonSchema` Tests
- ✅ Generate valid JSON schema
- ✅ Trim whitespace from values

#### 4. `ToolSchema.toToolDefinition` Tests
- ✅ Generate complete tool definition with required structure
- ✅ Include all properties in required array

#### 5. Error Handling and Edge Cases
- ✅ Handle error responses gracefully
- ✅ Skip invalid properties in arrays
- ✅ Handle records wrapped in arrays
- ✅ Handle nested businessObject properties

#### 6. Data Structure Compatibility
- ✅ Work with BusinessObject (has `.get()` method)
- ✅ Work with plain objects
- ✅ Work with numeric field IDs
- ✅ Prefer named fields over numeric IDs

## Mock Data Provided

### `mockCapabilityRecord`
Complete C079 Agent Capability record with all required fields.

### `mockPropertyRecord`
C081 Parameter Property with PropertyKey, PropertyType, PropertyDescription.

### `mockParameterRecord`
C080 Tool Parameter with ParentCapLink field.

### `mockErrorResponse`
Example error response when fields are invalid for the CRM context.

## Running Tests

```bash
# Run all tests
npm test chat.test.ts

# Run with coverage
npm test -- --coverage chat.test.ts

# Run specific test suite
npm test -- --testNamePattern="mapPropertyRecordToSchema" chat.test.ts

# Watch mode
npm test -- --watch chat.test.ts
```

## Next Steps to Fix the Actual Code

### Fix 1: Remove Fields Parameter from Parameter Read
```typescript
// WRONG:
const parameterRecordResponse = await read({
  uid: capabilityUid,
  linkName: "$Link[C080]",
  fields: ["ParentCapLink"]  // ❌ This fails
});

// RIGHT:
const parameterRecordResponse = await read({
  uid: capabilityUid,
  linkName: "$Link[C080]"  // ✅ No fields parameter
});
```

### Fix 2: Don't Include Fields in C081 Read if UID is Invalid
The current code tries to read C081 with an error object as the parameter. Once Fix 1 is applied, parameter records will have valid UIDs.

### Fix 3: Validate Parameter Record Before Reading C081
```typescript
for (const parameterRecord of parameterRecords) {
  const parameterBusinessObject = firstRecordFromResponse(parameterRecord);
  
  // Check if it's valid (not an error)
  if (!parameterBusinessObject?.uid) {
    console.warn("Parameter record is not valid");
    continue;
  }

  // Now safe to read C081
  const propertyRecords = await read({
    uid: parameterBusinessObject.uid,
    linkName: "$Link[C081]"
  });
  // ... process properties
}
```

## Test Coverage

Current test suite covers:
- ✅ Happy path: Valid business objects with all required fields
- ✅ Error handling: Null, empty, missing fields
- ✅ Multiple data formats: BusinessObject vs plain objects vs numeric IDs
- ✅ Edge cases: Wrapped in arrays, nested structures, whitespace
- ✅ Schema generation: JSON schema validation and structure

Not yet covered (for future integration tests):
- ⏳ Actual CRM API calls to readLink and read
- ⏳ Full readToolCapability flow with real data
- ⏳ buildToolsForPrompt integration
- ⏳ Performance with large property arrays

## Debugging Notes

When running the actual application:
1. Check browser console for the `=== [SECTION] ===` log markers
2. Each section shows the raw API response and parsed results
3. If any section shows an error object, that read failed
4. Copy the console output for debugging or updating test mocks
