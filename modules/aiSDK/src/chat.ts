import { read, readLink } from '../../frontend/src/extensions/Crud';
import { QueryExecutor } from '../../frontend/src/extensions/QueryExecutor';
import { QueryParser } from '../../frontend/src/extensions/QueryParser';
import type { EntityQueryRequest } from '../../frontend/src/types/EntityQuery';

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

// Convert CRM property type codes to JSON Schema types
// Key-based type inference: certain property keys always have specific JSON Schema types
const inferTypeByKey = (propertyKey: string): string | null => {
  const key = String(propertyKey).toLowerCase();
  
  // Object types: complex data structures
  if (["uid", "recorduid", "request", "link", "targetuid", "source", "elevent", "additionalparameters", "businessobject", "options"].includes(key)) {
    return "object";
  }
  
  // Array types: collections
  if (["uids", "records", "fields", "links", "items"].includes(key)) {
    return "array";
  }
  
  // Explicitly numeric
  if (["maxrows", "maxresults", "count", "limit"].includes(key)) {
    return "number";
  }
  
  return null;
};

const convertCrmTypeToJsonSchema = (propertyKey: string, crmTypeCode: string): string => {
  // First try key-based inference for known complex types
  const inferredType = inferTypeByKey(propertyKey);
  if (inferredType) {
    return inferredType;
  }
  
  // Handle semantic type names from PropertyType field (pass-through)
  const codeStr = String(crmTypeCode).trim().toLowerCase();
  if (["string", "number", "object", "array", "boolean"].includes(codeStr)) {
    return codeStr;
  }
  
  // Fall back to CRM numeric code mapping for generic types
  // 0=string, 1=number/integer, 2=boolean, 3=date
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
    // Convert CRM type code to JSON Schema type, using key-based inference
    this.jsonSchemaType = convertCrmTypeToJsonSchema(this.key, crmType);
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

/**
 * AgentEntity - Encapsulates agent capability querying using fluent QueryBuilder API
 * Queries C079 (Agent Capability) with child C081 (Property) records for a specific agent
 */
class AgentEntity {
  constructor(private agentUid: RecordUid) {}

  /**
   * Load all capabilities and their properties for the agent
   * @returns Array of capabilities with capabilityRecord and propertyRecords
   */
  async loadCapabilities(): Promise<
    Array<{ capabilityRecord: any; parameterRecords: any[]; propertyRecords: any[] }>
  > {
    try {
      console.log("AgentEntity.loadCapabilities: Starting for agent", JSON.stringify(this.agentUid));

      // Build query request using fluent QueryBuilder API
      const queryRequest = this.buildQueryRequest();

      console.log("AgentEntity.loadCapabilities: Built query request with UQL:", queryRequest.statement);

      // Execute query using QueryExecutor with EntityQueryResponse grouping
      const queryResponse = await QueryExecutor.executeEntityQuery(
        queryRequest,
        (queryCommand: any) => {
          const cmd = new u8.Crm.QueryCommand({
            statement: queryCommand.statement,
            link: queryCommand.link,
          } as any);
          
          return executeQuery(cmd).then((result: any) => {
            // Log raw result structure for debugging
            console.log("AgentEntity query raw result:", {
              type: result?.constructor?.name,
              keys: Object.keys(result || {}),
              hasRows: !!result?.rows,
              hasResultSet: !!result?.resultSet,
              hasResult: !!result?.result,
            });

            // Handle various CRM result formats
            if (result?.resultSet) {
              // CRM may wrap rows in resultSet
              return result.resultSet;
            }
            return result;
          });
        },
        { link: this.agentUid }
      );

      console.log("AgentEntity.loadCapabilities: Query executed, received", queryResponse.totalCount, "total rows");

      // Parse capabilities from grouped response
      const capabilities = this.parseCapabilities(queryResponse);

      console.log("AgentEntity.loadCapabilities: Parsed", capabilities.length, "capabilities");

      return capabilities;
    } catch (error) {
      console.error("AgentEntity.loadCapabilities: Failed to load capabilities", error);
      return [];
    }
  }

  /**
   * Build EntityQueryRequest with manual UQL construction
   * Selects C079 (capability) fields and joins with C081 (property) records
   * Note: Qualified joins (C079.C080) require manual UQL, not QueryBuilder
   */
  private buildQueryRequest(): EntityQueryRequest {
    // Manually construct UQL with qualified joins (C079.C080, C080.C081)
    const uqlQuery = `
      select (C079.CapabilityType, C079.Description, C079.DisplayName, C079.ID, C079.ToolType, C079.ToolImplementation, C081.PropertyKey, C081.PropertyType, C081.PropertyDescription)
      from (C082)
      with (C079)
      with (C079.C080 using link 300)
      with (C080.C081 using link 300)
    `;

    // Return EntityQueryRequest with grouping by capability ID
    return {
      statement: uqlQuery,
      link: null,
      groupByKey: "C079.ID",
      joins: [
        { entity: "C079", linkNum: null, fields: [] },
        { entity: "C080", linkNum: 300, fields: [] },
        { entity: "C081", linkNum: 300, fields: ["C081.PropertyKey", "C081.PropertyType", "C081.PropertyDescription"] },
      ],
      selectedFields: [
        "C079.CapabilityType",
        "C079.Description",
        "C079.DisplayName",
        "C079.ID",
        "C079.ToolType",
        "C079.ToolImplementation",
        "C081.PropertyKey",
        "C081.PropertyType",
        "C081.PropertyDescription",
      ],
    };
  }

  /**
   * Transform EntityQueryResponse into capability records with .get() accessors
   * Converts grouped EntityHierarchy format to flat array matching readToolCapability output
   */
  private parseCapabilities(
    queryResponse: any
  ): Array<{ capabilityRecord: any; parameterRecords: any[]; propertyRecords: any[] }> {
    const capabilities: Array<{
      capabilityRecord: any;
      parameterRecords: any[];
      propertyRecords: any[];
    }> = [];

    // DEBUG: Log actual structure received
    console.log("AgentEntity.parseCapabilities: Received input:", {
      constructorName: queryResponse?.constructor?.name,
      allKeys: Object.keys(queryResponse || {}),
      rowsType: Array.isArray(queryResponse?.rows) ? "array" : typeof queryResponse?.rows,
      rowsLength: queryResponse?.rows?.length,
      entitiesType: queryResponse?.entities?.constructor?.name,
      entitiesSizeOrLength: queryResponse?.entities?.size || queryResponse?.entities?.length,
      totalCount: queryResponse?.totalCount,
      firstFewProps: JSON.stringify(queryResponse, null, 2).substring(0, 500),
    });

    // If queryResponse has raw rows but no grouped entities, parse them directly
    if (Array.isArray(queryResponse?.rows) && queryResponse.rows.length > 0) {
      console.log("AgentEntity.parseCapabilities: Processing raw rows directly", {
        rowCount: queryResponse.rows.length,
        firstRowKeys: Object.keys(queryResponse.rows[0] || {}),
      });

      // Rows have CRM normalized format: {uids: [...], values: [...]}
      // Map values array to the selected query fields (in order):
      // values[0]=C079.CapabilityType, values[1]=C079.Description, values[2]=C079.DisplayName,
      // values[3]=C079.ID, values[4]=C079.ToolType, values[5]=C079.ToolImplementation,
      // values[6]=C081.PropertyKey, values[7]=C081.PropertyType, values[8]=C081.PropertyDescription

      const capabilityMap = new Map<
        string,
        {
          capabilityRecord: any;
          propertyRecords: any[];
        }
      >();

      for (const row of queryResponse.rows) {
        if (!Array.isArray(row.values) || !Array.isArray(row.uids)) {
          console.log("AgentEntity.parseCapabilities: Row has unexpected format, skipping:", {
            hasValues: Array.isArray(row.values),
            hasUids: Array.isArray(row.uids),
          });
          continue;
        }

        // Extract capability ID from values[3] (C079.ID)
        const capabilityId = row.values[3];
        if (!capabilityId) {
          console.log(
            "AgentEntity.parseCapabilities: Row has no capability ID (values[3]), skipping"
          );
          continue;
        }

        // Build capability record from values array with .get() accessor
        if (!capabilityMap.has(capabilityId)) {
          const capabilityRecord = {
            get: (prop: string) => {
              const propMap: { [key: string]: number } = {
                CapabilityType: 0,
                Description: 1,
                DisplayName: 2,
                ID: 3,
                ToolType: 4,
                ToolImplementation: 5,
              };
              const index = propMap[prop];
              return index !== undefined ? row.values[index] : undefined;
            },
          };
          capabilityMap.set(capabilityId, {
            capabilityRecord,
            propertyRecords: [],
          });
        }

        // Extract property record from values[6-8] (C081 fields)
        const propertyKey = row.values[6];
        if (propertyKey) {
          const propertyRecord = {
            get: (prop: string) => {
              const propMap: { [key: string]: number } = {
                PropertyKey: 6,
                PropertyType: 7,
                PropertyDescription: 8,
              };
              const index = propMap[prop];
              return index !== undefined ? row.values[index] : undefined;
            },
          };
          capabilityMap.get(capabilityId)!.propertyRecords.push(propertyRecord);
        }
      }

      // Convert map to capability array
      for (const [capId, { capabilityRecord, propertyRecords }] of capabilityMap.entries()) {
        capabilities.push({
          capabilityRecord,
          parameterRecords: [],
          propertyRecords,
        });

        console.log("AgentEntity.parseCapabilities: Built capability from raw rows:", {
          id: capId,
          displayName: capabilityRecord.get("DisplayName"),
          propertyCount: propertyRecords.length,
        });
      }

      console.log("AgentEntity.parseCapabilities: Parsed from raw rows:", {
        capabilityCount: capabilities.length,
      });
      return capabilities;
    }

    // Fall back to grouped entities approach (if QueryExecutor populated it)
    // Iterate through grouped entities (keyed by C079.ID)
    for (const [groupKey, entityData] of (queryResponse?.entities || new Map()).entries()) {
      console.log("AgentEntity.parseCapabilities: Processing grouped entity", groupKey, {
        entityDataKeys: Object.keys(entityData || {}),
      });

      if (!entityData?.normalizedRows || entityData.normalizedRows.length === 0) {
        console.warn("AgentEntity.parseCapabilities: No normalized rows for group", groupKey);
        continue;
      }

      // Extract C079 parent entity from first row (same for all rows in group)
      const firstRow = entityData.normalizedRows[0];
      if (!firstRow.C079) {
        console.warn("AgentEntity.parseCapabilities: No C079 entity in row for group", groupKey);
        continue;
      }

      // Build capabilityRecord with .get() accessor method
      const capabilityRecord = QueryParser.buildEntityRecord(firstRow.C079, true);

      // Collect all unique C081 property records from all rows in the group
      const propertyRecords: any[] = [];
      const seenPropertyKeys = new Set<string>();

      for (const row of entityData.normalizedRows) {
        if (row.C081 && Object.keys(row.C081).length > 0) {
          const propertyKey = row.C081.PropertyKey;
          if (propertyKey && !seenPropertyKeys.has(propertyKey)) {
            const propertyRecord = QueryParser.buildEntityRecord(row.C081, true);
            propertyRecords.push(propertyRecord);
            seenPropertyKeys.add(propertyKey);
            console.log(
              "AgentEntity.parseCapabilities: Added property",
              propertyKey,
              "to capability",
              groupKey
            );
          }
        }
      }

      // Create capability entry matching readToolCapability output format
      capabilities.push({
        capabilityRecord,
        parameterRecords: [], // Not needed since query joins directly to C081
        propertyRecords,
      });

      console.log(
        "AgentEntity.parseCapabilities: Built capability from grouped entity",
        capabilityRecord.get?.("ID"),
        "with",
        propertyRecords.length,
        "properties"
      );
    }

    console.log("AgentEntity.parseCapabilities: Total capabilities parsed:", capabilities.length);
    return capabilities;
  }
}

export const readToolCapability = async (): Promise<Array<{ capabilityRecord: any; parameterRecords: any[]; propertyRecords: any[] }>> => {
  try {
    console.log("=== EXECUTING CAPABILITY QUERY USING AgentEntity ===");
    console.log("Link context (migratedAgentUid):", JSON.stringify(migratedAgentUid));

    // Use AgentEntity to load all capabilities for the migrated agent
    const agentEntity = new AgentEntity(migratedAgentUid);
    const allCapabilities = await agentEntity.loadCapabilities();

    console.log(`\n=== FINAL RESULT ===`);
    console.log(`Successfully loaded ${allCapabilities.length} total capabilities`);
    console.log(
      "Capabilities:",
      allCapabilities.map((c) => ({
        id: c.capabilityRecord.get?.("ID"),
        displayName: c.capabilityRecord.get?.("DisplayName"),
        propertyCount: c.propertyRecords.length,
      }))
    );

    return allCapabilities;
  } catch (error) {
    console.error("Failed to load tool capabilities from CRM DB.", error);
    return [];
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

export const buildToolsForPrompt = async (_userPrompt: string) => {
  // Read all tool capabilities from CRM database for the migrated agent
  const allCapabilities = await readToolCapability();
  console.log("buildToolsForPrompt: readToolCapability returned", {
    capabilityCount: allCapabilities.length
  });
  
  // Load tools only from CRM database (no static fallback)
  const mergedTools: any[] = [];
  const dbLoadedToolNames = new Set<string>();

  // Merge DB-loaded tools: DB tools take priority over static definitions
  for (let i = 0; i < allCapabilities.length; i++) {
    const capabilityData = allCapabilities[i];
    const dbTool = buildMigratedGetUserIdentityTool(capabilityData.capabilityRecord, capabilityData.propertyRecords);

    if (dbTool && dbTool.function?.name) {
      const toolName = dbTool.function.name;
      dbLoadedToolNames.add(toolName);
      
      console.log(`buildToolsForPrompt: processing DB-loaded tool "${toolName}"`);

      // Find and replace existing static tool with same name, or add if new
      const existingIndex = mergedTools.findIndex((tool: any) => tool?.function?.name === toolName);
      if (existingIndex >= 0) {
        console.log(`buildToolsForPrompt: replacing static tool "${toolName}" with DB-loaded version`);
        mergedTools[existingIndex] = dbTool;
      } else {
        console.log(`buildToolsForPrompt: adding new DB-loaded tool "${toolName}"`);
        mergedTools.push(dbTool);
      }
    } else {
      console.warn(`buildToolsForPrompt: capability at index ${i} returned null or invalid tool`);
    }
  }

  console.log("buildToolsForPrompt: final tool count", { 
    total: mergedTools.length,
    fromDb: dbLoadedToolNames.size
  });
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
  
  // Allowlist: includes getUserIdentity + DB-loaded tool names from CRM
  // All other tools (openCampaign, addToTargetGroup, etc.) are now loaded from C079 records
  const allowedToolNames = new Set([
    "getUserIdentity",
    // DB-loadable tool names (from C079.ID field in CRM):
    "openCampaign",
    "addToTargetGroup",
    "openRecordInTreeView",
    "crud",
    "crmQuery"
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