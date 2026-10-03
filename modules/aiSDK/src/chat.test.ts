import {
  mapPropertyRecordToSchema,
  mapCapabilityRecordToToolSchema,
  readToolCapability,
} from './chat';

// ===== MOCK DATA BASED ON ACTUAL CRM RESPONSES =====

/**
 * Mock Capability Record (C079) - Based on actual console output
 * This is what the CRM returns when reading a C079 Agent Capability record
 */
const mockCapabilityRecord = {
  options: {
    uid: {
      infoAreaId: "C079",
      recordId: "x0000044c00000015"
    },
    fields: [
      "ID",
      "DisplayName",
      "Description",
      "ToolType",
      "ToolImplementation",
      "CapabilityType"
    ]
  },
  businessObject: {
    uid: {
      infoAreaId: "C079",
      recordId: "x0000044c00000015"
    },
    values: {
      "7000": "1",  // CapabilityType
      "7001": "Return the full current CRM identity object for the session, including companyUid, personUid, repId, and launcher metadata. Use this when the workflow needs the current user or company context.",  // Description
      "7002": "Get CRM Identity of the user",  // DisplayName
      "7003": "getUserIdentity",  // ID
      "7004": "0",  // ToolType
      "7005": "async (_args: any) => { ... }"  // ToolImplementation
    },
    namedValues: {
      "ID": 7003,
      "DisplayName": 7002,
      "Description": 7001,
      "ToolType": 7004,
      "ToolImplementation": 7005,
      "CapabilityType": 7000
    },
    _modifiedFieldIds: [],
    _version: 0,
    // Mock the .get() method that BusinessObject provides
    get: function<T>(fieldName: string): T {
      const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
      return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
    }
  }
};

/**
 * Mock Property Record (C081) - Parameter Property
 * Structure based on what SHOULD be returned from reading C081 properties
 */
const mockPropertyRecord = {
  businessObject: {
    uid: {
      infoAreaId: "C081",
      recordId: "x0000044c00000001"
    },
    values: {
      "7006": "userName",  // PropertyKey
      "7007": "string",  // PropertyType
      "7008": "The user name from current identity session"  // PropertyDescription
    },
    namedValues: {
      "PropertyKey": 7006,
      "PropertyType": 7007,
      "PropertyDescription": 7008
    },
    _modifiedFieldIds: [],
    _version: 0,
    get: function<T>(fieldName: string): T {
      const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
      return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
    }
  }
};

/**
 * Mock Parameter Record (C080) - Tool Parameter
 * Structure based on what SHOULD be returned
 */
const mockParameterRecord = {
  businessObject: {
    uid: {
      infoAreaId: "C080",
      recordId: "x0000044c00000042"
    },
    values: {
      "7002": "C079:x0000044c00000015"  // ParentCapLink
    },
    namedValues: {
      "ParentCapLink": 7002
    },
    _modifiedFieldIds: [],
    _version: 0,
    get: function<T>(fieldName: string): T {
      const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
      return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
    }
  }
};

/**
 * Mock error response when trying to read with invalid field names
 */
const mockErrorResponse = {
  options: {
    uid: {
      infoAreaId: "C079",
      recordId: "x0000044c00000015"
    },
    linkName: "$Link[C080]",
    fields: ["ParentCapLink"]  // This field doesn't exist in C079
  },
  error: {
    originalResponse: null,
    message: "Field name 'ParentCapLink' was not found in info area AgentCapability(C079).",
    localizedMessage: "Field name 'ParentCapLink' was not found in info area AgentCapability(C079).",
    errorUid: "/update.Crm.Schema/Error/2000/",
    type: "UnknownFieldException"
  }
};

// ===== JEST TESTS =====

