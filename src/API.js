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

    emitCall(fn, args, returnValue) {
        this.emit("call", fn, args, returnValue)
        return returnValue
    }

    Initialize(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            return this.emitCall("Initialize", [param], "false")
        }

        if (this.state === "running") {
            this.#setErrorCode(ErrorCodes.AlreadyInitialized)
            return this.emitCall("Initialize", [param], "false")
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.ContentInstanceTerminated)
            return this.emitCall("Initialize", [param], "false")
        }

        this.state = "running"
        this.#setErrorCode(ErrorCodes.NoError)
        return this.emitCall("Initialize", [param], "true")
    }

    Terminate(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            return this.emitCall("Terminate", [param], "false")
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.TerminationBeforeInitialization)
            return this.emitCall("Terminate", [param], "false")
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.TerminationAfterTermination)
            return this.emitCall("Terminate", [param], "false")
        }

        this.state = "terminated"
        this.#setErrorCode(ErrorCodes.NoError)
        return this.emitCall("Terminate", [param], "true")
    }

    GetValue(element) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.RetrieveDataBeforeInitialization)
            return this.emitCall("GetValue", [element], "")
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.RetrieveDataAfterTermination)
            return this.emitCall("GetValue", [element], "")
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            const modelElement = this.cmi.access(rest, false)
            if (modelElement) {
                try {
                    const value = modelElement.getValue()
                    this.#setErrorCode(ErrorCodes.NoError)
                    return this.emitCall("GetValue", [element], value)
                } catch (error) {
                    if (error instanceof WriteOnlyError) {
                        this.#setErrorCode(ErrorCodes.DataModelElementIsWriteOnly)
                        return this.emitCall("GetValue", [element], "")
                    } else if (error instanceof ValueNotInitializedError) {
                        this.#setErrorCode(ErrorCodes.DataModelElementValueNotInitialized)
                        return this.emitCall("GetValue", [element], "")
                    } else {
                        throw error
                    }
                }
            } else {
                this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
                return this.emitCall("GetValue", [element], "")
            }
        } else {
            this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
            return this.emitCall("GetValue", [element], "")
        }
    }

    SetValue(element, value) {
        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.StoreDataBeforeTermination)
            return this.emitCall("SetValue", [element, value], "false")
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.StoreDataAfterTermination)
            return this.emitCall("SetValue", [element, value], "false")
        }

        const [name, ...rest] = element.split(".")
        if (name === "cmi") {
            try {
                const modelElement = this.cmi.access(rest, true)
                if (modelElement) {
                    try {
                        modelElement.setValue(value)
                        this.#setErrorCode(ErrorCodes.NoError)
                        return this.emitCall("SetValue", [element, value], "true")
                    } catch (error) {
                        if (error instanceof ReadOnlyError) {
                            this.#setErrorCode(ErrorCodes.DataModelElementIsReadOnly)
                            return this.emitCall("SetValue", [element, value], "false")
                        } else if (error instanceof TypeMismatchError) {
                            this.#setErrorCode(ErrorCodes.DataModelElementTypeMismatch)
                            return this.emitCall("SetValue", [element, value], "false")
                        } else if (error instanceof InvalidPatternError) {
                            this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                            return this.emitCall("SetValue", [element, value], "false")
                        } else if (error instanceof DuplicatedObjectiveIdError) {
                            this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                            return this.emitCall("SetValue", [element, value], "false")
                        } else {
                            throw error
                        }
                    }
                } else {
                    this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
                    return this.emitCall("SetValue", [element, value], "false")
                }
            } catch (error) {
                if (error instanceof OutOfBoundError) {
                    this.#setErrorCode(ErrorCodes.GeneralSetFailure)
                    return this.emitCall("SetValue", [element, value], "false")
                } else if (error instanceof TargetNotCreatableError) {
                    this.#setErrorCode(ErrorCodes.DataModelDependencyNotEstablished)
                    return this.emitCall("GetValue", [element], "false")
                } else {
                    throw error
                }
            }
        } else {
            this.#setErrorCode(ErrorCodes.UndefinedDataModelElement)
            return this.emitCall("SetValue", [element, value], "false")
        }
    }

    Commit(param) {
        if (param !== "") {
            this.#setErrorCode(ErrorCodes.GeneralArgumentError)
            return this.emitCall("Commit", [param], "false")
        }

        if (this.state === "not-initialized") {
            this.#setErrorCode(ErrorCodes.CommitBeforeInitialization)
            return this.emitCall("Commit", [param], "false")
        }

        if (this.state === "terminated") {
            this.#setErrorCode(ErrorCodes.CommitAfterTermination)
            return this.emitCall("Commit", [param], "false")
        }

        this.#setErrorCode(ErrorCodes.NoError)
        return this.emitCall("Commit", [param], "true")
    }

    GetLastError() {
        return this.emitCall("GetLastError", [], this.errorCode)
    }

    GetErrorString(errorCode) {
        const ErrorNames = Object.fromEntries(Object.entries(ErrorCodes).map(([k, v]) => [v, k]))
        const errorString = ErrorNames[errorCode] ?? `Unknown error code: ${errorCode}`
        return this.emitCall("GetErrorString", [errorCode], errorString)
    }

    GetDiagnostic(errorCode) {
        return this.emitCall("GetDiagnostic", [errorCode], "")
    }
}
