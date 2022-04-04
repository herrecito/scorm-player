import { createNanoEvents } from "nanoevents"
import isUndefined from "lodash/isUndefined.js"
import isValid from "date-fns/isValid/index.js"
import parseISO from "date-fns/parseISO/index.js"

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

class OutOfBoundError extends Error {
}

class DuplicatedObjectiveIdError extends Error {
}

class TargetNotCreatableError extends Error {
}

function creatable(Element) {
    return class extends Element {
        constructor(...args) {
            super(...args)
            this.creatable = true
        }
    }
}

function writeOnly(Element) {
    return class extends Element {
        getValue() {
            throw new WriteOnlyError()
        }
    }
}

function readOnly(Element) {
    return class extends Element {
        setValue() {
            throw new ReadOnlyError()
        }
    }
}

class SimpleElement {
    constructor(value, parent) {
        this.value = value
        this.parent = parent
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

class TimestampElement {
    constructor(value, parent) {
        this.value = value
        this.parent = parent
    }

    getValue() {
        if (this.value === undefined) throw new ValueNotInitializederror()

        return this.value
    }

    setValue(value) {
        if (!isValid(parseISO(value))) throw new TypeMismatchError() // TODO pass value to error
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

function createCollectionElement(Element) {
    return class {
        constructor(items=[], parent) {
            this.items = items.map(item => new Element(item))
            this.parent = parent
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
                    return new (readOnly(SimpleElement))(this.items.length.toString(), this).access(rest, write)
                }

                case "_children": {
                    return new (readOnly(SimpleElement))(Element.children.join(","), this).access(rest, write)
                }

                default: {
                    const index = parseInt(name, 10)
                    if (index in this.items) {
                        return this.items[index].access(rest, write)
                    } else if (write && index >= 0 && index <= this.items.length) {
                        const element = new Element(undefined, this)
                        const target = element.access(rest, write)
                        if (!target.creatable) throw new TargetNotCreatableError()
                        this.items[index] = element
                        return target
                    } else {
                        throw new OutOfBoundError()
                    }
                }
            }
        }

        export() {
            return this.items.map(o => o.export())
        }
    }
}

const Mode = readOnly(class extends SimpleElement {
    constructor(mode="normal") {
        super(mode)
    }
})

const CompletionThreshold = readOnly(class extends SimpleElement {
    constructor(completionThreshold) {
        if (!isUndefined(completionThreshold)) {
            const th = parseFloat(completionThreshold)
            if (Number.isNaN(th)) throw new Error()
            if (th < 0) throw new Error()
            if (th > 1) throw new Error()
        }
        super(completionThreshold)
    }
})

const Credit = readOnly(class extends SimpleElement {
    constructor(credit="credit") {
        if (!["credit", "no credit"].includes(credit)) throw new Error()
        super(credit)
    }
})

class CompletionStatus extends SimpleElement {
    constructor(completionStatus="unknown") {
        super(completionStatus)
    }

    getValue(cmi) {
        if (!isUndefined(cmi.completion_threshold)) {
            if (!isUndefined(cmi.progress_measure)) {
                const th = parseFloat(cmi.completion_threshold)
                const pr = parseFloat(cmi.progress_measure)
                if (pr >= th) {
                    return "completed"
                } else {
                    return "incomplete"
                }
            } else {
                return "unknown"
            }
        } else {
            return this.value
        }
    }

    setValue(value) {
        if (!["completed", "incomplete", "not attempted", "unknown"].includes(value)) {
            throw new TypeMismatchError()
        }
        this.value = value
    }
}

// TODO is an enum
class SuccessStatus extends SimpleElement {
    constructor(successStatus="unknown") {
        super(successStatus)
    }
}

// children: { [name: string]: Constructor }
function createAggregateElement(children) {
    return class {
        static children = Object.keys(children)

        constructor(value, parent) {
            for (const [name, constructor] of Object.entries(children)) {
                this[name] = new constructor(value?.[name], this)
            }
            this.parent = parent
        }

        access(path, write) {
            const [name, ...rest] = path
            if (name in children) {
                return this[name].access(rest, write)
            } else {
                return null
            }
        }

        export() {
            const obj = {}
            for (const name of Object.keys(children)) {
                obj[name] = this[name].export()
            }
            return obj
        }
    }
}

const CommentFromLearner = createAggregateElement({
    comment:   creatable(SimpleElement),
    location:  creatable(SimpleElement),
    timestamp: creatable(TimestampElement),
})

const CommentFromLms = createAggregateElement({
    comment:   readOnly(SimpleElement),
    location:  readOnly(SimpleElement),
    timestamp: readOnly(TimestampElement),
})


const Objective = createAggregateElement({
    id:                SimpleElement,
    progress_measure:  SimpleElement,
    completion_status: CompletionStatus,
})

class ObjectiveIdId extends SimpleElement {
    setValue(value) {
        const objectiveId = this.parent
        const objectives = objectiveId.parent
        if (objectives.export().some(o => o.id === value)) {
            throw new DuplicatedObjectiveIdError()
        }

        this.value = value
    }
}

const ObjectiveId = createAggregateElement({
    id: creatable(ObjectiveIdId)
})

const Interaction = createAggregateElement({
    id: creatable(SimpleElement),
    type: createEnumElement([
        "true-false", "choice", "fill-in", "long-fill-in", "likert", "matching", "performance",
        "sequencing", "numeric", "other"
    ]),
    objectives: createCollectionElement(ObjectiveId),
    timestamp: TimestampElement
})

function createEnumElement(validValues) {
    return class extends SimpleElement {
        setValue(value) {
            if (!validValues.includes(value)) throw new TypeMismatchError()
            this.value = value
        }
    }
}

const CMIElement = createAggregateElement({
    _version: readOnly(class extends SimpleElement { constructor() { super("1.0") } }),

    location: SimpleElement,
    completion_status: CompletionStatus,
    completion_threshold: CompletionThreshold,
    credit: Credit,
    success_status: SuccessStatus,
    interactions: createCollectionElement(Interaction),
    objectives: createCollectionElement(Objective),
    comments_from_learner: createCollectionElement(CommentFromLearner),
    comments_from_lms: createCollectionElement(CommentFromLms),
    progress_measure: SimpleElement,
    session_time: SimpleElement,
    suspend_data: SimpleElement,
    mode: Mode,
    exit: writeOnly(createEnumElement(["time-out", "suspend", "logout", "normal", ""])),
})

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
                    const value = modelElement.getValue(this.cmi.export()) // TODO
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
            try {
                const modelElement = this.cmi.access(rest, true)
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
                        } else if (error instanceof DuplicatedObjectiveIdError) {
                            this.#setErrorCode(GeneralSetFailure)
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
            } catch (error) {
                if (error instanceof OutOfBoundError) {
                    this.#setErrorCode(GeneralSetFailure)
                    this.#emit("call", "SetValue", [element, value], "false", true)
                    return "false"
                } else if (error instanceof TargetNotCreatableError) {
                    this.#setErrorCode(DataModelDependencyNotEstablished)
                    this.#emit("call", "GetValue", [element], "", true)
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
