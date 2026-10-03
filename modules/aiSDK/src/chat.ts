import { read, readLink } from '../../frontend/src/extensions/Crud';

const addToTargetGroup = (...args: any[]) => (globalThis as any).LGT.CRMExtensions.addToTargetGroup(...args);
const executeBatch = (...args: any[]) => (globalThis as any).LGT.CRMExtensions.executeBatch(...args);
const executeQuery = (...args: any[]) => (globalThis as any).LGT.CRMExtensions.executeQuery(...args);
const openDefaultAction = (...args: any[]) => (globalThis as any).LGT.Tools.UI.OpenDefaultAction(...args);
const openTreeByBool = (...args: any[]) => (globalThis as any).LGT.Tools.UI.OpenTreeByBool(...args);

const eventCampaignUid: RecordUid = {
  infoAreaId: "CM",
  recordId: "x0000044c000012b9",
};

const migratedAgentUid: RecordUid = {
  infoAreaId: "C078",
  recordId: "x0000044c00000015",
};

const firstRecordFromResponse = (value: any): any => {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.find((entry) => entry && typeof entry === "object") ?? null;
  }

  if (Array.isArray(value.records)) {
    return value.records[0] ?? null;
  }

  if (Array.isArray(value.items)) {
    return value.items[0] ?? null;
  }

  if (value.businessObject && typeof value.businessObject === "object") {
    return value.businessObject;
  }

  return value;
};

const coerceRecordList = (value: any): any[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === "object");
  }

  if (Array.isArray(value.records)) {
    return value.records.filter((entry) => entry && typeof entry === "object");
  }

  if (Array.isArray(value.items)) {
    return value.items.filter((entry) => entry && typeof entry === "object");
  }

  if (typeof value === "object") {
    return [value];
  }

  return [];
};

// Convert CRM property type codes to JSON Schema types
const convertCrmTypeToJsonSchema = (crmTypeCode: string): string => {
  // CRM type codes:
  // 0 = string
  // 1 = number/integer
  // 2 = boolean
  // 3 = date
  const codeStr = String(crmTypeCode).trim();
  switch (codeStr) {
    case "1":
      return "number";
    case "2":
      return "boolean";
    case "3":
      return "string"; // Date as ISO string
    case "0":
    default:
      return "string";
  }
};

export class PropertySchema {
  private jsonSchemaType: string;

  constructor(
    public key: string,
    crmType: string,
    public description: string,
  ) {
    // Convert CRM type code to JSON Schema type
    this.jsonSchemaType = convertCrmTypeToJsonSchema(crmType);
  }

  toJsonSchema(): Record<string, any> {
    return {
      type: this.jsonSchemaType,
      description: String(this.description).trim(),
    };
  }
}

export class ToolSchema {
  constructor(
    public name: string,
    public description: string,
    public properties: PropertySchema[],
  ) {}

  toToolDefinition(): any {
    const schemaProperties: Record<string, any> = {};
    for (const property of this.properties) {
      schemaProperties[property.key] = property.toJsonSchema();
    }

    return {
      type: "function",
      function: {
        name: String(this.name).trim(),
        description: String(this.description).trim(),
        parameters: {
          type: "object",
          properties: schemaProperties,
          required: Object.keys(schemaProperties),
        },
      },
    };
  }
}

export const mapPropertyRecordToSchema = (propertyRecord: any): PropertySchema | null => {
  // Extract businessObject directly from the response without fallback chain.
  // C081 (Parameter Property) schema: PropertyKey, PropertyType, PropertyDescription (all required).
  const propertyBusinessObject = firstRecordFromResponse(propertyRecord) as u8.Crm.BusinessObject;
  if (!propertyBusinessObject) {
    console.log("mapPropertyRecordToSchema: propertyBusinessObject is null");
    return null;
  }

  // Handle both BusinessObject (has .get method) and plain objects (from link reads)
  const propertyKey = typeof propertyBusinessObject.get === 'function'
    ? propertyBusinessObject.get<string>("PropertyKey")
    : (propertyBusinessObject as any)["PropertyKey"] || (propertyBusinessObject as any)["7006"];
  
  const propertyType = typeof propertyBusinessObject.get === 'function'
    ? propertyBusinessObject.get<string>("PropertyType")
    : (propertyBusinessObject as any)["PropertyType"] || (propertyBusinessObject as any)["7007"];
  
  const propertyDescription = typeof propertyBusinessObject.get === 'function'
    ? propertyBusinessObject.get<string>("PropertyDescription")
    : (propertyBusinessObject as any)["PropertyDescription"] || (propertyBusinessObject as any)["7008"];

  console.log("mapPropertyRecordToSchema extracted fields:", {
    propertyKey,
    propertyType,
    propertyDescription
  });

  if (!propertyKey || !propertyType || !propertyDescription) {
    console.log("mapPropertyRecordToSchema: missing required fields", {
      hasKey: !!propertyKey,
      hasType: !!propertyType,
      hasDescription: !!propertyDescription
    });
    return null;
  }

  return new PropertySchema(String(propertyKey).trim(), String(propertyType).trim(), String(propertyDescription).trim());
};

