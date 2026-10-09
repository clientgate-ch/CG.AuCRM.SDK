export const executeQuery = (queryCommand: u8.Crm.QueryCommand) => 
	new Promise<u8.Crm.QueryResult>((resolve, _) => queryCommand.execute(
		{ queryLookupScope: "ConfigurationHierarchy"},
		(queryCommand, queryResult) => resolve(queryResult)
	))