export const read = (readOptions: u8.services.crud.CrudReadRequest) => 
	new Promise<u8.services.crud.CrudResponse>((resolve, _) =>
		u8.services.crud.read(
			readOptions,
			(_, readResponse) => resolve(readResponse)
		)
	)

export const create = (createOptions: u8.services.crud.CrudCreateRequest) => 
	new Promise<u8.services.crud.CrudResponse>((resolve, _) =>
		u8.services.crud.create(
			createOptions,
			(_, createResponse) => resolve(createResponse)
		)
	)

export const update = (updateOptions: u8.services.crud.CrudUpdateRequest) => 
	new Promise<u8.services.crud.CrudResponse>((resolve, _) =>
		u8.services.crud.update(
			updateOptions,
			(_, updateResponse) => resolve(updateResponse)
		)
	)

export const executeBatch = (requestsInput: u8.services.crud.AvailableCrudBatchRequests) =>
	new Promise<u8.services.crud.CrudBatchResponse>((resolve, reject) => 
		u8.services.crud.executeBatch(
			{ requests: requestsInput }, 
			function(s, args) {
			if(!args.error)
				resolve(args);
			else
				reject(args.error);                    
		})
	)

export const readLink = (options: any) =>
	new Promise<any>((resolve, reject) =>
		u8.services.crud.readLink(
			options,
			(_, response) => {
				if (response && !response.error) {
					resolve(response);
				} else {
					reject(response?.error ?? new Error('readLink failed'));
				}
			}
		)
	)