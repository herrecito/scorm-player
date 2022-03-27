import { assert } from "chai"

import API from "./API.js"

describe("API", () => {
    describe("Initialize", () => {
        it("works", () => {
            const api = new API()
            assert.strictEqual(api.Initialize(""), "true")
        })

        it("fails if no empty string is passed", () => {
            const api = new API()
            assert.strictEqual(api.Initialize(), "false")
            assert.strictEqual(api.GetLastError(), "201")
        })

        it("fails if already initialized", () => {
            const api = new API()
            api.Initialize("")

            assert.strictEqual(api.Initialize(""), "false")
            assert.strictEqual(api.GetLastError(), "103")
        })

        it("fails after termination", () => {
            const api = new API()

            api.Initialize("")
            api.Terminate("")

            assert.strictEqual(api.Initialize(""), "false")
            assert.strictEqual(api.GetLastError(), "104")
        })
    })

    describe("Terminate", () => {
        it("works", () => {
            const api = new API()
            api.Initialize("")
            assert.strictEqual(api.Terminate(""), "true")
        })

        it("fails if no empty string is passed", () => {
            const api = new API()
            api.Initialize("")

            assert.strictEqual(api.Terminate(), "false")
            assert.strictEqual(api.GetLastError(), "201")
        })

        it("fails if not initialized", () => {
            const api = new API()
            assert.strictEqual(api.Terminate(""), "false")
            assert.strictEqual(api.GetLastError(), "112")
        })

        it("fails if already terminated", () => {
            const api = new API()
            api.Initialize("")
            api.Terminate("")
            assert.strictEqual(api.Terminate(""), "false")
            assert.strictEqual(api.GetLastError(), "113")
        })
    })

    describe("GetValue", () => {
        it("fails if not initialized", () => {
            const api = new API()

            const value = api.GetValue("cmi._version")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "122")
        })

        it("fails if terminated", () => {
            const api = new API()
            api.Initialize("")
            api.Terminate("")

            const value = api.GetValue("cmi._version")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "123")
        })

        it("fails if not recognized", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("foo.bar")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "401")
        })
    })

    describe("SetValue", () => {
        it("fails if not initialized", () => {
            const api = new API()

            const result = api.SetValue("cmi.location", "1")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "132")
        })

        it("fails if terminated", () => {
            const api = new API()
            api.Initialize("")
            api.Terminate("")

            const result = api.SetValue("cmi.location", "1")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "133")
        })

        it("fails if not recognized", () => {
            const api = new API()
            api.Initialize("")

            assert.strictEqual(api.SetValue("foo.bar", "1"), "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "401")
        })
    })

    describe("Commit", () => {
        it("fails if not initialized", () => {
            const api = new API()

            assert.strictEqual(api.Commit(""), "false")
            assert.strictEqual(api.GetLastError(), "142")
        })

        it("fails if terminated", () => {
            const api = new API()
            api.Initialize("")
            api.Terminate("")

            assert.strictEqual(api.Commit(""), "false")
            assert.strictEqual(api.GetLastError(), "143")
        })

        it("fails if no empty string is passed", () => {
            const api = new API()
            api.Initialize("")
            assert.strictEqual(api.Commit(), "false")
            assert.strictEqual(api.GetLastError(), "201")
        })
    })
})

describe("Data Model", () => {
    describe("Data Model Version", () => {
        it("returns the value defined by the standard", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi._version")
            assert.strictEqual(value, "1.0")
        })

        it("is read-only", () => {
            const api = new API()
            api.Initialize("")

            const value = api.SetValue("cmi._version", "1.1")
            assert.strictEqual(value, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "404")
        })
    })

    describe("Exit", () => {
        it("fails for invalid values", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.exit", "batman")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "406")
        })

        it("is write-only", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.exit")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "405")
        })
    })

    describe("Suspend Data", () => {
        it("reading fails if not initialized", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.suspend_data")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "403")
        })
    })

    describe("Location", () => {
        it("reading fails if not initialized", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.location")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "403")
        })
    })

    describe("Objectives", () => {
        it("TODO", () => {
            const cmi = {
                objectives: [
                    { id: "obj1" },
                    { id: "obj2" },
                    { id: "obj3" }
                ]
            }
            const api = new API(cmi)
            api.Initialize("")

            assert.strictEqual(api.GetValue("cmi.objectives._count"), "3")
            assert.strictEqual(api.GetValue("cmi.objectives.1.id"), "obj2")
        })
    })
})
