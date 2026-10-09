# Tool Implementations

This document contains the complete JavaScript implementation code for each of the 5 tools that will be populated into the CRM.

---

## 1. `openCampaign`

**Display Name:** Open Campaign  
**Type:** FUNCTION  
**Description:** Open the campaign tree for the campaign record created by createEventCampaign. This tool is the second step in the campaign workflow and must be called with the uid returned from createEventCampaign. Do not use this for generic record navigation or user identity lookups.

### Implementation

```javascript
async (args) => {
  const normalizeRecordUid = (value) => {
    if (!value) return undefined;
    if (typeof value === 'object' && (value.recordId !== undefined || value.infoAreaId !== undefined)) {
      return { infoAreaId: value.infoAreaId ?? 'CM', recordId: value.recordId };
    }
    return undefined;
  };
  
  const explicitRecordId = args?.recordId;
  const explicitInfoAreaId = args?.infoAreaId;
  const recordUidInput = (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
    ? { infoAreaId: explicitInfoAreaId ?? 'CM', recordId: explicitRecordId }
    : args?.uid ?? args?.recordUid;
  
  const recordUid = normalizeRecordUid(recordUidInput);
  if (!recordUid || !recordUid.recordId) {
    return { success: false, message: 'Invalid recordUid for openCampaign' };
  }
  
  try {
    LGT.Tools.UI.OpenTreeByBool({
      uid: recordUid,
      fieldId: 'HFRecurringMailingCampaign',
      webConfParam: 'LGT_OpenCMTree_ByFlag',
      createNewTab: true
    });
    return { success: true, message: 'Opened campaign tree for ' + JSON.stringify(recordUid) };
  } catch (e) {
    return { success: false, message: 'Failed to open campaign: ' + e.message };
  }
}
```

### Parameters

| Key | Type | Description |
|-----|------|-------------|
| `uid` | object | Preferred full CRM UID returned by createEventCampaign. This should include both infoAreaId and recordId. |
| `infoAreaId` | string | CRM info area for the campaign record. Use the returned infoAreaId from createEventCampaign when needed. |
| `recordId` | string | The exact CRM record identifier returned by createEventCampaign. Use this only for the campaign workflow. |
| `recordUid` | object | Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string from the campaign step. |

---

## 2. `addToTargetGroup`

**Display Name:** Add To Target Group  
**Type:** FUNCTION  
**Description:** Add one or more CRM records to a target group for the selected campaign. Use this when a workflow needs to attach persons/companies to an existing campaign activity target group. The targetUid is the campaign activity or target-group container and uids is the list of records to add.

### Implementation

```javascript
async (args) => {
  const normalizeRecordUid = (value) => {
    if (!value) return undefined;
    if (typeof value === 'object' && (value.recordId !== undefined || value.infoAreaId !== undefined)) {
      return { infoAreaId: value.infoAreaId ?? 'FI', recordId: value.recordId };
    }
    return undefined;
  };
  
  const targetUid = normalizeRecordUid(args?.targetUid ?? args?.uid ?? args?.recordUid);
  const uids = Array.isArray(args?.uids)
    ? args.uids.map(u => normalizeRecordUid(u)).filter(u => !!u)
    : [];
  
  if (!targetUid || uids.length === 0) {
    return { success: false, message: 'Invalid targetUid or uids' };
  }
  
  try {
    const options = {
      targetUid,
      uids,
      ...(args?.infoAreaId ? { infoAreaId: String(args.infoAreaId) } : {}),
      ...(args?.source !== undefined ? { source: args.source } : {}),
      ...(args?.elEvent !== undefined ? { elEvent: args.elEvent } : {}),
      ...(args?.additionalParameters !== undefined ? { additionalParameters: args.additionalParameters } : {})
    };
    
    LGT.CRMExtensions.addToTargetGroup(options);
    return { success: true, message: 'Added ' + uids.length + ' record(s) to target group' };
  } catch (e) {
    return { success: false, message: 'Failed to add records: ' + e.message };
  }
}
```

### Parameters

| Key | Type | Description |
|-----|------|-------------|
| `targetUid` | object | The CRM target group or campaign activity UID that will receive the records. |
| `uids` | array | Array of record UIDs to add to the target group. |
| `infoAreaId` | string | Optional override for the target-related info area when the caller already has it. |
| `source` | object | Optional source UI element or context object passed through to the CRM target-group helper. |
| `elEvent` | object | Optional event object passed through to the target-group helper. |
| `additionalParameters` | object | Optional extra parameters for the target-group operation. |

---

## 3. `openRecordInTreeView`

**Display Name:** Open Record In Tree View  
**Type:** FUNCTION  
**Description:** Open a general CRM record in the tree view. Use this only for non-campaign record navigation. Never use this when a user asks to create or open a campaign; in that case prefer createEventCampaign first and then openCampaign.

### Implementation

