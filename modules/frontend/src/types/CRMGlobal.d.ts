type TriggerResult = import('./ITrigger.js').TriggerResult

declare namespace u8 {
	// root helper functions & shorthands
	function using(requestedResources: any, callback?: Function) // : JQuery.Deferred
	function ready(callback: (sender, args) => void)

	function recordUidToString(uid: RecordUid): string
	function isValidRecordUid(uid: RecordUid): boolean
	function parseRecordUid(uidTxt: string): RecordUid
	function isRecordUid(uid: RecordUid): boolean

	function toString_(inputObject): string

	function widget(id: string, htmlElement: JQuery<HTMLElement>, options: any): any

	interface ChannelRequestInput {
		endPoint: string
		arguments: any
		errorMode?: any
	}

	function request(endpoint: string, endpointArgs: any, callback?: Function)
	function request(requestInput: ChannelRequestInput, callback?: Function)

	namespace application {
		const url: string
	}

	namespace debug {
		const level: number
	}

	namespace log {
		function info(message: string): void
		function warn(message: string): void
		function error(message: string): void
	}

	namespace tools {
		function isArray(array: Array<any>): boolean
		function isPromise(objectToTest): boolean
	}

	// subnamespaces
	namespace session {
		const webConfigValues: CRMWebConfigValues

		namespace environment {
			const stationNumber: number; // window["u8.session.environment.stationNumber"]

			namespace language {
				const code: string;
				const no: number;
			}
		}

		interface SessionIdentity {
			userName?: string
			guidForLauncher?: string
			isSuperUser?: boolean
			repName?: string
			repId?: string | number
			deputyRepId?: number
			superiorRepId?: number
			orgGroupId?: number
			tenantNo?: number
			groupLeaderRepId?: number
			tenantName?: string
			personUid?: RecordUid
			companyUid?: RecordUid
			roleIds?: number[]
			oAuthClientId?: string
			oAuthSecret?: string
		}

		var identity: SessionIdentity;

		function refreshWorkWindow(): void
	}

	namespace services {
		function ready(serviceName: string, callback: () => void): void
		function add(serviceName: string, type: new (extendObj: any) => any): void

		type AddParameters = { name: string, scope: string, ctor: new (extendObj: any) => any}
		function add(options: AddParameters): void

		namespace accounts {
			interface MergeOptions {
				mergeId: string
				resolutions: any
				useTransaction: boolean
			}

			function executeMerge(options: MergeOptions, callback: (sender, mergeResult) => void)
		}

		namespace addressCheck {
			function execute(options, callback: Function)
		}

		namespace browserHistory {
			function setUrl(url: string): void
			function addHistoryIdToUrl(options): void
		}

		namespace crud {
			function notify(accessMode: string, args: any)

			interface CrudCreateRequest {
				infoAreaId: string
				fields?: u8.Crm.FieldValuePair[]
				options?: {
					links?: LinkRecordUid[]
				}
			}

			type CrudRequestType = 'create' | 'read' | 'update' | 'delete'

			type CrudBatchCreateRequest = CrudCreateRequest & {
				type: CrudRequestType
			}

			interface CrudReadRequest {
				uid: RecordUid
				fields?: Array<number | string>
				linkName?: string
				options?: any

				autoLoad?: boolean
			}

			type CrudBatchReadRequest = CrudReadRequest & {
				type: string
			}

			interface CrudUpdateRequest {
				businessObject?: u8.Crm.BusinessObject
				uid?: RecordUid
				fields?: u8.Crm.FieldValuePair[]

				options?: {
					catalogValueEncoding?: any
					links?: LinkRecordUid[]
				}
			}

			type CrudBatchUpdateRequest = CrudUpdateRequest & {
				type: CrudRequestType
			}

			interface CrudDeleteRequest {
				uid: RecordUid
			}

			type CrudBatchDeleteRequest = CrudDeleteRequest & {
				type: CrudRequestType
			}

			interface CrudBatchResult {
				alias: string
				businessObject: u8.Crm.BusinessObject
				found: boolean
				type: CrudRequestType
			}

			interface CrudBatchResponse {
				error?
				results?: CrudBatchResult[]
			}

			type AvailableCrudBatchRequests = (CrudBatchCreateRequest
				| CrudBatchReadRequest
				| CrudBatchUpdateRequest
				| CrudBatchDeleteRequest
			)[]
			