export const mapCapabilityRecordToToolSchema = (capabilityRecord: any, propertyRecords: any[] = []): ToolSchema | null => {
  // Extract businessObject directly from the response without fallback chain.
  // C079 (Agent Capability) schema: DisplayName, Description, ID, ToolType, ToolImplementation, CapabilityType.
  // Use only canonical field names; no fallback to alternative field names.
  const capabilityBusinessObject = firstRecordFromResponse(capabilityRecord) as u8.Crm.BusinessObject;
  if (!capabilityBusinessObject) {
    console.log("mapCapabilityRecordToToolSchema: capabilityBusinessObject is null");
    return null;
  }

  // Log the entire object to see what fields are available
  console.log("mapCapabilityRecordToToolSchema: capabilityBusinessObject contents:", capabilityBusinessObject);
  console.log("mapCapabilityRecordToToolSchema: capabilityBusinessObject keys:", Object.keys(capabilityBusinessObject));
  console.log("mapCapabilityRecordToToolSchema: capabilityBusinessObject.values array:", capabilityBusinessObject.values);
  if (Array.isArray(capabilityBusinessObject.values)) {
    console.log("mapCapabilityRecordToToolSchema: values array contents:");
    for (const pair of capabilityBusinessObject.values) {
      console.log("  Field:", pair.field, "Value:", pair.value);
    }
  }
  
  // Extract fields from C079 using exact datamodel field names (no coalesce chains).
  const capabilityId = capabilityBusinessObject.get<string>("ID");
  const toolName = capabilityBusinessObject.get<string>("DisplayName");
  const capabilityDescription = capabilityBusinessObject.get<string>("Description");

  console.log("mapCapabilityRecordToToolSchema extracted fields:", {
    capabilityId,
    toolName,
    capabilityDescription,
    propertyRecordsLength: propertyRecords.length
  });

  if (!capabilityId || !toolName || !capabilityDescription) {
    console.log("mapCapabilityRecordToToolSchema: missing required fields", {
      hasId: !!capabilityId,
      hasName: !!toolName,
      hasDescription: !!capabilityDescription
    });
    return null;
  }

  const mappedProperties = propertyRecords
    .map(mapPropertyRecordToSchema)
    .filter((property): property is PropertySchema => !!property);

  if (mappedProperties.length === 0) {
    return null;
  }

  // Use capabilityId (ID field) as the function name, not toolName (DisplayName)
  return new ToolSchema(String(capabilityId).trim(), String(capabilityDescription).trim(), mappedProperties);
};


export const readToolCapability = async (): Promise<{ capabilityRecord: any; parameterRecords: any[]; propertyRecords: any[] } | null> => {
  try {
    // Use readLink to directly navigate from C078 Agent to C079 Agent Capability
    // through C082 association using proper link names
    const linkedAssociationResponse = await readLink({
      uid: migratedAgentUid,
      linkName: "$Link[C082]",
    });

    if (!linkedAssociationResponse) {
      console.warn("No association found via $Link[C082]");
      return null;
    }

    const associationBusinessObject = firstRecordFromResponse(linkedAssociationResponse) as u8.Crm.BusinessObject;
    
    if (!associationBusinessObject?.uid) {
      console.warn("Could not extract association UID from linked response");
      return null;
    }

    // Now navigate from C082 association to C079 capability
    const linkedCapabilityResponse = await readLink({
      uid: associationBusinessObject.uid,
      linkName: "$Link[C079]",
    });

    if (!linkedCapabilityResponse) {
      console.warn("No capability found via $Link[C079]");
      return null;
    }

    const linkedCapabilityBusinessObject = firstRecordFromResponse(linkedCapabilityResponse) as u8.Crm.BusinessObject;
    
    if (!linkedCapabilityBusinessObject?.uid) {
      console.warn("Could not extract capability UID from linked response");
      return null;
    }

    console.log("Resolved capability UID:", linkedCapabilityBusinessObject.uid);

    // Read the full capability record (C079) with all required fields: ID, DisplayName, Description
    const fullCapabilityRecordResponse = await read({
      uid: linkedCapabilityBusinessObject.uid,
      fields: ["ID", "DisplayName", "Description", "ToolType", "ToolImplementation", "CapabilityType"],
    } as any);

    console.log("=== CAPABILITY RECORD READ RESPONSE ===");
    console.log("fullCapabilityRecordResponse:", JSON.stringify(fullCapabilityRecordResponse, null, 2));
    console.log("firstRecordFromResponse result:", JSON.stringify(firstRecordFromResponse(fullCapabilityRecordResponse), null, 2));
    console.log("=====================================");

    const capabilityRecord = fullCapabilityRecordResponse;

    // Read the parameter records (C080) linked to the capability
    // Use readLink() to get C080 UIDs, then read() to fetch their field values
    const parameterLinkResponse = await readLink({
      uid: linkedCapabilityBusinessObject.uid,
      linkName: "$Link[C080]",
    } as any);

    console.log("=== PARAMETER RECORDS READ RESPONSE (from readLink) ===");
    console.log("parameterLinkResponse:", JSON.stringify(parameterLinkResponse, null, 2));
    console.log("====================================================");

    const linkedParameterRecords = coerceRecordList(parameterLinkResponse);
    console.log("Linked parameter records count:", linkedParameterRecords.length);

    // C080 is a navigation bridge to C081 - store UIDs without reading C080 fields
    const parameterRecords: any[] = [];
    for (let i = 0; i < linkedParameterRecords.length; i++) {
      const linkedParam = firstRecordFromResponse(linkedParameterRecords[i]) as u8.Crm.BusinessObject;
      if (!linkedParam?.uid) {
        console.warn(`Parameter record ${i} from readLink has no uid`);
        continue;
      }

      // Store the parameter record UID for navigation to C081
      parameterRecords.push(linkedParam);
    }

    console.log("Parameter records with fields count:", parameterRecords.length);

    const propertyRecords: any[] = [];

    for (let i = 0; i < parameterRecords.length; i++) {
      const parameterBusinessObject = parameterRecords[i] as u8.Crm.BusinessObject;
      
      if (!parameterBusinessObject || !parameterBusinessObject.uid) {
        console.warn(`Parameter record ${i} has no valid uid`);
        continue;
      }

      try {
        // Read C081 properties linked to the parameter via $Link[C081]
        // Use readLink() to get C081 UIDs, then read() to fetch their field values
        const propertyLinkResponse = await readLink({
          uid: parameterBusinessObject.uid,
          linkName: "$Link[C081]",
        });

        console.log(`=== PROPERTY LINK RESPONSE FOR PARAMETER ${i} (from readLink) ===`);
        console.log("propertyLinkResponse:", JSON.stringify(propertyLinkResponse, null, 2));
        console.log("===============================================================");

        const linkedPropertyRecords = coerceRecordList(propertyLinkResponse);
        
        // Now fetch the actual field values for each property record
        for (let j = 0; j < linkedPropertyRecords.length; j++) {
          const linkedProperty = firstRecordFromResponse(linkedPropertyRecords[j]) as u8.Crm.BusinessObject;
          if (!linkedProperty?.uid) {
            console.warn(`Property record ${i}.${j} from readLink has no uid`);
            continue;
          }

          try {
            // Read the property record to get its field values
            const propertyFieldResponse = await read({
              uid: linkedProperty.uid,
              fields: ["PropertyKey", "PropertyType", "PropertyDescription"],
            });

            console.log(`=== PROPERTY FIELDS FOR PARAMETER ${i}, PROPERTY ${j} ===`);
            console.log("propertyFieldResponse:", JSON.stringify(propertyFieldResponse, null, 2));
            console.log("=======================================================");

            propertyRecords.push(propertyFieldResponse);
          } catch (fieldError) {
            console.warn(`Failed to read fields for property record ${i}.${j}:`, fieldError);
            continue;
          }
        }
      } catch (linkError) {
        console.warn(`Failed to read $Link[C081] for parameter record ${i}`, linkError);
        continue;
      }
    }

    console.log("Property records count:", propertyRecords.length);
    return {
      capabilityRecord,
      parameterRecords,
      propertyRecords,
    };
  } catch (error) {
    console.error("Failed to load migrated tool capability from CRM DB.", error);
    return null;
  }
};