describe("CRM Tool Schema Mapping", () => {
  describe("mapPropertyRecordToSchema", () => {
    it("should extract property fields from a valid C081 record", () => {
      const result = mapPropertyRecordToSchema(mockPropertyRecord);

      expect(result).not.toBeNull();
      expect(result?.key).toBe("userName");
      expect(result?.toJsonSchema().type).toBe("string");
      expect(result?.description).toBe("The user name from current identity session");
    });

    it("should return null when propertyRecord is null", () => {
      const result = mapPropertyRecordToSchema(null);
      expect(result).toBeNull();
    });

    it("should return null when propertyRecord has no businessObject", () => {
      const result = mapPropertyRecordToSchema({});
      expect(result).toBeNull();
    });

    it("should return null when required fields are missing", () => {
      const incompleteRecord = {
        businessObject: {
          uid: { infoAreaId: "C081", recordId: "x123" },
          values: { "7006": "userName" },  // Missing PropertyType and PropertyDescription
          namedValues: { "PropertyKey": 7006 },
          get: function<T>(fieldName: string): T {
            const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
            return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
          }
        }
      };

      const result = mapPropertyRecordToSchema(incompleteRecord);
      expect(result).toBeNull();
    });

    it("should handle plain object properties (not BusinessObject instances)", () => {
      const plainObjectRecord = {
        "PropertyKey": "testKey",
        "PropertyType": "string",
        "PropertyDescription": "Test description"
      };

      const result = mapPropertyRecordToSchema(plainObjectRecord);
      expect(result).not.toBeNull();
      expect(result?.key).toBe("testKey");
      expect(result?.toJsonSchema().type).toBe("string");
      expect(result?.description).toBe("Test description");
    });

    it("should handle numeric field IDs as fallback", () => {
      const numericFieldRecord = {
        businessObject: {
          "7006": "fieldKey",
          "7007": "boolean",
          "7008": "Field description"
        }
      };

      const result = mapPropertyRecordToSchema(numericFieldRecord);
      expect(result).not.toBeNull();
      expect(result?.key).toBe("fieldKey");
      expect(result?.toJsonSchema().type).toBe("boolean");
      expect(result?.description).toBe("Field description");
    });
  });

  describe("mapCapabilityRecordToToolSchema", () => {
    it("should extract capability fields from a valid C079 record", () => {
      const result = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [mockPropertyRecord]
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Get CRM Identity of the user");
      expect(result?.description).toContain("Return the full current CRM identity object");
      expect(result?.properties).toHaveLength(1);
      expect(result?.properties[0].key).toBe("userName");
    });

    it("should return null when capabilityRecord is null", () => {
      const result = mapCapabilityRecordToToolSchema(null, []);
      expect(result).toBeNull();
    });

    it("should return null when capabilityBusinessObject has no businessObject", () => {
      const result = mapCapabilityRecordToToolSchema({}, []);
      expect(result).toBeNull();
    });

    it("should return null when required capability fields are missing", () => {
      const incompleteCapability = {
        businessObject: {
          uid: { infoAreaId: "C079", recordId: "x123" },
          values: { "7003": "toolId" },  // Only ID, missing DisplayName and Description
          namedValues: { "ID": 7003 },
          get: function<T>(fieldName: string): T {
            const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
            return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
          }
        }
      };

      const result = mapCapabilityRecordToToolSchema(incompleteCapability, []);
      expect(result).toBeNull();
    });

    it("should return null when no valid property records are provided", () => {
      // Property record with missing fields will fail mapping and result in empty properties array
      const invalidPropertyRecord = { businessObject: { uid: { infoAreaId: "C081", recordId: "x123" }, values: {}, namedValues: {} } };
      
      const result = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [invalidPropertyRecord]
      );
      expect(result).toBeNull();
    });

    it("should generate correct tool definition JSON schema", () => {
      const schema = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [mockPropertyRecord]
      );

      expect(schema).not.toBeNull();
      const toolDef = schema?.toToolDefinition();
      
      expect(toolDef.type).toBe("function");
      expect(toolDef.function.name).toBe("Get CRM Identity of the user");
      expect(toolDef.function.parameters.type).toBe("object");
      expect(toolDef.function.parameters.properties.userName).toEqual({
        type: "string",
        description: "The user name from current identity session"
      });
      expect(toolDef.function.parameters.required).toContain("userName");
    });

    it("should handle multiple property records", () => {
      const property2 = {
        businessObject: {
          uid: { infoAreaId: "C081", recordId: "x0000044c00000002" },
          values: {
            "7006": "repId",
            "7007": "string",
            "7008": "The representative ID"
          },
          namedValues: {
            "PropertyKey": 7006,
            "PropertyType": 7007,
            "PropertyDescription": 7008
          },
          get: function<T>(fieldName: string): T {
            const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
            return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
          }
        }
      };

      const result = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [mockPropertyRecord, property2]
      );

      expect(result).not.toBeNull();
      expect(result?.properties).toHaveLength(2);
      expect(result?.properties.map(p => p.key)).toContain("userName");
      expect(result?.properties.map(p => p.key)).toContain("repId");
    });
  });

  describe("PropertySchema.toJsonSchema", () => {
    it("should generate valid JSON schema for a property", () => {
      const property = mapPropertyRecordToSchema(mockPropertyRecord);
      const schema = property?.toJsonSchema();

      expect(schema).toEqual({
        type: "string",
        description: "The user name from current identity session"
      });
    });

    it("should trim whitespace from schema values", () => {
      const recordWithWhitespace = {
        businessObject: {
          values: {
            "7006": "  keyWithSpaces  ",
            "7007": "  string  ",
            "7008": "  Description with spaces  "
          },
          namedValues: {
            "PropertyKey": 7006,
            "PropertyType": 7007,
            "PropertyDescription": 7008
          },
          get: function<T>(fieldName: string): T {
            const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
            return fieldId !== undefined ? this.values[fieldId] as T : undefined as T;
          }
        }
      };

      const property = mapPropertyRecordToSchema(recordWithWhitespace);
      const schema = property?.toJsonSchema();

      expect(schema?.type).toBe("string");
      expect(schema?.description).toBe("Description with spaces");
    });
  });

  describe("ToolSchema.toToolDefinition", () => {
    it("should generate complete tool definition with required schema structure", () => {
      const schema = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [mockPropertyRecord]
      );
      const toolDef = schema?.toToolDefinition();

      expect(toolDef).toHaveProperty("type", "function");
      expect(toolDef.function).toHaveProperty("name");
      expect(toolDef.function).toHaveProperty("description");
      expect(toolDef.function.parameters).toHaveProperty("type", "object");
      expect(toolDef.function.parameters).toHaveProperty("properties");
      expect(toolDef.function.parameters).toHaveProperty("required");
    });

    it("should include all properties in required array", () => {
      const schema = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [mockPropertyRecord]
      );
      const toolDef = schema?.toToolDefinition();

      expect(toolDef.function.parameters.required).toEqual(["userName"]);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle error responses gracefully", () => {
      // Error response should not be processed as valid data
      const result = mapCapabilityRecordToToolSchema(mockErrorResponse, []);
      expect(result).toBeNull();
    });

    it("should skip invalid property records in array", () => {
      const validProperty = mockPropertyRecord;
      const invalidProperty = { businessObject: { values: {} } };  // Missing namedValues and get()

      const result = mapCapabilityRecordToToolSchema(
        mockCapabilityRecord,
        [invalidProperty, validProperty, invalidProperty]
      );

      // Should still create schema with the one valid property
      expect(result).not.toBeNull();
      expect(result?.properties).toHaveLength(1);
      expect(result?.properties[0].key).toBe("userName");
    });

    it("should handle records wrapped in arrays", () => {
      // Some responses wrap businessObject in array
      const wrappedRecord = [mockPropertyRecord.businessObject];
      const result = mapPropertyRecordToSchema(wrappedRecord);

      expect(result).not.toBeNull();
      expect(result?.key).toBe("userName");
    });

    it("should handle records with nested businessObject property", () => {
      // Some responses have businessObject as nested property
      const nestedRecord = { businessObject: mockPropertyRecord.businessObject };
      const result = mapPropertyRecordToSchema(nestedRecord);

      expect(result).not.toBeNull();
      expect(result?.key).toBe("userName");
    });
  });
});