			interface CrudBatchRequests {
				requests: AvailableCrudBatchRequests
			}

			interface CrudResponse {
				businessObject?: u8.Crm.BusinessObject,
				error?: string
			}

			function create(options: CrudCreateRequest, callback: (request: any, response: CrudResponse) => void)
			function update(options: CrudUpdateRequest, callback: (request: any, response: CrudResponse) => void)
			function read(options: CrudReadRequest, callback: (request: any, response: CrudResponse) => void)
			function readLink(options: any, callback: (request: any, args: any) => void)
			function readFields(options: any, callback: (request: any, args: any) => void)

			function executeBatch(requests: CrudBatchRequests, callback: (request: any, response: CrudBatchResponse) => void)
		}

		namespace factory {
			function createInstance(type: string, args: any[]): any
		}

		interface FieldWidgetFactoryInputOptions {
			accessDenied: boolean
			allowEditReadOnly?: boolean | undefined
			buildBindingPath: Function
			buildFieldKey: Function
			canEdit: boolean
			canView: boolean
			createHook: Function
			editMode: number
			fieldControl: u8.Crm.FieldControl
			fieldControlType: string
			fieldIds: number[]
			forceSelector: boolean
			getConverter: Function
			isMultiLine: boolean
			isMustField: boolean
			onBindingCreate: Function
			properties: { fieldForms }
			viewMode: string
			widgetId: string
		}

		interface FieldWidgetFactoryRegisterOptions {
			/**
			 * Widget name/id
			 * @type {string}
			 */
			name: string
			predicate: (field: any, schema: any, inputOptions: FieldWidgetFactoryInputOptions) => boolean
			create?: (field: any, schema: any, inputOptions: FieldWidgetFactoryInputOptions) => any
			"Edit.create"?: (field: any, schema: any, inputOptions: FieldWidgetFactoryInputOptions) => any
			"Read.create"?: (field: any, schema: any, inputOptions: FieldWidgetFactoryInputOptions) => any
		}

		namespace fieldWidgetFactory {
			function register(options: FieldWidgetFactoryRegisterOptions | JQueryPromise<FieldWidgetFactoryRegisterOptions>)
		}

		namespace history {
			function addPage(params: { label: string, url: string})
		}

		namespace popupBrowsing {
			function getFrameElement()
		}

		namespace documents {
			function mailmerge(mailMergeOptions)
			function createDocument(options, callback)
		}

		namespace navigation {
			function navigateToPage(name: string, options)
		}

		namespace queries {
			function executeExport(options, callback?: (sender, args) => void)
		}

		namespace reporting {
			function createReport(options)
		}

		namespace selectors {
			interface LifecycleFunctions {
				execute(sender, callback: (sender, args) => void)
				prepareOptions(sender, callback: (sender, args) => void)
			}

			function register(selectorName: string, lifecycleFunctions: any)
		}

		var typeConverter: BaseTypeConverter

		namespace actions {
			function load(actionName: string, loadArgs: u8.Base.Actions._LoadOptions | {}, callback?: (sender, actionEventArgs:u8.Base.Actions._LoadEventArgs) => void): void
			function execute(actionName: string, executionArgs: u8.Base.Actions._ExecutionOptions | {}, callback?: (sender, actionEventArgs:u8.Base.Actions._ActionEventArgs) => void): void
			function executeDefault(uid: RecordUid, executionArgs: u8.Base.Actions._ExecuteDefaultOptions | {}, callback?: (sender, actionEventArgs:u8.Base.Actions._ActionEventArgs) => void): void
		}

		namespace variables {
			function getValues(names: string[], callback: (values: any[] | { error }) => void)
		}

		namespace email {
			function mailto(mailToLink: string)
		}

		namespace campaignManagement {
			interface AddToTargetGroupOptions {
				targetUid: RecordUid
				uids?: RecordUid[]
				infoAreaId?: string
				source?: any
				elEvent?: any
				additionalParameters?: Record<string, any>
			}

			interface AddToTargetGroupResponse {
				error?: any
				response?: {
					addedUids?: RecordUid[]
					hasErrors?: boolean
				}
			}

			type AddToTargetGroupCallback = (sender: any, args: AddToTargetGroupResponse) => void

