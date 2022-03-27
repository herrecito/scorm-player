import { createNanoEvents } from "nanoevents"

const NoError = "0"

// General Errors [100 - 199]
const GeneralException = "101"
const GeneralInitializationFailure = "102"
const AlreadyInitialized = "103"
const ContentInstanceTerminated = "104"
const GeneralTerminationFailure = "111"
const TerminationBeforeInitialization = "112"
const TerminationAfterTermination = "113"
const RetrieveDataBeforeInitialization = "122"
const RetrieveDataAfterTermination = "123"
const StoreDataBeforeTermination = "132"
const StoreDataAfterTermination = "133"
const CommitBeforeInitialization = "142"
const CommitAfterTermination = "143"

// Syntax Errors [200 - 299]
const GeneralArgumentError = "201"

// RTS (LMS) Errors [300 - 399]
const GeneralGetFailure = "301"
const GeneralSetFailure = "351"
const GeneralCommitFailure = "391"

// Data Model Errors [400 - 499]
const UndefinedDataModelElement = "401"
const UnimplementedDataModelElement = "402"
const DataModelElementValueNotInitialized = "403"
const DataModelElementIsReadOnly = "404"
const DataModelElementIsWriteOnly = "405"
const DataModelElementTypeMismatch = "406"
const DataModelElementValueOutOfRange = "407"
const DataModelDependencyNotEstablished = "408"

class ReadOnlyError extends Error {
}

class WriteOnlyError extends Error {
}

class TypeMismatchError extends Error {
}

class ValueNotInitializederror extends Error {
}

class SimpleElement {
    constructor(value) {
        this.value = value
    }

    getValue() {
        if (this.value === undefined) throw new ValueNotInitializederror()

        return this.value
    }

    setValue(value) {
        this.value = value
    }

    access(path) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }

    export() {
        return this.value
    }
}

class ROSimpleElement extends SimpleElement {
    setValue() {
        throw new ReadOnlyError()
    }
}

class CMIElement {
    constructor(cmi) {
        this.location = new Location(cmi.location)
        this.completionStatus = new CompletionStatus(cmi.completionStatus)
        this.successStatus = new SuccessStatus(cmi.successStatus)
        this.objectives = new ObjectiveCollection(cmi.objectives)
        this.progressMeasure = new ProgressMeasure(cmi.progressMeasure)
        this.sessionTime = new SessionTime(cmi.sessionTime)
        this.suspendData = new SuspendData(cmi.suspendData)
        this.mode = new Mode(cmi.mode)
        this.exit = new ExitElement()
    }

    access(path, write) {
        const [name, ...rest] = path
        switch (name) {
            case "_version":
                return new ROSimpleElement("1.0").access(rest, write)

            case "suspend_data":
                return this.suspendData.access(rest, write)

            case "location":
                return this.location.access(rest, write)

            case "completion_status":
                return this.completionStatus.access(rest, write)

            case "success_status":
                return this.successStatus.access(rest, write)

            case "objectives":
                return this.objectives.access(rest, write)

            case "progress_measure":
                return this.progressMeasure.access(rest, write)

            case "exit":
                return this.exit.access(rest, write)

            case "mode":
                return this.mode.access(rest, write)

            case "session_time":
                return this.sessionTime.access(rest, write)

            default:
                return null
        }
    }

    export() {
        return {
            location: this.location.export(),
            completionStatus: this.completionStatus.export(),
            successStatus: this.successStatus.export(),
            objectives: this.objectives.export(),
            suspendData: this.suspendData.export(),
            progressMeasure: this.progressMeasure.export(),
            exit: this.exit.export(),
            mode: this.mode.export(),
            sessionTime: this.sessionTime.export()
        }
    }
}

class SuspendData extends SimpleElement {
}

class Mode extends ROSimpleElement {
    constructor(mode="normal") {
        super(mode)
    }
}

class CompletionStatus extends SimpleElement {
    constructor(completionStatus="unknown") {
        super(completionStatus)
    }
}

class SuccessStatus extends SimpleElement {
    constructor(successStatus="unknown") {
        super(successStatus)
    }
}

class Location extends SimpleElement {
}

