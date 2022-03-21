export default class API {
    constructor({ objectives=[] }={}) {
        this.completionStatus = "unknown"
        this.location = ""
        this.objectives = objectives
    }

    // bool
    Initialize() {
        console.log("Initialize")

        return "true"
    }

    // bool
    GetValue(element) {
        let value = ""
        switch (element) {
            case "cmi.completion_status":
                value = this.completionStatus

            case "cmi.objectives._count":
                value = this.objectives.length.toString()

            case "cmi.location":
                value = this.location

            default:
                // NOP
        }
        console.log("GetValue", element, value)
        return value
    }

    // string
    SetValue(element, value) {
        console.log("SetValue", element, value)

        switch (element) {
            case "cmi.completionStatus": {
                this.completionStatus = value
            }

            case "cmi.location": {
                this.location = value
            }
        }
    }

    // bool
    Commit() {
        console.log("Commit")
    }

    // CMIErrorCode
    GetLastError() {
        console.log("GetLastError")
    }

    // string
    GetErrorString(errorCode) {
        console.log("GetErrorString", errorCode)
    }

    // string
    GetDiagnostic(errorCode) {
        console.log("GetDiagnostic", errorCode)
    }
}