			function createTargetGroup(uid: RecordUid): void
			function executeActivity(uid: RecordUid): void
			function addToTargetGroup(options: AddToTargetGroupOptions, callback?: AddToTargetGroupCallback): void
		}

		namespace tabbedBrowsing {
			interface CRMTab {
				windowName: string
			}

			function getTab(): CRMTab
		}

		namespace tableCaptions {
			function read(readOptions: readOptions, callback: (sender, args: ReadResult) => void): void
			function invalidateCache(): void

			interface readOptions {
				uid: RecordUid
			}

			export interface ReadResult {
				tableCaption: u8.Crm.TableCaption
			}
		}

		namespace notification {
			function warn(message: string, options?: any, timeoutInMilliseconds?: number, caption?: string): string;
			function warn(notificationOptions: any): string;
			function info(message: string, options?: any, timeoutInMilliseconds?: number, caption?: string): string;
			function info(notificationOptions: any): string;
			function error(message: string, options?: any, timeoutInMilliseconds?: number, caption?: string): string;
			function error(notificationOptions: any): string;

			interface NotificationOptions {
				severity: number
				subject: string
				text: string
			}
			function write(options): void

			function errorToMessage(errorObject: any): void
		}

		namespace events {
			function getEvent(eventKey: string): any
			function getOrCreateEvent(eventKey: string): any
		}

		namespace popupBrowsing {
			function closePopup(): void
		}

		namespace schema {
			function getInfoArea(infoAreaId: string): u8.Crm.InfoAreaSchema
			function request(infoAreaId: string): void
			function getField(infoAreaId: string, fieldIdorXMLName: number | string): any // FieldSchema
		}

		namespace catalogs {
			function get(catalogId: string | number, parentCode?: string | number): u8.Crm.Catalog
			/**
			 * @deprecated
			 */
			function getCatalog(catalogId: string | number, parentCode?: number | string): u8.Crm.Catalog
			function tryGet(catId: string | number, parentCode?: number | string): u8.Crm.Catalog
			function tryGetCatalog(catId: string | number, parentCode?: number): u8.Crm.Catalog
			function request(catalogId: string | number, parentCode?: number): any
			function textToCode(catalog: u8.Crm.Catalog, value: string, parentCat?: u8.Crm.Catalog): string
			function codeToExternalKey(catalogId: number | string, code: number | string, parentCode?: number): string
		}

		namespace businessObjects {
			function executeTrigger(options: any, callback?: (request: any, result: TriggerResult) => void)
		}

		namespace phone {
			var commandBindings: Record<string, any>
		}

	}

	// Base Module
	namespace Base {
		interface _Argument {
			name: string
			name2: string 
			type: string 
			value: object
		}

		namespace Actions {
			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Actions/_ActionArguments
			 */
			 interface _ActionArguments {
				link: LinkRecordUid
				uid: RecordUid
			}

			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Actions/_ActionEventArgs 
			 */
			interface _ActionEventArgs {
				action: Action
				href: string
				isInteractive: boolean
			}

			interface _LoadEventArgs {
				action: Action
				configurationId: number
				image: string 
				label: string 
				name: string 
			}

			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Actions/_LoadOptions 
			 */
			interface _LoadOptions {
				arguments: _ActionArguments
				processState: number
				uid: RecordUid
			}

			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Actions/_ExecuteOptions 
			 */
			interface _ExecutionOptions {
				arguments: _ActionArguments
				createNewPopup: boolean | object
				createNewTab: boolean | object
				defaultArguments: Record<string, any>
				parameters: Record<string, any>
			}

			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Actions/_ExecuteDefaultOptions
			 */
			interface _ExecuteDefaultOptions extends _ExecutionOptions {
				linkName: string
				link: LinkRecordUid
			}

			/**
			 * @link https://crm-demo.aurea.com/sdk_docs/Client/type/u8/Base/Action
			 */
			interface Action {
				arguments: _Argument[]
				id: Number
				name: string
				target: string 
				templateName: string 
				type: string
				flags?: Array<any>
				
				getArgumentValue(name: string): string
				toString(): string
				toString_(): string
			}

		}

		interface IBindingPath {
			path: string[]
			useContextProvider: boolean
		}

		type BindingPathDefinition = string | string[] | IBindingPath

		interface IBindingParameters {
			id?: string
			source?
			sourcePath: BindingPathDefinition | string[]