class ObjectiveCollection {
    constructor(objectives=[]) {
        this.objectives = objectives.map(o => new Objective(o))
    }

    getValue() {
        throw new Error()
    }

    setValue() {
        throw new Error()
    }

    access(path, write) {
        const [name, ...rest] = path
        switch (name) {
            case "_count": {
                return new ROSimpleElement(this.objectives.length.toString()).access(rest, write)
            }
            default: {
                const index = parseInt(name, 10)
                return this.objectives[index].access(rest, write)
            }
        }
    }

    export() {
        return this.objectives.map(o => o.export())
    }
}

class Objective {
    constructor(objective) {
        this.id = new ObjectiveId(objective.id)
        this.progressMeasure = new ProgressMeasure(objective.progressMeasure)
        this.completionStatus = new CompletionStatus(objective.progressMeasure)
    }

    getValue() {
        throw new Error()
    }

    setValue() {
        throw new Error()
    }

    access(path, write) {
        const [name, ...rest] = path
        switch (name) {
            case "id": return this.id.access(rest, write)
            case "progress_measure": return this.progressMeasure.access(rest, write)
            case "completion_status": return this.completionStatus.access(rest, write)
            default: return null
        }
    }

    export() {
        return {
            id: this.id.export(),
            progressMeasure: this.progressMeasure.export(),
            completionStatus: this.completionStatus.export()
        }
    }
}

class ObjectiveId extends SimpleElement {
}

class ProgressMeasure extends SimpleElement {
}

class ExitElement extends SimpleElement {
    // TODO validate when initializing? allow initializing with a value?

    setValue(value) {
        const validValues = ["time-out", "suspend", "logout", "normal", ""]
        if (!validValues.includes(value)) throw new TypeMismatchError()
        this.value = value
    }

    getValue() {
        throw new WriteOnlyError()
    }
}

class SessionTime extends SimpleElement {
}


export default class API {
    #emitter = createNanoEvents()

    constructor(cmi={}) {
        this.state = "not-initialized" // "not-initialized" | "running" | "terminated"
        this.errorCode = NoError
        this.cmi = new CMIElement(cmi)
    }

    on(event, callback) {
        return this.#emitter.on(event, callback)
    }

