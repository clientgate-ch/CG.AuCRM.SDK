export interface TriggerExecutionOptions {
    uid?: RecordUid
    uids?: RecordUid[]
    infoAreaId?: string
    name: string

    refreshAfterExecution?: boolean
    callbackFunction?: (sender, result:TriggerResult) => void
}

export interface TriggerActionOptions {
    name: string
    uid?: RecordUid
    recordSet?: RecordUid[]
    infoAreaId?: string

    source: u8.Base.Widgets.Widget

    refreshAfterExecution?: boolean
    callbackFunction?: (sender, result:TriggerResult, source?: u8.Base.Widgets.Widget) => void
}

export interface TriggerChange {
    accessMode: Number
    uid: RecordUid
}

export interface TriggerResult {
    changedRecords?: TriggerChange[]
    changedFields?: Number[]

    error? 
}
