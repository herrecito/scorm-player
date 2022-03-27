// No error             0
// General Errors       100 - 199
// Syntax Errors        200 - 299
// RTS Errors           300 - 399
// Data Model Errors    400 - 499
// Implentation-defined 1000 - 65535

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
const CommitBeforeInitialization = "142" // TODO
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
    }

    Initialize(param) {
        console.log("Initialize")

        if (param !== "") {
            this.errorCode = GeneralArgumentError
            return "false"
        }

        if (this.state === "running") {
            this.errorCode = AlreadyInitialized
            return "false"
        }

        if (this.state === "terminated") {
            this.errorCode = ContentInstanceTerminated
            return "false"
        }

        this.state = "running"
        this.errorCode = NoError
        return "true"
    }

    Terminate(param) {
        console.log("Terminate")

        if (param !== "") {
            this.errorCode = GeneralArgumentError
            return "false"
        }

        if (this.state === "not-initialized") {
            this.errorCode = TerminationBeforeInitialization
            return "false"
        }

        if (this.state === "terminated") {
            this.errorCode = TerminationAfterTermination
            return "false"
        }

        this.state = "terminated"
        this.errorCode = NoError
        return "true"
    }

    GetValue(element) {
        if (this.state === "not-initialized") {
            this.errorCode = RetrieveDataBeforeInitialization
            return ""
        }

        if (this.state === "terminated") {
            this.errorCode = RetrieveDataAfterTermination
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

                default:
                    // NOP
            }
        }

        console.log("GetValue", element, value)
        this.erroCode = NoError
        return value
    }

    // string
    SetValue(element, value) {
        console.log("SetValue", element, value)

        switch (element) {
            case "cmi.completionStatus": {
                this.cmi.completionStatus = value
            }

            case "cmi.location": {
                this.cmi.location = value
            }
        }
    }

    // bool
    Commit() {
        console.log("Commit")
    }

    GetLastError() {
        console.log("GetLastError", this.errorCode)
        return this.errorCode
    }

    GetErrorString(errorCode) {
        console.log("GetErrorString", errorCode)
        return "" // TODO
    }

    GetDiagnostic(errorCode) {
        console.log("GetDiagnostic", errorCode)
        return "" // TODO
    }
}
