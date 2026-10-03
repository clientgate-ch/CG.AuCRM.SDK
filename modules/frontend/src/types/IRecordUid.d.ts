/**
 * Unique ID of CRM for referencing a record via the API in the DB
 *
 * @interface RecordUid
 */
interface RecordUid {
	infoAreaId: string,
	recordId: string | number
}

interface LinkRecordUid extends RecordUid {
	linkId: number
}
