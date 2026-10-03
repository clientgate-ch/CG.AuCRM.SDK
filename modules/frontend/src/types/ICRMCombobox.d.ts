interface CRMComboboxItem {
	/**
	 * Code no. of the catalog value
	 *
	 * @type {number}
	 * @memberof CRMCombobox
	 */
	key: number;

	/**
	 * Text (translation) of the catalog value
	 *
	 * @type {String}
	 * @memberof CRMCombobox
	 */
	text: String;

	/**
	 * Whether the list item is locked for user
	 *
	 * @type {Boolean}
	 * @memberof CRMCombobox
	 */
	disabled: Boolean;
}

type CRMCatalogComboItem = CRMComboboxItem & CRMCatalogItem;