const buildMigratedGetUserIdentityTool = (capabilityRecord: any, propertyRecords: any[] = []): any | null => {
  console.log("buildMigratedGetUserIdentityTool: called with", {
    hasCapabilityRecord: !!capabilityRecord,
    propertyRecordsLength: propertyRecords.length
  });
  const toolSchema = mapCapabilityRecordToToolSchema(capabilityRecord, propertyRecords);
  if (!toolSchema) {
    console.log("buildMigratedGetUserIdentityTool: mapCapabilityRecordToToolSchema returned null");
    return null;
  }
  const toolDefinition = toolSchema.toToolDefinition();
  console.log("buildMigratedGetUserIdentityTool: successfully created tool definition", { 
    name: toolDefinition.function.name 
  });
  return toolDefinition;
};

const tools = [
  {
    type: "function",
    function: {
      name: "openCampaign",
      description: "Open the campaign tree for the campaign record created by createEventCampaign. This tool is the second step in the campaign workflow and must be called with the uid returned from createEventCampaign. Do not use this for generic record navigation or user identity lookups.",
      parameters: {
        type: "object",
        properties: {
          uid: {
            type: "object",
            description: "Preferred full CRM UID returned by createEventCampaign. This should include both infoAreaId and recordId."
          },
          infoAreaId: {
            type: "string",
            description: "CRM info area for the campaign record. Use the returned infoAreaId from createEventCampaign when needed."
          },
          recordId: {
            type: "string",
            description: "The exact CRM record identifier returned by createEventCampaign. Use this only for the campaign workflow."
          },
          recordUid: {
            type: "object",
            description: "Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string from the campaign step."
          },
        },
        required: ["recordId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToTargetGroup",
      description: "Add one or more CRM records to a target group for the selected campaign. Use this when a workflow needs to attach persons/companies to an existing campaign activity target group. The targetUid is the campaign activity or target-group container and uids is the list of records to add.",
      parameters: {
        type: "object",
        properties: {
          targetUid: {
            type: "object",
            description: "The CRM target group or campaign activity UID that will receive the records."
          },
          uids: {
            type: "array",
            description: "Array of record UIDs to add to the target group.",
            items: {
              type: "object",
            },
          },
          infoAreaId: {
            type: "string",
            description: "Optional override for the target-related info area when the caller already has it."
          },
          source: {
            type: "object",
            description: "Optional source UI element or context object passed through to the CRM target-group helper."
          },
          elEvent: {
            type: "object",
            description: "Optional event object passed through to the target-group helper."
          },
          additionalParameters: {
            type: "object",
            description: "Optional extra parameters for the target-group operation.",
            additionalProperties: true,
          },
        },
        required: ["targetUid", "uids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "openRecordInTreeView",
      description: "Open a general CRM record in the tree view. Use this only for non-campaign record navigation. Never use this when a user asks to create or open a campaign; in that case prefer createEventCampaign first and then openCampaign.",
      parameters: {
        type: "object",
        properties: {
          uid: {
            type: "object",
            description: "Preferred full CRM UID. This should include both infoAreaId and recordId."
          },
          infoAreaId: {
            type: "string",
            description: "CRM info area, usually FI for company records. Optional fallback only if the full uid is not available."
          },
          recordId: {
            type: "string",
            description: "The exact CRM record identifier, e.g. 'x00002329000002d4'. Fallback only."
          },
          recordUid: {
            type: "object",
            description: "Legacy recordUid fallback. Only use when the caller already has a CRM UID object/string."
          },
        },
        required: ["recordId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crud",
      description: "Execute a single CRM CRUD operation through the batch API using the exact request contract defined by the CRM typings. This tool must send exactly one operation in a single-item batch, never a multi-operation batch and never a direct read/create/update call. The JSON must contain: operation as one of create, read, update, delete; and request as a single CRM request object. Use the real request contracts from the CRM typings: read = { uid: RecordUid, fields?: [...], linkName?: string, options?: any, autoLoad?: boolean }; create = { infoAreaId: string, fields?: [...], options?: { links?: [...] } }; update = { businessObject?: object, uid?: RecordUid, fields?: [...], options?: { catalogValueEncoding?: any, links?: [...] } }; delete = { uid: RecordUid }. Always send the request as a plain object, not as a wrapped batch payload.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["create", "read", "update", "delete"],
            description: "Single CRUD operation to execute. Must be exactly one of create, read, update, or delete."
          },
          request: {
            type: "object",
            description: "Single CRM request object matching the operation. Example read payload: { uid: { infoAreaId: 'FI', recordId: 'x00002329000002d4' }, fields: ['name'] }. Example create payload: { infoAreaId: 'FI', fields: [{ fieldId: 123, value: 'abc' }] }. Example update payload: { uid: { infoAreaId: 'FI', recordId: 'x00002329000002d4' }, fields: [{ fieldId: 123, value: 'new value' }] }. Example delete payload: { uid: { infoAreaId: 'FI', recordId: 'x00002329000002d4' } }.",
            additionalProperties: true,
          },
        },
        required: ["operation", "request"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crmQuery",
      description: "Execute a named CRM query using the QueryCommand contract and return the raw queryResult payload. Use this when the caller references a stored query by name and wants the resulting rows/columns metadata; maxRows defaults to 10000 when omitted. The optional link is the parent CRM link context for the query.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Stored CRM query name to execute. This is the required identifier for the named query."
          },
          maxRows: {
            type: "number",
            description: "Maximum number of rows to return. Defaults to 10000 when omitted or invalid."
          },
          link: {
            type: "object",
            description: "Optional parent CRM link context for the query. Accepts a full uid object."
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

export const buildToolsForPrompt = async (_userPrompt: string) => {
  // Read tool capability for the migrated agent using readToolCapability
  const capabilityData = await readToolCapability();
  console.log("buildToolsForPrompt: readToolCapability returned", {
    hasCapabilityRecord: !!capabilityData?.capabilityRecord,
    propertyRecordsCount: capabilityData?.propertyRecords?.length ?? 0
  });
  
  const mergedTools = [...tools];
  const seenNames = new Set(mergedTools.map((tool: any) => tool?.function?.name).filter(Boolean));

  // Build tool from the capability data
  if (capabilityData) {
    const migratedTool = buildMigratedGetUserIdentityTool(capabilityData.capabilityRecord, capabilityData.propertyRecords);

    if (migratedTool) {
      console.log(`buildToolsForPrompt: processing migrated capability`, {
        toolName: migratedTool.function?.name
      });

      if (!seenNames.has(migratedTool.function.name)) {
        console.log(`buildToolsForPrompt: adding new tool from migrated capability`, { name: migratedTool.function.name });
        mergedTools.push(migratedTool);
        seenNames.add(migratedTool.function.name);
      } else {
        console.log(`buildToolsForPrompt: replacing existing tool from migrated capability`, { name: migratedTool.function.name });
        const index = mergedTools.findIndex((tool: any) => tool?.function?.name === migratedTool.function.name);
        if (index >= 0) {
          mergedTools[index] = migratedTool;
        }
      }
    } else {
      console.warn(`buildToolsForPrompt: migrated capability returned null tool`);
    }
  } else {
    console.warn("buildToolsForPrompt: readToolCapability returned no data");
  }

  console.log("buildToolsForPrompt: final tool count", { count: mergedTools.length });
  return mergedTools;
};

export const resolveToolChoice = (userPrompt: string, messages: any[] = []) => {
  const prompt = String(userPrompt ?? "").toLowerCase();
  const isCampaignWorkflow = /create.*campaign|campaign.*name|open.*campaign|campaign named|campaign/i.test(prompt);

  if (!isCampaignWorkflow) {
    return "auto";
  }

  const previousToolNames = (messages || [])
    .flatMap((message: any) => {
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
      return toolCalls.map((toolCall: any) => toolCall?.function?.name).filter(Boolean);
    })
    .filter((name: string) => !!name);

  const sawCreateCampaign = previousToolNames.includes("createEventCampaign");
  const sawOpenCampaign = previousToolNames.includes("openCampaign");

  if (!sawCreateCampaign) {
    return "required";
  }

  if (!sawOpenCampaign) {
    return "required";
  }

  // Keep the model in tool-call mode for follow-up workflow steps like crmQuery.
  // Forcing "none" here prematurely stops the sequence and makes the model emit raw tool text as final content.
  return "auto";
};

const isDummyRecordIdentifier = (value: any): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  const text = String(value).trim().toLowerCase();
  if (!text) {
    return false;
  }

  return text.includes("company_record")
    || text.includes("record_12345")
    || text.includes("dummy")
    || text.includes("sample")
    || text.includes("example")
    || text.includes("test_record");
};

const normalizeRecordUid = (value: any): RecordUid | undefined => {
  if (!value) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isDummyRecordIdentifier(trimmed)) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if (parsed.recordId !== undefined || parsed.infoAreaId !== undefined) {
          return normalizeRecordUid({
            infoAreaId: parsed.infoAreaId ?? "FI",
            recordId: parsed.recordId,
          });
        }

        if (parsed.recordUid !== undefined) {
          return normalizeRecordUid(parsed.recordUid);
        }
      }
    } catch {
      // fall through to CRM parser below
    }

    const flattenedMatch = trimmed.match(/^([A-Za-z]+)[_:]([A-Za-z0-9]+)$/);
    if (flattenedMatch) {
      return {
        infoAreaId: flattenedMatch[1],
        recordId: flattenedMatch[2],
      } as RecordUid;
    }

    if (trimmed.includes(":")) {
      const [infoAreaId, recordId] = trimmed.split(":");
      if (infoAreaId && recordId !== undefined) {
        return { infoAreaId, recordId } as RecordUid;
      }
    }

    if (/^x[0-9a-f]+$/i.test(trimmed) || /^[0-9a-f]+$/i.test(trimmed)) {
      return {
        infoAreaId: "FI",
        recordId: trimmed,
      } as RecordUid;
    }

    if (typeof u8 !== "undefined" && typeof u8?.parseRecordUid === "function") {
      return u8.parseRecordUid(trimmed);
    }

    return undefined;
  }

  if (typeof value === "object") {
    // Canonical CRM contract: prefer flat recordId + infoAreaId, with recordUid as legacy fallback.
    if (value.recordId !== undefined || value.infoAreaId !== undefined) {
      const recordId = String(value.recordId ?? "").trim();
      if (!recordId || isDummyRecordIdentifier(recordId)) {
        return undefined;
      }

      return {
        infoAreaId: value.infoAreaId ?? "FI",
        recordId: recordId,
      } as RecordUid;
    }

    if (value.recordUid !== undefined) {
      return normalizeRecordUid(value.recordUid);
    }
  }

  return undefined;
};

const toPlainData = (value: any, seen = new WeakSet()): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "function") {
    return undefined;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainData(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const plainObject: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value)) {
      const converted = toPlainData(entry, seen);
      if (converted !== undefined) {
        plainObject[key] = converted;
      }
    }

    seen.delete(value);
    return plainObject;
  }

  return String(value);
};