describe("Data Structure Compatibility", () => {
  it("should work with BusinessObject that has .get() method", () => {
    const result = mapPropertyRecordToSchema(mockPropertyRecord);
    expect(result?.key).toBe("userName");
  });

  it("should work with plain objects without .get() method", () => {
    const plainObject = {
      PropertyKey: "plainKey",
      PropertyType: "number",
      PropertyDescription: "Plain object property"
    };

    const result = mapPropertyRecordToSchema(plainObject);
    expect(result).not.toBeNull();
    expect(result?.key).toBe("plainKey");
    expect(result?.toJsonSchema().type).toBe("number");
  });

  it("should work with numeric field IDs as fallback", () => {
    const numericObject = {
      "7006": "numericKey",
      "7007": "boolean",
      "7008": "Numeric field ID property"
    };

    const result = mapPropertyRecordToSchema(numericObject);
    expect(result).not.toBeNull();
    expect(result?.key).toBe("numericKey");
    expect(result?.toJsonSchema().type).toBe("boolean");
  });

  it("should prefer named fields over numeric IDs", () => {
    const mixedRecord = {
      businessObject: {
        PropertyKey: "namedKey",
        "7006": "numericKey",  // This should not be used
        PropertyType: "string",
        "7007": "number",  // This should not be used
        PropertyDescription: "Named field description",
        "7008": "Numeric field description",  // This should not be used
        namedValues: {
          "PropertyKey": 7006,
          "PropertyType": 7007,
          "PropertyDescription": 7008
        },
        get: function<T>(fieldName: string): T {
          const fieldId = this.namedValues[fieldName as keyof typeof this.namedValues];
          return fieldId !== undefined ? this["values"]?.[fieldId] as T : this[fieldName] as T;
        }
      }
    };

    const result = mapPropertyRecordToSchema(mixedRecord);
    expect(result?.key).toBe("namedKey");
  });
});
