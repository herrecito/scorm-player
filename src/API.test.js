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
    })
})
