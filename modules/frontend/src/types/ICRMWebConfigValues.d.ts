interface CRMWebConfigIndexer {
	[key: string]: string;
}

type CRMWebConfigValues = CRMWebConfigIndexer & {
	/**
	 * Get and convert webconfig value to integer
	 *
	 * @param {string} key ID of the Web Configuration Parameter
	 * @param {?number} defaultNumber Fallback value if no WebConfig has been found with this name
	 * @memberof CRMWebConfigValues
	 */
	getInt(key: string, defaultNumber?: number): number;

	/**
	 * Get and convert webconfig value to string
	 *
	 * @param {string} key ID of the Web Configuration Parameter
	 * @returns {string} Webconfig value as string
	 * @memberof CRMWebConfigValues
	 */
	get(key: string, fallbackValue?: string): string;

	/**
	* Shorthand for getting array from WebConfig Param w/type List
	*
	* @param {string} key ID of the Web Configuration Parameter
	* @param {[]} [fallbackArray] Fallback array value, if no WebConfig value has been found
	* @memberof CRMWebConfigValues
	*/
	getStringArray(key: string, fallbackArray?: []): [string];

	/**
	 * Shorthand for getting a boolean/switch value from webconfig
	 *
	 * @param {string} key Key of the WebConfigParam
	 * @return {boolean} True or false value, also false if empty
	 */
	getBoolean(key: string, defaultValue?: boolean): boolean

	/**
	 * Shorthand for getting a keyvalue pair object from the webconfig
	 *
	 * @param {string} key Key of the WebConfigParam
	 * @return {*}  {Record<string, string>} Keyvalue pair parsed from the JSON (webconfig)
	 */
	getOptions(key: string): Record<string, string>
}
