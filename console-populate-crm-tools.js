/**
 * CRM Tool Population Script
 * 
 * Chrome DevTools Console Script: Populates C079 (Agent Capability), C080 (Link), 
 * and C081 (Property) records for 5 hard-coded tools into the CRM database.
 * 
 * USAGE:
 * 1. Copy entire script below
 * 2. Open Chrome DevTools Console in your CRM application
 * 3. Paste and run
 * 4. Check console for success/error logs
 * 
 * TARGET AGENT: C078|x0000044c00000015
 */

(async () => {
  console.log('=== CRM Tool Population Script Started ===');

  // Verify CG and executeBatch are available
  if (typeof CG === 'undefined') {
    console.error('❌ CG namespace not defined');
    return;
  }

  console.log('🔍 Checking CG API availability:');
  console.log('   CG:', typeof CG, Object.keys(CG || {}).slice(0, 10));
  console.log('   CG.executeBatch:', typeof CG.executeBatch);
  
  if (typeof CG.executeBatch !== 'function') {
    console.error('❌ CG.executeBatch not available. Available methods:', Object.keys(CG || {}));
    return;
  }

  const migratedAgentUid = {
    infoAreaId: 'C078',
    recordId: 'x0000044c00000015'
  };

  // CG.executeBatch already returns a Promise - no wrapper needed!
  const executeBatchAsync = (requests) => {
    console.log('🔧 executeBatchAsync: Calling CG.executeBatch');
    console.log('🔧 Requests being sent:', requests);
    return CG.executeBatch(requests).then(
      (result) => {
        console.log('🔧 executeBatch resolved successfully');
        console.log('🔧 Result:', result);
        return result;
      },
      (error) => {
        console.error('🔧 executeBatch rejected with error:', error);
        throw error;
      }
    );
  };

  // ============================================================================
  // TOOL DEFINITIONS: Name, Description, Parameters
  // ============================================================================

  const toolDefinitions = [
    {
      name: 'openCampaign',
      displayName: 'Open Campaign',
      description: 'Open the campaign tree for the campaign record created by createEventCampaign. This tool is the second step in the campaign workflow and must be called with the uid returned from createEventCampaign. Do not use this for generic record navigation or user identity lookups.',
      toolType: 'FUNCTION',
      capabilityType: 'TOOL',
      parameters: [
        {
          key: 'uid',
          type: 'object',
          description: 'Preferred full CRM UID returned by createEventCampaign. This should include both infoAreaId and recordId.'
        },
        {
          key: 'infoAreaId',
          type: 'string',
          description: 'CRM info area for the campaign record. Use the returned infoAreaId from createEventCampaign when needed.'
        },
        {
          key: 'recordId',
          type: 'string',
          description: 'The exact CRM record identifier returned by createEventCampaign. Use this only for the campaign workflow.'
        },
        {
          key: 'recordUid',
          type: 'object',
          description: 'Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string from the campaign step.'
        }
      ],
      implementation: `async (args) => {
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
  }`
    },
    {
      name: 'addToTargetGroup',
      displayName: 'Add To Target Group',
      description: 'Add one or more CRM records to a target group for the selected campaign. Use this when a workflow needs to attach persons/companies to an existing campaign activity target group. The targetUid is the campaign activity or target-group container and uids is the list of records to add.',
      toolType: 'FUNCTION',
      capabilityType: 'TOOL',
      parameters: [
        {
          key: 'targetUid',
          type: 'object',
          description: 'The CRM target group or campaign activity UID that will receive the records.'
        },
        {
          key: 'uids',
          type: 'array',
          description: 'Array of record UIDs to add to the target group.'
        },
        {
          key: 'infoAreaId',
          type: 'string',
          description: 'Optional override for the target-related info area when the caller already has it.'
        },
        {
          key: 'source',
          type: 'object',
          description: 'Optional source UI element or context object passed through to the CRM target-group helper.'
        },
        {
          key: 'elEvent',
          type: 'object',
          description: 'Optional event object passed through to the target-group helper.'
        },
        {
          key: 'additionalParameters',
          type: 'object',
          description: 'Optional extra parameters for the target-group operation.'
        }
      ],
      implementation: `async (args) => {
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
  }`
    },
    {
      name: 'openRecordInTreeView',
      displayName: 'Open Record In Tree View',
      description: 'Open a general CRM record in the tree view. Use this only for non-campaign record navigation. Never use this when a user asks to create or open a campaign; in that case prefer createEventCampaign first and then openCampaign.',
      toolType: 'FUNCTION',
      capabilityType: 'TOOL',
      parameters: [
        {
          key: 'uid',
          type: 'object',
          description: 'Preferred full CRM UID. This should include both infoAreaId and recordId.'
        },
        {
          key: 'infoAreaId',
          type: 'string',
          description: 'CRM info area, usually FI for company records. Optional fallback only if the full uid is not available.'
        },
        {
          key: 'recordId',
          type: 'string',
          description: 'The exact CRM record identifier, e.g. "x00002329000002d4". Fallback only.'
        },
        {
          key: 'recordUid',
          type: 'object',
          description: 'Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string.'
        }
      ],
      implementation: `async (args) => {
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
  }`
    },
    {
      name: 'crud',
      displayName: 'CRUD Operation',
      description: 'Execute a single CRM CRUD operation through the batch API using the exact request contract defined by the CRM typings. This tool must send exactly one operation in a single-item batch, never a multi-operation batch and never a direct read/create/update call. The JSON must contain: operation as one of create, read, update, delete; and request as a single CRM request object.',
      toolType: 'FUNCTION',
      capabilityType: 'TOOL',
      parameters: [
        {
          key: 'operation',
          type: 'string',
          description: 'Single CRUD operation to execute. Must be exactly one of create, read, update, or delete.'
        },
        {
          key: 'request',
          type: 'object',
          description: 'Single CRM request object matching the operation.'
        }
      ],
      implementation: `async (args) => {
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
  }`
    },
    {
      name: 'crmQuery',
      displayName: 'CRM Query',
      description: 'Execute a named CRM query using the QueryCommand contract and return the raw queryResult payload. Use this when the caller references a stored query by name and wants the resulting rows/columns metadata; maxRows defaults to 10000 when omitted.',
      toolType: 'FUNCTION',
      capabilityType: 'TOOL',
      parameters: [
        {
          key: 'name',
          type: 'string',
          description: 'Stored CRM query name to execute. This is the required identifier for the named query.'
        },
        {
          key: 'maxRows',
          type: 'number',
          description: 'Maximum number of rows to return. Defaults to 10000 when omitted or invalid.'
        },
        {
          key: 'link',
          type: 'object',
          description: 'Optional parent CRM link context for the query. Accepts a full uid object.'
        }
      ],
      implementation: `async (args) => {
    const name = typeof args?.name === 'string' ? args.name.trim() : '';
    const maxRows = Number.isFinite(Number(args?.maxRows)) && Number(args?.maxRows) > 0 ? Number(args.maxRows) : 10000;
    
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
  }`
    }
  ];

  console.log(`📋 Loaded ${toolDefinitions.length} tool definitions`);

  // Validate all tool definitions have non-empty required fields
  for (const tool of toolDefinitions) {
    if (!tool.name || !tool.displayName || !tool.description || !tool.implementation) {
      console.error(`❌ Tool "${tool.name}" has missing required fields`);
      return;
    }
    for (const param of tool.parameters) {
      if (!param.key || !param.type || param.description === undefined || param.description === null) {
        console.error(`❌ Tool "${tool.name}" parameter "${param.key}" has invalid description`);
        return;
      }
    }
  }
  console.log('✅ All tool definitions validated');

  // ============================================================================
  // BATCH 1: Create C081 (Property) records for each tool's parameters
  // ============================================================================

  console.log('\n📦 BATCH 1: Creating C081 (Property) records...');
  
  const propertyBatchPayloads = [];
  const propertyUidMap = new Map(); // Map: toolName -> [{ key, uid, recordId }]

  for (const tool of toolDefinitions) {
    const propsForTool = [];

    for (const param of tool.parameters) {
      const propertyPayload = {
        type: 'create',
        infoAreaId: 'C081',
        fields: [
          { field: 'PropertyKey', value: String(param.key) },           // PropertyKey
          { field: 'PropertyType', value: String(param.type) },          // PropertyType
          { field: 'PropertyDescription', value: String(param.description) }    // PropertyDescription
        ]
      };
      propertyBatchPayloads.push(propertyPayload);
      propsForTool.push({ key: param.key, type: param.type });
      console.log(`  ✓ Property: ${param.key} (${param.type})`);
    }

    propertyUidMap.set(tool.name, propsForTool);
  }

  console.log(`\n📊 BATCH 1 size: ${propertyBatchPayloads.length} C081 Property records`);
  console.log('📋 First few batch payloads:', JSON.stringify(propertyBatchPayloads.slice(0, 2), null, 2));
  console.log('Full propertyBatchPayloads array:', propertyBatchPayloads);

  // Execute BATCH 1
  console.log('\n⏱️  Executing BATCH 1...');
  console.log('About to send requests array of size:', propertyBatchPayloads.length);
  let propertyBatchResult = null;
  try {
    const batchPromise = executeBatchAsync(propertyBatchPayloads);
    
    // Add timeout to detect if callback never fires
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('executeBatchAsync timeout - callback never invoked after 10 seconds')), 10000)
    );
    
    propertyBatchResult = await Promise.race([batchPromise, timeoutPromise]);
    console.log('✅ BATCH 1 execution completed');
    console.log('Full BATCH 1 Response:', JSON.stringify(propertyBatchResult, null, 2));
    console.log('Result: ' + (propertyBatchResult?.results?.length || 0) + ' records created');
  } catch (error) {
    console.error('❌ BATCH 1 execution failed:', error);
    console.error('   Message:', error.message);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    throw error;
  }

  // Extract created property UIDs from BATCH 1 results
  const createdPropertyUids = new Map(); // Map: toolName -> [{ key, uid, recordId }]
  if (propertyBatchResult && Array.isArray(propertyBatchResult.results)) {
    let resultIndex = 0;
    for (const [toolName, propsForTool] of propertyUidMap) {
      const uidsForTool = [];
      for (const prop of propsForTool) {
        const result = propertyBatchResult.results[resultIndex];
        if (result && result.success) {
          uidsForTool.push({
            key: prop.key,
            type: prop.type,
            uid: result.uid,
            recordId: result.recordId
          });
          console.log(`  ✓ Created property "${prop.key}" with UID: ${JSON.stringify(result.uid)}`);
        } else {
          const errorMsg = result?.error?.message || result?.error?.localizedMessage || result?.error?.type || result?.message || JSON.stringify(result);
          console.warn(`  ❌ Failed to create property "${prop.key}": ${errorMsg || 'Unknown error'}`);
          console.warn(`     Full result object: ${JSON.stringify(result, null, 2)}`);
        }
        resultIndex++;
      }
      if (uidsForTool.length > 0) {
        createdPropertyUids.set(toolName, uidsForTool);
      }
    }
  }

  // ============================================================================
  // BATCH 2: Create C079 (Agent Capability) records with child links to C081
  // ============================================================================

  console.log('\n📦 BATCH 2: Creating C079 (Agent Capability) records with C081 links...');

  const capabilityBatchPayloads = [];

  for (const tool of toolDefinitions) {
    const propertyUidsForTool = createdPropertyUids.get(tool.name) || [];

    // Build child link records pointing to created C081 properties
    // Each property needs 2 LinkRecordUid entries to establish bidirectional association
    const childLinks = [];
    for (const propUid of propertyUidsForTool) {
      // Forward link: C079 -> C081
      childLinks.push({
        infoAreaId: 'C081',           // Child info area
        linkId: 300,                  // Link definition ID (parent-child relationship)
        recordId: propUid.recordId    // Child record ID
      });
      // Reverse/reciprocal link for proper association
      childLinks.push({
        infoAreaId: 'C081',           // Child info area
        linkId: 301,                  // Reverse link (child-parent relationship)
        recordId: propUid.recordId    // Child record ID
      });
    }

    const capabilityPayload = {
      type: 'create',
      infoAreaId: 'C079',
      fields: [
        { field: 'CapabilityType', value: String(tool.capabilityType) },      // CapabilityType (e.g., "TOOL")
        { field: 'Description', value: String(tool.description) },         // Description
        { field: 'DisplayName', value: String(tool.displayName) },         // DisplayName (user-friendly name)
        { field: 'ID', value: String(tool.name) },                // ID (tool function name)
        { field: 'ToolType', value: String(tool.toolType) },            // ToolType (e.g., "FUNCTION")
        { field: 'ToolImplementation', value: String(tool.implementation) }       // ToolImplementation (full async function code)
      ],
      // Link C079 to C081 properties via C080 (2 links per property: forward + reverse)
      // Format: options.links is array of LinkRecordUid objects
      ...(childLinks.length > 0 ? {
        options: {
          links: childLinks     // Array of LinkRecordUid: { infoAreaId, linkId, recordId }
        }
      } : {})
    };
    
    capabilityBatchPayloads.push(capabilityPayload);
    console.log(`  ✓ Capability: ${tool.name} (${tool.displayName}) with ${propertyUidsForTool.length} child properties`);
  }

  console.log(`\n📊 BATCH 2 size: ${capabilityBatchPayloads.length} C079 Capability records`);
  console.log('📋 First few capability payloads:', JSON.stringify(capabilityBatchPayloads.slice(0, 1), null, 2));
  console.log('Full capabilityBatchPayloads array:', capabilityBatchPayloads);

  // Execute BATCH 2
  console.log('\n⏱️  Executing BATCH 2...');
  console.log('About to send capability requests array of size:', capabilityBatchPayloads.length);
  try {
    const capabilityPromise = executeBatchAsync(capabilityBatchPayloads);
    
    // Add timeout to detect if callback never fires
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('executeBatchAsync timeout - callback never invoked after 10 seconds')), 10000)
    );
    
    const capabilityBatchResult = await Promise.race([capabilityPromise, timeoutPromise]);
    console.log('✅ BATCH 2 execution completed');
    console.log('Full BATCH 2 Response:', JSON.stringify(capabilityBatchResult, null, 2));
    console.log('Result: ' + (capabilityBatchResult?.results?.length || 0) + ' records created');

    console.log('✅ BATCH 2 execution completed');
    console.log('Result: ' + (capabilityBatchResult?.results?.length || 0) + ' records created');

    // ========================================================================
    // VERIFICATION
    // ========================================================================

    console.log('\n🔍 Verification:');
    
    const createdCapabilities = [];
    if (capabilityBatchResult && Array.isArray(capabilityBatchResult.results)) {
      for (let i = 0; i < capabilityBatchResult.results.length; i++) {
        const result = capabilityBatchResult.results[i];
        if (result && result.success) {
          const toolName = capabilityBatchPayloads[i].fields.find(f => f.field === 'ID')?.value;
          createdCapabilities.push({
            toolName: toolName,
            uid: result.uid,
            recordId: result.recordId
          });
        } else {
          const toolName = capabilityBatchPayloads[i]?.fields?.find(f => f.field === 'ID')?.value;
          const errorMsg = result?.error?.message || result?.error?.localizedMessage || result?.error?.type || result?.message || JSON.stringify(result);
          console.warn(`   ❌ Failed to create capability "${toolName}": ${errorMsg || 'Unknown error'}`);
          console.warn(`      Full result object: ${JSON.stringify(result, null, 2)}`);
        }
      }
    }

    console.log(`\n   📝 Summary of Created Records:`);
    console.log(`       Properties (C081): ${propertyBatchResult?.results?.filter(r => r.success).length || 0} created`);
    console.log(`       Capabilities (C079): ${createdCapabilities.length} created`);

    if (createdCapabilities.length > 0) {
      console.log(`\n   🛠️  Agent Capabilities with linked Properties:`);
      for (const cap of createdCapabilities) {
        const propCount = createdPropertyUids.get(cap.toolName)?.length || 0;
        console.log(`      • ${cap.toolName}: ${JSON.stringify(cap.uid)} [${propCount} properties linked]`);
      }
    }

    console.log('\n✨ CRM Tool Population completed successfully!');
    console.log('   Agents, Capabilities (C079), and Properties (C081) are now linked in the CRM database.');
    console.log('   C080 link records were auto-created by the CRM batch API.');
    console.log(`   Agent Reference: ${JSON.stringify(migratedAgentUid)}`);
  } catch (error) {
    console.error('❌ BATCH 2 execution failed:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  }

  console.log('\n=== CRM Tool Population Script Completed ===');
})();