const normalizeToolArguments = (functionName: string, argumentsObject: any) => {
  if (functionName === "createEventCampaign") {
    const name = typeof argumentsObject?.name === "string" ? argumentsObject.name.trim() : "";
    if (!name) {
      return {};
    }

    return { name };
  }

  if (functionName === "openRecordInTreeView") {
    const explicitRecordId = argumentsObject?.recordId;
    const explicitInfoAreaId = argumentsObject?.infoAreaId;
    const recordUidInput =
      (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
        ? {
            infoAreaId: explicitInfoAreaId ?? "FI",
            recordId: explicitRecordId,
          }
        : argumentsObject?.uid ?? argumentsObject?.recordUid;

    const normalizedRecordUid = normalizeRecordUid(recordUidInput);

    if (normalizedRecordUid && normalizedRecordUid.infoAreaId && normalizedRecordUid.recordId) {
      return {
        infoAreaId: normalizedRecordUid.infoAreaId ?? "FI",
        recordId: normalizedRecordUid.recordId,
      };
    }

    return {};
  }

  if (functionName === "openCampaign") {
    const explicitRecordId = argumentsObject?.recordId;
    const explicitInfoAreaId = argumentsObject?.infoAreaId;
    const recordUidInput =
      (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
        ? {
            infoAreaId: explicitInfoAreaId ?? "CM",
            recordId: explicitRecordId,
          }
        : argumentsObject?.uid ?? argumentsObject?.recordUid;

    const normalizedRecordUid = normalizeRecordUid(recordUidInput);

    if (normalizedRecordUid && normalizedRecordUid.infoAreaId && normalizedRecordUid.recordId) {
      return {
        infoAreaId: normalizedRecordUid.infoAreaId ?? "CM",
        recordId: normalizedRecordUid.recordId,
      };
    }

    return {};
  }

  if (functionName === "addToTargetGroup") {
    const targetUidInput = argumentsObject?.targetUid ?? argumentsObject?.uid ?? argumentsObject?.recordUid;
    const normalizedTargetUid = normalizeRecordUid(targetUidInput);
    const rawUids = Array.isArray(argumentsObject?.uids) ? argumentsObject.uids : [];
    const normalizedUids = rawUids
      .map((uidValue: any) => normalizeRecordUid(uidValue))
      .filter((uid: RecordUid | undefined): uid is RecordUid => !!uid);

    if (!normalizedTargetUid || normalizedUids.length === 0) {
      return {};
    }

    return {
      targetUid: normalizedTargetUid,
      uids: normalizedUids,
      ...(argumentsObject?.infoAreaId ? { infoAreaId: String(argumentsObject.infoAreaId) } : {}),
      ...(argumentsObject?.source !== undefined ? { source: argumentsObject.source } : {}),
      ...(argumentsObject?.elEvent !== undefined ? { elEvent: argumentsObject.elEvent } : {}),
      ...(argumentsObject?.additionalParameters !== undefined ? { additionalParameters: argumentsObject.additionalParameters } : {}),
    };
  }

  if (functionName === "crud") {
    const operation = String(argumentsObject?.operation ?? "").trim().toLowerCase();
    let request = argumentsObject?.request ?? {};

    if (typeof request === "string") {
      try {
        request = JSON.parse(request);
      } catch {
        return {};
      }
    }

    if (!operation || !request || typeof request !== "object") {
      return {};
    }

    if (request.uid && typeof request.uid === "string") {
      const normalizedUid = normalizeRecordUid(request.uid);
      if (normalizedUid) {
        request = { ...request, uid: normalizedUid };
      }
    }

    if (!request.uid && request.recordUid) {
      const normalizedUid = normalizeRecordUid(request.recordUid);
      if (normalizedUid) {
        request = { ...request, uid: normalizedUid };
      }
    }

    if (!request.uid && request.infoAreaId && request.recordId) {
      request = {
        ...request,
        uid: {
          infoAreaId: request.infoAreaId,
          recordId: request.recordId,
        },
      };
    }

    return {
      operation,
      request,
    };
  }

  if (functionName === "crmQuery") {
    const name = typeof argumentsObject?.name === "string" ? argumentsObject.name.trim() : "";
    const maxRowsValue = Number(argumentsObject?.maxRows ?? 10000);
    const maxRows = Number.isFinite(maxRowsValue) && maxRowsValue > 0 ? maxRowsValue : 10000;
    const linkInput = argumentsObject?.link;
    const normalizedLink = normalizeRecordUid(linkInput) ?? (typeof linkInput === "object" && linkInput !== null ? linkInput : undefined);

    if (!name) {
      return {};
    }

    return {
      name,
      maxRows,
      ...(normalizedLink ? { link: normalizedLink } : {}),
    };
  }

  return argumentsObject ?? {};
};

export const sanitizeToolCall = (toolCall: any) => {
  if (!toolCall || !toolCall.function) {
    return null;
  }

  const functionName = toolCall.function.name;
  const allowedToolNames = new Set([
    ...(tools as any[]).map((tool: any) => tool?.function?.name).filter(Boolean),
    "getUserIdentity",
  ]);

  if (!functionName || !allowedToolNames.has(functionName)) {
    return null;
  }

  try {
    const parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
    const normalizedArgs = normalizeToolArguments(functionName, parsedArgs);

    if (functionName === "createEventCampaign" && !normalizedArgs?.name) {
      return null;
    }

    if (functionName === "openRecordInTreeView") {
      const isCampaignLikeName = typeof parsedArgs?.recordId === "string" && /campaign|tournier|golf/i.test(String(parsedArgs.recordId));
      if (isCampaignLikeName) {
        return null;
      }

      if (!(normalizedArgs?.uid || (normalizedArgs?.infoAreaId && normalizedArgs?.recordId))) {
        return null;
      }
    }

    if (functionName === "openCampaign" && !(normalizedArgs?.uid || (normalizedArgs?.infoAreaId && normalizedArgs?.recordId))) {
      return null;
    }

    if (functionName === "addToTargetGroup") {
      const targetUid = normalizedArgs?.targetUid ?? normalizedArgs?.uid;
      const uids = Array.isArray(normalizedArgs?.uids) ? normalizedArgs.uids : [];
      if (!targetUid || uids.length === 0) {
        return null;
      }
    }

    if (functionName === "crud") {
      const operation = String(normalizedArgs?.operation ?? "").trim().toLowerCase();
      const request = normalizedArgs?.request;
      if (!operation || !request || typeof request !== "object") {
        return null;
      }
      if (!["create", "read", "update", "delete"].includes(operation)) {
        return null;
      }
    }

    if (functionName === "crmQuery") {
      if (!normalizedArgs?.name) {
        return null;
      }
    }

    return {
      type: toolCall.type ?? "function",
      id: toolCall.id,
      function: {
        name: functionName,
        arguments: JSON.stringify(normalizedArgs),
      },
    };
  } catch {
    return null;
  }
};

export const parseMalformedToolCallContent = (content: any): any | null => {
  if (typeof content !== "string") {
    return null;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed
    .replace(/<\|/g, "")
    .replace(/\|>/g, "")
    .replace(/<\//g, "")
    .replace(/tool_call/gi, "")
    .replace(/[<>]/g, "")
    .replace(/^call\s*:\s*/i, "")
    .trim();

  if (!cleaned || !/^[A-Za-z_][A-Za-z0-9_]*\s*\{/.test(cleaned)) {
    return null;
  }

  const match = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*)\}\s*$/);
  if (!match) {
    return null;
  }

  const [, rawName, rawArgs] = match;
  const functionName = rawName.toLowerCase() === "executequery" ? "crmQuery" : rawName;

  const normalizedArgs: Record<string, any> = {};
  const sanitizedArgs = rawArgs
    .replace(/\\"/g, '"')
    .replace(/"\s*:\s*"/g, '":"')
    .trim();

  const argMatches = Array.from(sanitizedArgs.matchAll(/([A-Za-z0-9_]+)\s*:\s*(?:"([^"]*)"|([^,}]+))/g));
  for (const argMatch of argMatches) {
    const [, key, quotedValue, plainValue] = argMatch;
    const value = quotedValue !== undefined ? quotedValue : plainValue?.trim();
    if (value !== undefined) {
      normalizedArgs[key] = value.replace(/\s+/g, " ").trim();
    }
  }

  if (Object.keys(normalizedArgs).length === 0) {
    return null;
  }

  if (functionName === "crmQuery") {
    const name = normalizedArgs.queryName ?? normalizedArgs.name ?? normalizedArgs.query ?? "";
    if (!name) {
      return null;
    }

    return {
      type: "function",
      id: `malformed-tool-${Date.now().toString(36)}`,
      function: {
        name: "crmQuery",
        arguments: JSON.stringify({ name, maxRows: Number(normalizedArgs.maxRows) || 10000 }),
      },
    };
  }

  return {
    type: "function",
    id: `malformed-tool-${Date.now().toString(36)}`,
    function: {
      name: functionName,
      arguments: JSON.stringify(normalizedArgs),
    },
  };
};

export const buildAssistantToolMessage = (_message: any, normalizedToolCalls: any[]) => ({
  role: "assistant",
  content: "",
  tool_calls: normalizedToolCalls.map((toolCall: any) => ({
    type: toolCall.type ?? "function",
    id: toolCall.id,
    function: {
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    },
  })),
});

export const availableFunctions: Record<string, Function> = {
  getUserIdentity: async (_args: any) => {
    const identity = typeof u8 !== "undefined" && u8?.session?.identity && typeof u8.session.identity === "object"
      ? u8.session.identity
      : null;

    if (!identity) {
      return {
        success: false,
        message: "Current CRM identity is not available in this context; u8.session.identity is undefined.",
      };
    }

    return {
      success: true,
      identity,
      userName: identity?.userName ?? null,
      companyUid: identity?.companyUid ?? null,
      personUid: identity?.personUid ?? null,
      repId: identity?.repId ?? null,
      message: "Resolved current CRM identity.",
    };
  },

  openRecordInTreeView: async (args: any) => {
    console.log(`[Tool Executing] openRecordInTreeView with:`, args);

    const explicitRecordId = args?.recordId;
    const explicitInfoAreaId = args?.infoAreaId;
    const recordUidInput =
      (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
        ? {
            infoAreaId: explicitInfoAreaId ?? "FI",
            recordId: explicitRecordId,
          }
        : args?.uid ?? args?.recordUid;

    const recordUid = normalizeRecordUid(recordUidInput);
    const recordIdValue = args?.uid?.recordId ?? args?.recordUid?.recordId ?? args?.uid ?? args?.recordId ?? args?.recordUid;

    if (!recordUid || isDummyRecordIdentifier(recordIdValue) || !(typeof u8?.isValidRecordUid === "function" ? u8.isValidRecordUid(recordUid) : true)) {
      return {
        success: false,
        message: `Invalid recordUid: ${JSON.stringify(args)}`,
      };
    }

    await openDefaultAction(recordUid);

    return { success: true, message: `Opened record ${JSON.stringify(recordUid)}` };
  },
  openCampaign: async (args: any) => {
    console.log(`[Tool Executing] openCampaign with:`, args);

    const explicitRecordId = args?.recordId;
    const explicitInfoAreaId = args?.infoAreaId;
    const recordUidInput =
      (explicitRecordId !== undefined || explicitInfoAreaId !== undefined)
        ? {
            infoAreaId: explicitInfoAreaId ?? "CM",
            recordId: explicitRecordId,
          }
        : args?.uid ?? args?.recordUid;

    const recordUid = normalizeRecordUid(recordUidInput);
    const recordIdValue = args?.uid?.recordId ?? args?.recordUid?.recordId ?? args?.uid ?? args?.recordId ?? args?.recordUid;

    if (!recordUid || isDummyRecordIdentifier(recordIdValue) || !(typeof u8?.isValidRecordUid === "function" ? u8.isValidRecordUid(recordUid) : true)) {
      return {
        success: false,
        message: `Invalid recordUid: ${JSON.stringify(args)}`,
      };
    }

    openTreeByBool({
      uid: recordUid,
      fieldId: "HFRecurringMailingCampaign",
      webConfParam: "LGT_OpenCMTree_ByFlag",
      createNewTab: true
    });

    return {
      success: true,
      message: `Opened campaign tree for ${JSON.stringify(recordUid)}`,
    };
  },
  addToTargetGroup: async (args: any) => {
    console.log(`[Tool Executing] addToTargetGroup with:`, args);

    const targetUid = normalizeRecordUid(args?.targetUid ?? args?.uid ?? args?.recordUid);
    const uids = Array.isArray(args?.uids)
      ? args.uids.map((uidValue: any) => normalizeRecordUid(uidValue)).filter((uid: RecordUid | undefined): uid is RecordUid => !!uid)
      : [];

    if (!targetUid || uids.length === 0) {
      return {
        success: false,
        message: `Invalid targetUid or uids for target-group add: ${JSON.stringify(args)}`,
      };
    }

    try {
      const options = {
        targetUid,
        uids,
        ...(args?.infoAreaId ? { infoAreaId: String(args.infoAreaId) } : {}),
        ...(args?.source !== undefined ? { source: args.source } : {}),
        ...(args?.elEvent !== undefined ? { elEvent: args.elEvent } : {}),
        ...(args?.additionalParameters !== undefined ? { additionalParameters: args.additionalParameters } : {}),
      };

      addToTargetGroup(options);

      return {
        success: true,
        targetUid,
        uids,
        message: `Added ${uids.length} record(s) to target group ${JSON.stringify(targetUid)}.`,
      };
    } catch (error: any) {
      return {
        success: false,
        targetUid,
        uids,
        message: error?.message ?? "Failed to add records to target group.",
      };
    }
  },
  crud: async (args: any) => {
    console.log(`[Tool Executing] crud with:`, args);

    const operation = String(args?.operation ?? "").trim().toLowerCase();
    const request = args?.request ?? {};

    if (!operation || !request || typeof request !== "object" || !["create", "read", "update", "delete"].includes(operation)) {
      return {
        success: false,
        message: `Invalid CRUD operation or request payload: ${JSON.stringify(args)}`,
      };
    }

    try {
      const singleRequest = {
        ...request,
        type: operation,
      };

      const response = await executeBatch([singleRequest] as any);

      return {
        success: true,
        operation,
        request: singleRequest,
        response,
        message: `Executed ${operation} CRUD operation through the batch API.`,
      };
    } catch (error: any) {
      return {
        success: false,
        operation,
        request,
        message: error?.message ?? "CRUD batch execution failed.",
      };
    }
  },
  crmQuery: async (args: any) => {
    console.log(`[Tool Executing] crmQuery with:`, args);

    const name = typeof args?.name === "string" ? args.name.trim() : "";
    const maxRows = Number.isFinite(Number(args?.maxRows)) && Number(args?.maxRows) > 0 ? Number(args.maxRows) : 10000;
    const normalizedLink = normalizeRecordUid(args?.link) ?? (typeof args?.link === "object" && args.link !== null ? args.link : undefined);

    if (!name) {
      return {
        success: false,
        message: "Missing stored query name for crmQuery.",
      };
    }

    try {
      const queryCommand = new u8.Crm.QueryCommand({
        name,
        maxRows,
        ...(normalizedLink ? { link: normalizedLink } : {}),
      } as any);

      const queryResult = await executeQuery(queryCommand);
      const plainQueryResult = toPlainData(queryResult);

      return {
        success: true,
        name,
        maxRows,
        ...(normalizedLink ? { link: normalizedLink } : {}),
        queryResult: plainQueryResult,
        message: `Executed stored CRM query "${name}" with maxRows=${maxRows}${normalizedLink ? " and parent link context" : ""}.`,
      };
    } catch (error: any) {
      return {
        success: false,
        name,
        maxRows,
        ...(normalizedLink ? { link: normalizedLink } : {}),
        message: error?.message ?? `Failed to execute CRM query "${name}".`,
      };
    }
  },
};

export async function chatSubmit(userPrompt: string, outputWidget: any) {
	const url = 'http://localhost:1234/v1/chat/completions';
	const MAX_TOOL_CALL_ITERATIONS = 15;
	const baseMessages: any[] = [
		{ role: "system", content: "This is a campaign workflow. Use createEventCampaign first and then openCampaign with the uid returned from createEventCampaign. Do not use openRecordInTreeView for campaign creation or campaign opening. openRecordInTreeView is only for general CRM record navigation. Keep all tools available, but prefer the campaign sequence when the request is about a campaign." },
		{ role: "user", content: userPrompt }
	];

	try {
		let messages = [...baseMessages];
		let iterationCount = 0;
		let message: any = null;

		const effectiveTools = await buildToolsForPrompt(userPrompt);

		const forcedToolChoice = resolveToolChoice(userPrompt, messages);
		const safeFirstToolChoice = forcedToolChoice || "auto";

		const firstResponse = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: "prism-ml/bonsai-27b",
				messages,
				tools: effectiveTools,
				tool_choice: safeFirstToolChoice,
				parallel_tool_calls: false,
				temperature: 0.4
			})
		});

		if (!firstResponse.ok) {
			const errorText = await firstResponse.text();
			throw new Error(`LM Studio request failed (${firstResponse.status}): ${errorText}`);
		}

		const firstData = await firstResponse.json();
		message = (firstData as any).choices?.[0]?.message;

		const normalizeIncomingMessage = (incomingMessage: any) => {
			if (!incomingMessage || Array.isArray(incomingMessage.tool_calls) || typeof incomingMessage.content !== "string") {
				return incomingMessage;
			}

			const malformedToolCall = parseMalformedToolCallContent(incomingMessage.content);
			if (!malformedToolCall) {
				return incomingMessage;
			}

			return {
				...incomingMessage,
				content: "",
				tool_calls: [malformedToolCall],
			};
		};

		message = normalizeIncomingMessage(message);

		while (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0 && iterationCount < MAX_TOOL_CALL_ITERATIONS) {
			iterationCount += 1;

			const normalizedToolCalls = (message.tool_calls.map(sanitizeToolCall).filter(Boolean) as any[]);
			if (normalizedToolCalls.length === 0) {
				console.warn("Dropping invalid tool calls from chat history to prevent loop/reinforcement.");
				break;
			}

			const toolRoundMessages = [
				...messages,
				buildAssistantToolMessage(message, normalizedToolCalls),
			];

			const toolResults: any[] = [];
			for (const toolCall of normalizedToolCalls) {
				const functionName = toolCall.function.name;
				const functionArgs = JSON.parse(toolCall.function.arguments || "{}");
				const result = await availableFunctions[functionName](functionArgs);
				const plainResult = toPlainData(result);
				toolResults.push({
					role: "tool",
					name: functionName,
					tool_call_id: toolCall.id,
					content: JSON.stringify(plainResult),
				});
			}

			messages = [...toolRoundMessages, ...toolResults];

			const sawCreateCampaign = normalizedToolCalls.some((toolCall) => toolCall.function.name === "createEventCampaign");
			const sawOpenCampaign = normalizedToolCalls.some((toolCall) => toolCall.function.name === "openCampaign");
			if (sawCreateCampaign && sawOpenCampaign) {
				break;
			}

			const nextForcedToolChoice = resolveToolChoice(userPrompt, messages);
			const safeNextToolChoice = nextForcedToolChoice || "auto";

			const secondResponse = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: "google/gemma-4-12b-qat",
					messages,
					tools: effectiveTools,
					tool_choice: safeNextToolChoice,
					parallel_tool_calls: false,
					temperature: 0.4
				})
			});

			if (!secondResponse.ok) {
				const errorText = await secondResponse.text();
				throw new Error(`LM Studio follow-up request failed (${secondResponse.status}): ${errorText}`);
			}

			const secondData = await secondResponse.json();
			message = normalizeIncomingMessage((secondData as any).choices?.[0]?.message);
		}

		message = normalizeIncomingMessage(message);
		const content = message?.content ?? "The model did not return any final content.";
		console.log("Final Content:", content);

		if (outputWidget) {
			outputWidget.setValue(content);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

export default {
	chatSubmit: chatSubmit
}