			target?
			targetPath: BindingPathDefinition | string[]

			isDynamic?: boolean
			sourceToTarget?: boolean
			targetToSource?: boolean
			converter?: { from?: (value) => any, to?: (value) => any }
		}

		class Binding implements IBindingParameters {
			_isInitialized: boolean

			constructor(initParams: IBindingParameters | string)
			init(): void
			
			context: any
			source: any
			sourcePath: BindingPathDefinition
			target: any
			targetPath: BindingPathDefinition
			sourceToTarget: boolean
			targetToSource: boolean
			parent: any
			converter: { from: (value) => any; to: (value) => any }

			id: string
			isDynamic: boolean
			isInit: boolean

			validateSource(): void
			validateTarget(): void

			getSourceValue(): void
			getState(): void
			getTargetValue(): void
			isInitialized(): boolean

			updateSource(): void
			updateTarget(): void

			static createConverter(): any
			static createValidator(): any
			static parseOptions(): u8.Base.Binding
		}

		// #CRMP-336 #2024.2 #G.Kriegsauer - addes async option
		interface ICRMChannelRequest {
			endPoint: string
			arguments: any
			async?: boolean
			errorMode?: {
				autoHandleExceptions: boolean
				autoHandleMessages: boolean
			}
		}

		interface IEventSource {
			createEvent(name: string)
			getOrCreateEvent(name: string)
			bind(name: string, fn: Function, id?: string)
			bind(fn: Function, id?: string)
			unbind(fn?: Function)
			unbind(name?: string)
			raise(eventName: string, sender: any, eventArgs?: any)
			isRaising(name: string)
			withoutEvents(fn: Function)
		}
		
		class EventSource {
			static bind(name: string, fn: Function, id?: string)
			static bind(fn: Function, id?: string)
			static unbind(fn?: Function | string)
			static raise(eventName: string, sender?: any, eventArgs?: any)
			static isRaising(name: string)
			static withoutEvents(fn: Function)

			static getEvent(name: string)
			static getOrCreateEvent(name: string)
			static createEvent(name: string)
		}

		class Event {
			_delegates: Array<any>

			bind(fn: Function, id?: string)
			unbind(fn?: Function | string)
			raise()
		}

		class Model {
			get(key: string): string
			set(key: string, value): string

			parent: u8.Base.Widgets.Form
		}
		
		class Request {
			constructor(channelRequest: ICRMChannelRequest)
			execute(callback: (sender: any, args: any) => void): void
		}

		namespace Dom {
			function uniqueId()
			function layout(element: HTMLElement, options)

			class Keys {
				static isFunctional(code): boolean
			}
		}

		class Page {
			elWindow: Window

			using: Record<string, any>
			process: Process 

			onLoad(): void
			onUnload(): void
		
			proceed()
			busy(isBusy?: boolean): boolean
		}

		namespace Html {
			function escape(textToEscape: string): string
		}

		interface UTMLTemplateOptions {
			template: string
			data: any

			inserter(domElement: HTMLElement, htmlToInsert: string | HTMLElement | JQuery<HTMLElement>)
		}

		class Process {
			storage: any

			get(key: string)
			get(storageId: string, key: string)

			fail(reasonObject)

			onStepChange: CRMEvent
		}

		class ProcessStorage {
			get(key: string): string
		}

		interface PropertyChange {
			value
			previousValue
			propertyName: string
		}

		class Uri {
			constructor(url: string)
			getBoolean(name: string): boolean
		}

		namespace Widgets {
			namespace Tools {
				function closest<T extends u8.Base.Widgets.Widget>(widget: any, targetType: T): T
				function closest<T extends u8.Base.Widgets.Widget>(widget: any, targetType: string): T
				function getFirstDescendantOfType<T extends u8.Base.Widgets.Widget>(widget: any, targetType: string): T
			}

			class ComboBox {
				setItems(items: any): void
			}

			interface CommandResult {
				command: string
			}

			class Form {
				_bindings: u8.Base.Binding[]
				commandBindings?: Record<string, Function>

				update(): void

				createWidget(containerElement: HTMLElement, widgetId: string, parent: u8.Base.Widgets.Widget): u8.Base.Widgets.Widget
				getWidget(id: string): any

				widgets: Record<string, any> // these are the definitions of the widgets
			}