    #emit(...args) {
        return this.#emitter.emit(...args)
    }

    #setErrorCode(errorCode) {
        this.#emit("error-code", errorCode)
        this.errorCode = errorCode
    }

    Initialize(param) {
        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            this.#emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        if (this.state === "running") {
            this.#setErrorCode(AlreadyInitialized)
            this.#emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ContentInstanceTerminated)
            this.#emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        this.state = "running"
        this.#setErrorCode(NoError)
        this.#emit("call", "Initialize", [param], "true")
        return "true"
    }

    Terminate(param) {
        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            this.#emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(TerminationBeforeInitialization)
            this.#emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(TerminationAfterTermination)
            this.#emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        this.#emit("persist", this.cmi.export())

        this.state = "terminated"
        this.#setErrorCode(NoError)
        this.#emit("call", "Terminate", [param], "true")
        return "true"
    }

    GetValue(element) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(RetrieveDataBeforeInitialization)
            this.#emit("call", "GetValue", [element], "", true)
            return ""
        }

        if (this.state === "terminated") {
            this.#setErrorCode(RetrieveDataAfterTermination)
            this.#emit("call", "GetValue", [element], "", true)
            return ""
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const modelElement = this.cmi.access(rest, false)
            if (modelElement) {
                try {
                    const value = modelElement.getValue()
                    this.#setErrorCode(NoError)
                    this.#emit("call", "GetValue", [element], value)
                    return value
                } catch (error) {
                    if (error instanceof WriteOnlyError) {
                        this.#setErrorCode(DataModelElementIsWriteOnly)
                        this.#emit("call", "GetValue", [element], "", true)
                        return ""
                    } else if (error instanceof ValueNotInitializederror) {
                        this.#setErrorCode(DataModelElementValueNotInitialized)
                        this.#emit("call", "GetValue", [element], "", true)
                        return ""
                    } else {
                        throw error
                    }
                }
            } else {
                this.#setErrorCode(UndefinedDataModelElement)
                this.#emit("call", "GetValue", [element], "", true)
                return ""
            }
        } else {
            this.#setErrorCode(UndefinedDataModelElement)
            this.#emit("call", "GetValue", [element], "", true)
            return ""
        }
    }

    SetValue(element, value) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(StoreDataBeforeTermination)
            this.#emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(StoreDataAfterTermination)
            this.#emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const modelElement = this.cmi.access(rest, false)
            if (modelElement) {
                try {
                    modelElement.setValue(value)
                    this.#setErrorCode(NoError)
                    this.#emit("call", "SetValue", [element, value], "true")
                    return "true"
                } catch (error) {
                    if (error instanceof ReadOnlyError) {
                        this.#setErrorCode(DataModelElementIsReadOnly)
                        this.#emit("call", "SetValue", [element, value], "false", true)
                        return "false"
                    } else if (error instanceof TypeMismatchError) {
                        this.#setErrorCode(DataModelElementTypeMismatch)
                        this.#emit("call", "SetValue", [element, value], "false", true)
                        return "false"
                    } else {
                        throw error
                    }
                }
            } else {
                this.#setErrorCode(UndefinedDataModelElement)
                this.#emit("call", "SetValue", [element, value], "false", true)
                return "false"
            }
        } else {
            this.#setErrorCode(UndefinedDataModelElement)
            this.#emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }
    }

    Commit(param) {
        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            this.#emit("call", "Commit", [param], "false", true)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(CommitBeforeInitialization)
            this.#emit("call", "Commit", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(CommitAfterTermination)
            this.#emit("call", "Commit", [param], "false", true)
            return "false"
        }

        this.#emit("persist", this.cmi.export())

        this.#setErrorCode(NoError)
        this.#emit("call", "Commit", [param], "true")
        return "true"
    }

    GetLastError() {
        this.#emit("call", "GetLastError", [], this.errorCode)

        return this.errorCode
    }

    GetErrorString(errorCode) {
        this.#emit("call", "GetErrorString", [errorCode], "")

        switch (errorCode) {
            case NoError:
                return "No Error"

            case GeneralException:
                return "General Exception"

            case GeneralInitializationFailure:
                return "General Initialization Failure"

            case AlreadyInitialized:
                return "Already Initialized"

            case ContentInstanceTerminated:
                return "Content Instance Terminated"

            case GeneralTerminationFailure:
                return "General Termination Failure"

            case TerminationBeforeInitialization:
                return "Termination Before Initialization"

            case TerminationAfterTermination:
                return "Termination After Termination"

            case RetrieveDataBeforeInitialization:
                return "Retrieve Data Before Initialization"

            case RetrieveDataAfterTermination:
                return "Retrieve Data After Termination"

            case StoreDataBeforeTermination:
                return "Store Data Before Termination"

            case StoreDataAfterTermination:
                return "Store Data After Termination"

            case CommitBeforeInitialization:
                return "Commit Before Initialization"

            case CommitAfterTermination:
                return "Commit After Termination"

            case GeneralArgumentError:
                return "General Argument Error"

            case GeneralGetFailure:
                return "General Get Failure"

            case GeneralSetFailure:
                return "General Set Failure"

            case GeneralCommitFailure:
                return "General Commit Failure"

            case UndefinedDataModelElement:
                return "Undefined Data Model Element"

            case UnimplementedDataModelElement:
                return "UnimplementedDataModelElement"

            case DataModelElementValueNotInitialized:
                return "DataModelElementValueNotInitialized"

            case DataModelElementIsReadOnly:
                return "DataModelElementIsReadOnly"

            case DataModelElementIsWriteOnly:
                return "DataModelElementIsWriteOnly"

            case DataModelElementTypeMismatch:
                return "DataModelElementTypeMismatch"

            case DataModelElementValueOutOfRange:
                return "Data Model Element Value Out Of Range"

            case DataModelDependencyNotEstablished:
                return "Data Model Dependency Not Established"

            default:
                return `Unknown error code: ${errorCode}`
        }
    }

    GetDiagnostic(errorCode) {
        this.#emit("call", "GetDiagnostic", [errorCode], "")

        return ""
    }
}
