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
const StoreDataBeforeTermination = "133" // TODO
const StoreDataAfterTermination = "133" // TODO
const CommitBeforeInitialization = "142"
const CommitAfterTermination = "143" // TODO

const GeneralArgumentError = "201"

const GeneralGetFailure = "301"
const GeneralSetFailure = "351"
const GeneralCommitFailure = "391"

const UndefinedDataModelElement = "401" // TODO
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

        switch (element) {
            case "cmi.completionStatus": {
                this.cmi.completionStatus = value
            }

            case "cmi.location": {
                this.cmi.location = value
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

        return "" // TODO
    }

    GetDiagnostic(errorCode) {
        this.emitter.emit("call", "GetDiagnostic", errorCode)

        return "" // TODO
    }
}