			class Grid {
				model: GridModel
				getModel(): GridModel
			}

			class GridModel {
				columns: Array<any>
				getSelectedRowIndex(): number
				getSelectedRowIndexes(): number[]
				getRowCount(): number

				getRow(index: number)
				getRowData(index: number)

				getCellData(rowIndex: number, columnIndex: number)
			}

			class MessageBox {
				static showPrompt(config: any, callback?: (msgBox: any, output: CommandResult) => void): void
				static showInfo(config: any, callback?: (msgBox: any, output: CommandResult) => void): void
				static showQuestion(config: any, callback?: (msgBox: any, output: CommandResult) => void): void
				static showWarning(config: any, callback?: (msgBox: any, output: CommandResult) => void): void
				static showError(config: any, callback?: (msgBox: any, output: CommandResult) => void): void
			}

			class Popup {
				constructor(htmlText: string, options)

				open()
			}

			class SearchInput{
				__field

				_dropDown
				_focused
				_input
				_isCycling
				_keyCode
				_keyDownText
				_mode
				_search
				_value

				_abortSearch(n)
				_hideSearch(hide?: boolean)
				_isDropDownVisible()
				_onInputKeyDown(sender, args)
				_onInputKeyUp(sender, args)
				_onInputBlur(sender, args)
				_onInputFocus(sender, args)
				_setMode(mode: string)
				_showSearch()
				_startSearch(text: string, callback: (s, args) => void)

				$: JQueryStatic

				allowNewValues
				searchProvider

				constructor(element, options)
				hasTextFocus()
				search(text: string)
				getValue()
				setText(text)
				setValue(value)
				getWidget()
				toggleSearchResult(visible: boolean, value)
			}

			interface TextInput extends u8.Base.Widgets.Widget {
				disabled: boolean
				
				getValue(): string
				setValue(newvalue: number | string): void
				update(options: { reason: string; properties: { disabled: boolean } }): void
			}

			class ToggleButton {
				groupName: string 
				id: string
				element: HTMLElement

				getGroupValue()
			}

			class TablePanel {

			}

			class Widget {
				id: string 
				element: HTMLElement
				parent: any

				constructor(element: HTMLElement, options)
				onDispose: u8.Base.Event
				dispose(): void

				setBindings(bindings: u8.Base.Binding[] | string)
				
				// jQuery function
				$(element)

			}

		}
	}

	// CRM Module
	namespace Crm {
		enum ExpandFieldStatus {
			inaccessible = 1,
			readonly = 2,
			enabled = 3
		}

		class ExpandModel {
			getUid(): RecordUid
			setUid(uid: RecordUid): void
			getField(fieldId: string | number)
			getFieldValue(fieldId: string | number)
			getFieldValue(infoAreaAlias: string, fieldId: string | number)
			setFieldValue(fieldId: string, value: any)
			setFieldValue(infoAreaAlias: string, fieldId: string | number, value: any)
			setFieldModified(infoAreaAlias: string, fieldId: string | number, value: any)

			clearModified(): void

			load(): void
			onPreSave: u8.Base.Event
			onSave: u8.Base.Event
		}

		class Filter {
			static formatValue(schema, value, parentValue)
		}

		class FieldSchema {
			arrayFieldIds: number[]
			attributes: Record<string, any>
			catalogNo: number
			catalogParentFieldId: number
			category: string 
			dataType: string 
			fieldId: number
			fieldIdBase: number 
			format
			infoArea: InfoAreaSchema
			infoAreaId: string
			label: string 
			length: number
			link: any
			mustField: boolean
			name: string 
			rights

			canCreate(): boolean
			canDelete(): boolean
			canUpdate(): boolean
			canView(): boolean
			clone(deep: boolean): FieldSchema
		}

		interface InfoAreaSchema {
			getField(fieldName: string | number): any
		}


		class List {
			maxRows: Number
			resultSet

			constructor(options)
			update(options, callback)

			dispose()
		}

		interface CatalogRequest {
			catalogNo: number
			fixed?: boolean
			parentCode?: number
			schema?: FieldSchema
		}

		/**
		 * Items of @see u8.Crm.Catalog describing the single catalog value
		 *
		 * @interface CRMCatalogItem
		 */
		interface CRMCatalogItem {
			/**
			 * Code no. of the catalog value
			 *
			 * @type {number}
			 * @memberof CRMCatalogItem
			 */
			code: number;

