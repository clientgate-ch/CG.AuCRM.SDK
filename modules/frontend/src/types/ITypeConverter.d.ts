/**
 * u8.Base.TypeConverter from CRM for standardized conversions of data types
 *
 * @interface BaseTypeConverter
 */
interface BaseTypeConverter {
	booleanToString(bool: boolean): string;
	/**
	 * Converts a boolish text value to JS @see boolean (true/false) (e.g. from Y/J/true)
	 *
	 * @param {string} boolAsText
	 * @returns {boolean} True or false according to the text value
	 * @memberof BaseTypeConverter
	 */
	toBoolean(boolAsText: string): boolean;

	/**
	 * Convert JS datetime object to string with a specific format
	 * @param date JS Date object
	 * @param format CRM date str format (see SDK for more information / non-standard)
	 */
	timeToString(date: Date, format: string): string;

	/**
	 * Convert string to Date by CRM
	 * @param time date string for converting to JS date
	 */
	toDate(date: string): Date;

	/**
	 * Convert string to Time by CRM
	 * @param time time string for converting to JS date/time
	 */
	toTime(time: string): Date;
}
