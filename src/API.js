import { createNanoEvents } from "nanoevents"

import {
    CMI,
    ReadOnlyError,
    WriteOnlyError,
    TypeMismatchError,
    ValueNotInitializedError,
    OutOfBoundError,
    DuplicatedObjectiveIdError,
    InvalidPatternError,
    TargetNotCreatableError,
} from "./dataModel.js"

const ErrorCodes = {
    NoError: "0",

    // General Errors [100 - 199]
    GeneralException: "101",
    GeneralInitializationFailure: "102",
    AlreadyInitialized: "103",
    ContentInstanceTerminated: "104",
    GeneralTerminationFailure: "111",
    TerminationBeforeInitialization: "112",
    TerminationAfterTermination: "113",
    RetrieveDataBeforeInitialization: "122",
    RetrieveDataAfterTermination: "123",
    StoreDataBeforeTermination: "132",
    StoreDataAfterTermination: "133",
    CommitBeforeInitialization: "142",
    CommitAfterTermination: "143",

    // Syntax Errors [200 - 299]
    GeneralArgumentError: "201",

    // RTS (LMS) Errors [300 - 399]
    GeneralGetFailure: "301",
    GeneralSetFailure: "351",
    GeneralCommitFailure: "391",

    // Data Model Errors [400 - 499]
    UndefinedDataModelElement: "401",
    UnimplementedDataModelElement: "402",
    DataModelElementValueNotInitialized: "403",
    DataModelElementIsReadOnly: "404",
    DataModelElementIsWriteOnly: "405",
    DataModelElementTypeMismatch: "406",
    DataModelElementValueOutOfRange: "407",
    DataModelDependencyNotEstablished: "408",
}

export default class API {
    constructor(cmi={}) {
        this.state = "not-initialized" // "not-initialized" | "running" | "terminated"
        this.errorCode = ErrorCodes.NoError
        this.cmi = new CMI(cmi)

        Object.assign(this, createNanoEvents())
    }

    #setErrorCode(errorCode) {
        this.emit("error-code", errorCode)
        this.errorCode = errorCode
    }

    Initialize(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            this.emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        if (this.state === "running") {
            this.#setErrorCode(ErrorCodes.AlreadyInitialized)
            this.emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.ContentInstanceTerminated)
            this.emit("call", "Initialize", [param], "false", true)
            return "false"
        }

        this.state = "running"
        this.#setErrorCode(ErrorCodes.NoError)
        this.emit("call", "Initialize", [param], "true")
        return "true"
    }

    Terminate(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            this.emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.TerminationBeforeInitialization)
            this.emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.TerminationAfterTermination)
            this.emit("call", "Terminate", [param], "false", true)
            return "false"
        }

        this.emit("persist", this.cmi.export())

        this.state = "terminated"
        this.#setErrorCode(ErrorCodes.NoError)
        this.emit("call", "Terminate", [param], "true")
        return "true"
    }

    GetValue(element) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.RetrieveDataBeforeInitialization)
            this.emit("call", "GetValue", [element], "", true)
            return ""
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.RetrieveDataAfterTermination)
            this.emit("call", "GetValue", [element], "", true)
            return ""
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const modelElement = this.cmi.access(rest, false)
            if (modelElement) {
                try {
                    const value = modelElement.getValue()
                    this.#setErrorCode(ErrorCodes.NoError)
                    this.emit("call", "GetValue", [element], value)
                    return value
                } catch (error) {
                    if (error instanceof WriteOnlyError) {
                        this.#setErrorCode(ErrorCodes.DataModelElementIsWriteOnly)
                        this.emit("call", "GetValue", [element], "", true)
                        return ""
                    } else if (error instanceof ValueNotInitializedError) {
                        this.#setErrorCode(ErrorCodes.DataModelElementValueNotInitialized)
                        this.emit("call", "GetValue", [element], "", true)
                        return ""
                    } else {
                        throw error
                    }
                }
            } else {
                this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
                this.emit("call", "GetValue", [element], "", true)
                return ""
            }
        } else {
            this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
            this.emit("call", "GetValue", [element], "", true)
            return ""
        }
    }

    SetValue(element, value) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.StoreDataBeforeTermination)
            this.emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.StoreDataAfterTermination)
            this.emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            try {
                const modelElement = this.cmi.access(rest, true)
                if (modelElement) {
                    try {
                        modelElement.setValue(value)
                        this.#setErrorCode(ErrorCodes.NoError)
                        this.emit("call", "SetValue", [element, value], "true")
                        return "true"
                    } catch (error) {
                        if (error instanceof ReadOnlyError) {
                            this.#setErrorCode(ErrorCodes.DataModelElementIsReadOnly)
                            this.emit("call", "SetValue", [element, value], "false", true)
                            return "false"
                        } else if (error instanceof TypeMismatchError) {
                            this.#setErrorCode(ErrorCodes.DataModelElementTypeMismatch)
                            this.emit("call", "SetValue", [element, value], "false", true)
                            return "false"
                        } else if (error instanceof InvalidPatternError) {
                            this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                            this.emit("call", "SetValue", [element, value], "false", true)
                            return "false"
                        } else if (error instanceof DuplicatedObjectiveIdError) {
                            this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                            this.emit("call", "SetValue", [element, value], "false", true)
                            return "false"
                        } else {
                            throw error
                        }
                    }
                } else {
                    this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
                    this.emit("call", "SetValue", [element, value], "false", true)
                    return "false"
                }
            } catch (error) {
                if (error instanceof OutOfBoundError) {
                    this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                    this.emit("call", "SetValue", [element, value], "false", true)
                    return "false"
                } else if (error instanceof TargetNotCreatableError) {
                    this.#setErrorCode(ErrorCodes.DataModelDependencyNotEstablished)
                    this.emit("call", "GetValue", [element], "", true)
                    return "false"
                } else {
                    throw error
                }
            }
        } else {
            this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
            this.emit("call", "SetValue", [element, value], "false", true)
            return "false"
        }
    }

    Commit(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            this.emit("call", "Commit", [param], "false", true)
            return "false"
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.CommitBeforeInitialization)
            this.emit("call", "Commit", [param], "false", true)
            return "false"
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.CommitAfterTermination)
            this.emit("call", "Commit", [param], "false", true)
            return "false"
        }

        this.emit("persist", this.cmi.export())

        this.#setErrorCode(ErrorCodes.NoError)
        this.emit("call", "Commit", [param], "true")
        return "true"
    }

    GetLastError() {
        this.emit("call", "GetLastError", [], this.errorCode)
        return this.errorCode
    }

    GetErrorString(errorCode) {
        const ErrorNames = Object.fromEntries(Object.entries(ErrorCodes).map(([k, v]) => [v, k]))
        const errorString = ErrorNames[errorCode] ?? `Unknown error code: ${errorCode}`
        this.emit("call", "GetErrorString", [errorCode], errorString)
        return errorString
    }

    GetDiagnostic(errorCode) {
        this.emit("call", "GetDiagnostic", [errorCode], "")
        return ""
    }
}