			/**
			 * Text (translation) of the catalog value
			 *
			 * @type {String}
			 * @memberof CRMCatalogItem
			 */
			text: string;

			/**
			 * Specific for a tenant?
			 *
			 * @type {Number}
			 * @memberof CRMCatalogItem
			 */
			tenantNo: number;

			/**
			 * External key of the catalog value
			 * Note: you should use this key for matchup or lookup (more stable)
			 * @type {String}
			 * @memberof CRMCatalogItem
			 */
			externalKey: string;

			/**
			 * Whether the catalog value is locked for user
			 *
			 * @type {Boolean}
			 * @memberof CRMCatalogItem
			 */
			isLocked: Boolean;
		}		

		class Catalog {
			constructor(catalogData)

			/**
			 * Catalog no. without typing (K/X)
			 *
			 * @memberof u8.Crm.Catalog
			 * @type {number}
			 */
			catalogNo: number;

			/**
			 * True = fixed, False = variable catalog
			 *
			 * @type {Boolean}
			 * @memberof u8.Crm.Catalog
			 */
			fixed: Boolean;

			/**
			 * No. of the parent catalog or -1 (if no parent)
			 * optional: in case the catalog has a parent catalog (hierarchical)
			 * @type {number}
			 * @memberof u8.Crm.Catalog
			 */
			parentCatalogNo: number;

			/**
			 * Code of the parent catalog item or -1 (if no parent)
			 * optional: in case the catalog has a parent catalog (hierarchical)
			 * @type {number}
			 * @memberof u8.Crm.Catalog
			 */
			parentCode: number;

			/**
			 * Text name of the catalog, e.g. Country
			 *
			 * @type {String}
			 * @memberof u8.Crm.Catalog
			 */
			text: string;

			/**
			 * Catalog value dictionary: key is the catalog code 
			 *
			 * @type {Object<number, CRMCatalogItem>}
			 * @memberof u8.Crm.Catalog
			 */
			valuesByCode: Record<number, CRMCatalogItem>;

			/**
			 * Catalog value array: index has no information value
			 *
			 * @type {Array<CRMCatalogItem>}
			 * @memberof u8.Crm.Catalog
			 */
			values: Array<CRMCatalogItem>;

			/**
			 * Look up the text value of a numeric catalog code
			 * @param code catalog code (number), which text is looked for
			 */
			codeToText(code: number | string): unknown;

			/**
			* Looks up the external key for the given catalog value code
			*
			* @param {number} code Catalog value code for lookup
			* @returns {String} External key of the found catalog value or @see null if no value has been found
			* @memberof u8.Crm.Catalog
			*/
			codeToExternalKey(code: number | string, parentCode?: number | string): string;

			/**
			 * Looks up the catalog value code for the given external key
			 *
			 * @param {String} extKey External key of the searched catalog value
			 * @returns {Number} Catalog value code greater than 0 or -1 if no value has been found
			 * @memberof u8.Crm.Catalog
			 */
			externalKeyToCode(extKey: string): number;

			getCatalogCodes(includeLocked?: boolean): number[]			
		}

		type FieldValuePair = {
			field: string | number
			value: any
		}

		interface FieldControl {
			attributes: Record<string, any>
			configurationId: number
			fieldControlType: string
			fieldGroupName: string
			rootPanel: any
			unitId: string
		}

		class FieldHook {
			private _executing: boolean
			private _hookFunction: (sender, args, $: FieldHook) => void

			field: { infoAreaId: string, fieldId: number, alias: string }
			hook: string

			parent: u8.Crm.ExpandModel
			value: string | number 
			widget: u8.Base.Widgets.Widget

			onCalculate()

			getLinks(): LinkRecordUid[]
			getUid(alias: string): RecordUid
		}

		class BusinessObject {
			constructor(uidArg)

			uid: RecordUid
			values: FieldValuePair[]

			get: <T = string | number>(fieldNameOrId: string | number) => T
		}

		class TableCaption {
			text: string
		}

		namespace Widgets {
			type ImageSize = 'xs' | 's' | '' | 'lg' | 'xl'

			interface IFieldRenderHookBaseContext {
				getUid(infoAreaIdOrAlias?: string): RecordUid
				getValue(fieldId: string | number, infoAreaIdOrAlias: string): any

