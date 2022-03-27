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

class CMIElement {
    constructor(cmi) {
        this.version = new VersionElement()
        this.location = new Location(cmi.location)
        this.completionStatus = new CompletionStatus(cmi.completionStatus)
        this.objectives = new ObjectiveCollection(cmi.objectives)
        this.progressMeasure = new ProgressMeasure(cmi.progressMeasure)
    }

    access(path, write) {
        const [name, ...rest] = path
        switch (name) {
            case "_version": return this.version.access(rest, write)
            case "location": return this.location.access(rest, write)
            case "completion_status": return this.completionStatus.access(rest, write)
            case "objectives": return this.objectives.access(rest, write)
            case "progress_measure": return this.progressMeasure.access(rest, write)
            default: return null
        }
    }
}

class VersionElement {
    getValue() {
        return "1.0"
    }

    setValue(value) {
        throw new ReadOnlyError()
    }

    access(path) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }
}

class CompletionStatus {
    constructor(completionStatus) {
        this.completionStatus = completionStatus
    }

    getValue() {
        return this.completionStatus
    }

    setValue(completionStatus) {
        this.completionStatus = completionStatus
    }

    access(path) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }
}

class Location {
    constructor(location="") {
        this.location = location
    }

    getValue() {
        return this.location
    }

    setValue(location) {
        this.location = location
    }

    access(path) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }
}

class ObjectiveCollection {
    constructor(objectives=[]) {
        this.objectives = objectives.map(o => new Objective(o))
    }

    getValue() {
        throw new Error()
    }

    setValue(value) {
        throw new Error()
    }

    access(path, write) {
        const [name, ...rest] = path
        switch (name) {
            case "_count": {
                return new CountElement(this.objectives.length.toString())
            }
            default: {
                const index = parseInt(name, 10)
                return this.objectives[index].access(rest, write)
            }
        }
    }
}

class CountElement {
    constructor(count) {
        this.count = count
    }

    getValue() {
        return this.count
    }

    setValue() {
        throw new ReadOnlyError
    }

    access(path, write) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
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

    setValue(value) {
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
}

class ObjectiveId {
    constructor(id) {
        this.id = id
    }

    getValue() {
        return this.id
    }

    setValue(id) {
        this.id = id
    }

    access(path, write) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }
}

class ProgressMeasure {
    constructor(progressMeasure) {
        this.progressMeasure = this.progressMeasure
    }

    getValue() {
        return this.progressMeasure
    }

    setValue(progressMeasure) {
        this.progressMeasure = progressMeasure
    }

    access(path, write) {
        if (path.length === 0) {
            return this
        } else {
            return null
        }
    }
}

export default class API {
    constructor(cmi={}) {

        this.state = "not-initialized" // "not-initialized" | "running" | "terminated"
        this.errorCode = NoError
        this.cmi = new CMIElement(cmi)
        this.emitter = createNanoEvents()
    }

    on(event, callback) {
        return this.emitter.on(event, callback)
    }

    #setErrorCode(errorCode) {
        this.emitter.emit("error-code", errorCode)
        this.errorCode = errorCode
    }

    Initialize(param) {
        this.emitter.emit("call", "Initialize", param)

        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            return "false"
        }

        if (this.state === "running") {
            this.#setErrorCode(AlreadyInitialized)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ContentInstanceTerminated)
            return "false"
        }

        this.state = "running"
        this.#setErrorCode(NoError)
        return "true"
    }

    Terminate(param) {
        this.emitter.emit("call", "Terminate", param)

        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(TerminationBeforeInitialization)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(TerminationAfterTermination)
            return "false"
        }

        this.state = "terminated"
        this.#setErrorCode(NoError)
        return "true"
    }

    GetValue(element) {
        this.emitter.emit("call", "GetValue", element)

        if (this.state === "not-initialized") {
            this.#setErrorCode(RetrieveDataBeforeInitialization)
            return ""
        }

        if (this.state === "terminated") {
            this.#setErrorCode(RetrieveDataAfterTermination)
            return ""
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const element = this.cmi.access(rest, false)
            if (element) {
                const value = element.getValue()
                this.#setErrorCode(NoError)
                return value
            } else {
                this.#setErrorCode(UndefinedDataModelElement)
                return ""
            }
        } else {
            this.#setErrorCode(UndefinedDataModelElement)
            return ""
        }
    }

    // string
    SetValue(element, value) {
        this.emitter.emit("call", "SetValue", element, value)

        if (this.state === "not-initialized") {
            this.#setErrorCode(StoreDataBeforeTermination)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(StoreDataAfterTermination)
            return "false"
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const element = this.cmi.access(rest, false)
            if (element) {
                try {
                    element.setValue(value)
                    this.#setErrorCode(NoError)
                    return "true"
                } catch (error) {
                    if (error instanceof ReadOnlyError) {
                        this.#setErrorCode(DataModelElementIsReadOnly)
                        return "false"
                    } else {
                        throw error
                    }
                }
            } else {
                this.#setErrorCode(UndefinedDataModelElement)
                return "false"
            }
        } else {
            this.#setErrorCode(UndefinedDataModelElement)
            return "false"
        }
    }

    Commit(param) {
        this.emitter.emit("call", "Commit", param)

        if (param !== "") {
            this.#setErrorCode(GeneralArgumentError)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(CommitBeforeInitialization)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(CommitAfterTermination)
            return "false"
        }

        return "true" // TODO
    }

    GetLastError() {
        this.emitter.emit("call", "GetLastError")

        return this.errorCode
    }

    GetErrorString(errorCode) {
        this.emitter.emit("call", "GetErrorString", errorCode)

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
                return "DataModelElementValueOutOfRange"

            case DataModelDependencyNotEstablished:
                return "DataModelDependencyNotEstablished"

            default:
                return `Unknown error code: ${errorCode}`
        }
    }

    GetDiagnostic(errorCode) {
        this.emitter.emit("call", "GetDiagnostic", errorCode)

        return ""
    }
}
