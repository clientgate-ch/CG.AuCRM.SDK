/**
 * Query State Action calculation result
 *
 * @interface QSAResult
 */
interface QSAResult {
	/**
	 * whether the button should be visible
	 *
	 * @type {Boolean}
	 * @memberof QSAResult
	 */
	visible: Boolean

	/**
	 * whether the buttons should be disabled (and not clickable)
	 *
	 * @type {Boolean}
	 * @memberof QSAResult
	 */
	disabled: Boolean

	/**
	 * If true, don't retest the QSA condition
	 *
	 * @type {Boolean}
	 * @memberof QSAResult
	 */
	done: Boolean
}

declare module '*.html' {
	const value: any;
	export default value;
}