				addClass(cssClassName: string): void
				removeClass(cssClassName: string): void
				toggleClass(cssClassName: string): void
				
				setColor(cssColorCode: string): void
				setBackgroundColor(cssColorCode: string): void
				
				setContextBackgroundColor(cssColorCode: string): void
				addContextClass(cssClassName: string): void
				removeContextClass(cssClassName: string): void
				toggleContextClass(cssClassName: string): void

				// available only for lists
				imageAdd(imageName: string, size?: ImageSize): void
				imageReplace(imageName: string, size?: ImageSize): void

				getText(): string
				setText(newValue: string): void

				getWidget(widgetId?: string): u8.Base.Widgets.Widget | undefined
			}

			class ExpandViewField {
				initialStatus: number
				inputWidgetId: string
				getInput(): u8.Base.Widgets.Widget
				getInput<T extends u8.Base.Widgets.Widget>(): T
			}
			class ExpandView extends u8.Base.Widgets.Widget {
				getViewMode(): 'Read' | 'Edit'
				model: ExpandModel
				switchModeAfterSave: boolean
				
				Field: ExpandViewField
				
				getField(fieldId: number | string | { fieldId: number | string, alias: string }): ExpandViewField
				getWidget(id: string): any
				isCreated(): boolean
				setVisible(visible: boolean): void
				save() : void
				// dirty solution, but no public function found for reseting the save button
				_resetSave(): void
				validationManager: any
			}
			class MatchUpView {
				static showAsPopup(options)
			}

			class RecordTreeView extends u8.Base.Widgets.Widget {

			}

			class ListView extends u8.Base.Widgets.Widget {
				model

				getWidget: (widgetName: string) => any
			}

			class ResultSetGrid extends u8.Base.Widgets.Widget {
				model: u8.Base.Widgets.GridModel

			}
			
		}

		class ResultSet {
			rows: { uids: RecordUid[], values: string[] }[]
		}

		interface QueryResult {
			cancel: boolean
			options: any
			resultSet: u8.Crm.ResultSet 
		}

		class QueryCommand {
			name: string
			link: LinkRecordUid
			links: LinkRecordUid[]
			maxRows: number
			parameters: Record<number, string>

			constructor(queryCmd: string)
			constructor(queryOptions?: any)

			execute(callback: (sender: u8.Crm.QueryCommand, result: any) => void): void

			execute(queryExecOptions, callback: (sender: u8.Crm.QueryCommand, result: any) => void): void
		}

		class QueryRecordSelector {
			constructor(options)

			execute(callback: (sender, args) => void)
		}

	}

}

declare namespace LGT {
	namespace Widgets {
		class PopupFormRecordSelector {
			constructor(options)
			execute(callback: (sender, args) => void): void
		}
	}
}

// Monkey patching
declare interface String {
	format(placeHolders): string
}

declare interface Date {
	addSeconds(seconds: number): Date
	addDays(numberOfDays: number): Date
	addMonths(numberOfMonths: number): Date
	addTime(dateTime: Date): Date
	diffDays(secondDate: Date): number
}

declare interface Array<T> {
	contains(item: any): boolean
}

declare interface ClassMakingConfiguration {
	name: string
	deriveFrom?: any
	events?: Array<string>
}

declare interface Function {
	makeClass(configuration: ClassMakingConfiguration): void
	chain(func: Function | Function[]): Function
}

declare interface JQuery<> {
	sel()

	utml(template: u8.Base.UTMLTemplateOptions)
}

declare interface CRMEvent {
	bind(callback: Function, id?: string)
}

declare interface Window {
	page: u8.Base.Page
	__DEBUG__: boolean

	$widget(id: string)
	$c(id: string)
}

declare const page: u8.Base.Page;

declare function $u(widgetClass: string | JQuery<HTMLElement>, context?: string): any
declare function $w(crmTabName: string | HTMLElement): Window
declare function $t(textId: string): string
declare function $t(textGroup: string, idInGroup: number): string
declare function $$(widgetHtml): any
declare function $p(windowOrPageName: Window | string): any // CRM Page
declare function $assert(predicate: boolean, errorMsg: string): void
declare function $command(widget, name: string, commandOptions): void

declare function evalWith(jsAsText:string, $:object, options?): any