```javascript
async (args) => {
  const normalizeRecordUid = (value) => {
    if (!value) return undefined;
    if (typeof value === 'object' && (value.recordId !== undefined || value.infoAreaId !== undefined)) {
      return { infoAreaId: value.infoAreaId ?? 'FI', recordId: value.recordId };
    }
    return undefined;
  };
  
  const explicitRecordId = args?.recordId;
  const explicitInfoAreaId = args?.infoAreaId;
  const recordUidInput = (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
    ? { infoAreaId: explicitInfoAreaId ?? 'FI', recordId: explicitRecordId }
    : args?.uid ?? args?.recordUid;
  
  const recordUid = normalizeRecordUid(recordUidInput);
  if (!recordUid || !recordUid.recordId) {
    return { success: false, message: 'Invalid recordUid for openRecordInTreeView' };
  }
  
  try {
    LGT.Tools.UI.OpenDefaultAction(recordUid);
    return { success: true, message: 'Opened record ' + JSON.stringify(recordUid) };
  } catch (e) {
    return { success: false, message: 'Failed to open record: ' + e.message };
  }
}
```

### Parameters

| Key | Type | Description |
|-----|------|-------------|
| `uid` | object | Preferred full CRM UID. This should include both infoAreaId and recordId. |
| `infoAreaId` | string | CRM info area, usually FI for company records. Optional fallback only if the full uid is not available. |
| `recordId` | string | The exact CRM record identifier, e.g. "x00002329000002d4". Fallback only. |
| `recordUid` | object | Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string. |

---

## 4. `crud`

**Display Name:** CRUD Operation  
**Type:** FUNCTION  
**Description:** Execute a single CRM CRUD operation through the batch API using the exact request contract defined by the CRM typings. This tool must send exactly one operation in a single-item batch, never a multi-operation batch and never a direct read/create/update call. The JSON must contain: operation as one of create, read, update, delete; and request as a single CRM request object.

### Implementation

```javascript
async (args) => {
  const operation = String(args?.operation ?? '').trim().toLowerCase();
  const request = args?.request ?? {};
  
  if (!operation || !request || typeof request !== 'object' || !['create', 'read', 'update', 'delete'].includes(operation)) {
    return { success: false, message: 'Invalid CRUD operation or request' };
  }
  
  try {
    const singleRequest = { ...request, type: operation };
    // Use CG.executeBatch which is already Promise-based
    const executeBatchAsyncLocal = (requests) => {
      console.log('CRUD tool: Calling CG.executeBatch with', requests.length, 'request(s)');
      return CG.executeBatch(requests);
    };
    const response = await executeBatchAsyncLocal([singleRequest]);
    return { success: true, operation, message: 'Executed ' + operation + ' CRUD operation', response };
  } catch (e) {
    return { success: false, message: 'CRUD execution failed: ' + e.message };
  }
}
```

### Parameters

| Key | Type | Description |
|-----|------|-------------|
| `operation` | string | Single CRUD operation to execute. Must be exactly one of create, read, update, or delete. |
| `request` | object | Single CRM request object matching the operation. |

---

## 5. `crmQuery`

**Display Name:** CRM Query  
**Type:** FUNCTION  
**Description:** Execute a named CRM query using the QueryCommand contract and return the raw queryResult payload. Use this when the caller references a stored query by name and wants the resulting rows/columns metadata; maxRows defaults to 10000 when omitted.

### Implementation

```javascript
async (args) => {
  const name = typeof args?.name === 'string' ? args.name.trim() : '';
  const maxRows = Number.isFinite(Number(args?.maxRows)) && Number(args?.maxRows) > 0 ? Number(args?.maxRows) : 10000;
  
  if (!name) {
    return { success: false, message: 'Missing stored query name for crmQuery' };
  }
  
  try {
    const queryCommand = new u8.Crm.QueryCommand({ name, maxRows, ...(args?.link ? { link: args.link } : {}) });
    const queryResult = await LGT.CRMExtensions.executeQuery(queryCommand);
    return { success: true, name, maxRows, message: 'Executed query ' + name, queryResult };
  } catch (e) {
    return { success: false, message: 'Query execution failed: ' + e.message };
  }
}
```

### Parameters

| Key | Type | Description |
|-----|------|-------------|
| `name` | string | Stored CRM query name to execute. This is the required identifier for the named query. |
| `maxRows` | number | Maximum number of rows to return. Defaults to 10000 when omitted or invalid. |
| `link` | object | Optional parent CRM link context for the query. Accepts a full uid object. |

---

## Summary

| Tool | Parameters | Capability |
|------|-----------|-----------|
| `openCampaign` | 4 (uid, infoAreaId, recordId, recordUid) | TOOL |
| `addToTargetGroup` | 6 (targetUid, uids, infoAreaId, source, elEvent, additionalParameters) | TOOL |
| `openRecordInTreeView` | 4 (uid, infoAreaId, recordId, recordUid) | TOOL |
| `crud` | 2 (operation, request) | TOOL |
| `crmQuery` | 3 (name, maxRows, link) | TOOL |

**Total Parameters:** 19 C081 (Property) records  
**Total Tools:** 5 C079 (Capability) records  
**Total Links:** 38 C080 (Link) records (2 per property for bidirectional association)

These implementations will be stored in the `ToolImplementation` field (C079) as complete JavaScript function strings, and can be executed dynamically when the capabilities are invoked.
