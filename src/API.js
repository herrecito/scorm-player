// No error             0
// General Errors       100 - 199
// Syntax Errors        200 - 299
// RTS Errors           300 - 399
// Data Model Errors    400 - 499
// Implentation-defined 1000 - 65535

import { createNanoEvents } from "nanoevents"

const NoError = "0"

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

const GeneralArgumentError = "201"

const GeneralGetFailure = "301"
const GeneralSetFailure = "351"
const GeneralCommitFailure = "391"

const UndefinedDataModelElement = "401"
const UnimplementedDataModelElement = "402"
const DataModelElementValueNotInitialized = "403"
const DataModelElementIsReadOnly = "404"
const DataModelElementIsWriteOnly = "405"
const DataModelElementTypeMismatch = "406"
const DataModelElementValueOutOfRange = "407"
const DataModelDependencyNotEstablished = "408"

export default class API {
    constructor(cmi={}) {
        const { objectives=[] } = cmi

        this.state = "not-initialized" // "not-initialized" | "running" | "terminated"
        this.errorCode = NoError

        this.cmi = {
            location: "",
            objectives: objectives,
            completionStatus: "unknown"
        }

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

        let value = ""

        const result = /cmi\.objectives\.(\d+)\.id/.exec(element)
        if (result) {
            let idx = result[1]
            idx = parseInt(idx, 10)
            value = this.cmi.objectives[idx].id
        } else {
            switch (element) {
                case "cmi._version": {
                    value = "1.0"
                    break
                }

                case "cmi.completion_status": {
                    value = this.cmi.completionStatus
                    break
                }

                case "cmi.objectives._count": {
                    value = this.cmi.objectives.length.toString()
                    break
                }

                case "cmi.location": {
                    value = this.cmi.location
                    break
                }

                default: {
                    this.#setErrorCode(UndefinedDataModelElement)
                    return ""
                }
            }
        }

        this.#setErrorCode(NoError)
        return value
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

        switch (element) {
            case "cmi.completion_status": {
                this.cmi.completionStatus = value
                return "true"
                break
            }

            case "cmi.location": {
                this.cmi.location = value
                return "true"
                break
            }

            default: {
                this.#setErrorCode(UndefinedDataModelElement)
                return "false"
            }
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
