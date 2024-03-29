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

    describe("Comments From Learner", () => {
        it("returns the implemented _children", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.comments_from_learner._children")
            assert.strictEqual(value, "comment,location,timestamp")
        })

        it("allows creating new records by writing to comment", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.comments_from_learner.0.comment", "text")
            assert.strictEqual(result, "true")

            const value = api.GetValue("cmi.comments_from_learner.0.comment")
            assert.strictEqual(value, "text")
        })

        it("fails when reading uninitialized values", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.comments_from_learner.0.comment", "text")
            assert.strictEqual(result, "true")

            const value = api.GetValue("cmi.comments_from_learner.0.location")
            assert.strictEqual(value, "")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "403")
        })

        it("fails when setting out of range values", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.comments_from_learner.1.comment", "text")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "351")
        })

        it("fails for invalid timestamp", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.comments_from_learner.0.timestamp", "batman")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "406")
        })
    })

    describe("Comments From LMS", () => {
        it("works", () => {
            const cmi = {
                comments_from_lms: [{
                    comment: "text",
                    location: "1",
                    timestamp: "2022-04-03T21:59:00Z"
                }]
            }

            const api = new API(cmi)
            api.Initialize("")

            const value = api.GetValue("cmi.comments_from_lms.0.timestamp")
            assert.strictEqual(value, cmi.comments_from_lms[0].timestamp)
        })

        it("is read-only", () => {
            const cmi = {
                comments_from_lms: [{
                    comment: "text",
                    location: "1",
                    timestamp: "2022-04-03T21:59:00Z"
                }]
            }

            const api = new API(cmi)
            api.Initialize("")

            const result = api.SetValue("cmi.comments_from_lms.0.comment", "hello")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "404")
        })
    })

    describe("Completion Status", () => {
        it("fails for invalid values", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.completion_status", "batman")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "406")
        })

        describe("when completion_threshold is defined", () => {
            it("returns incomplete if progress_measure < completion_threshold", () => {
                const cmi = {
                    completion_threshold: "0.5",
                    progress_measure: "0.1"
                }

                const api = new API(cmi)
                api.Initialize("")

                const value = api.GetValue("cmi.completion_status")
                assert.strictEqual(value, "incomplete")
            })

            it("returns completed if progress_measure >= completion_threshold", () => {
                const cmi = {
                    completion_threshold: "0.5",
                    progress_measure: "0.5"
                }

                const api = new API(cmi)
                api.Initialize("")

                const value = api.GetValue("cmi.completion_status")
                assert.strictEqual(value, "completed")
            })

            it("returns unknown if progress_measure is not set", () => {
                const cmi = {
                    completion_threshold: "0.5"
                }

                const api = new API(cmi)
                api.Initialize("")

                const value = api.GetValue("cmi.completion_status")
                assert.strictEqual(value, "unknown")
            })
        })
    })

    describe("Completion Threshold", () => {
        it("must be a number", () => {
            const cmi = { completion_threshold: "potato" }
            assert.throws(() => new API(cmi))
        })

        it("doesn't allow values outside [0, 1]", () => {
            const cmi = { completion_threshold: "2" }
            assert.throws(() => new API(cmi))
        })

        it("is read-only", () => {
            const cmi = { completion_threshold: "0.5" }

            const api = new API(cmi)
            api.Initialize("")

            const result = api.SetValue("cmi.completion_threshold", "0.6")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "404")
        })
    })

    describe("Credit", () => {
        it("returns 'credit' by default", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.credit")
            assert.strictEqual(value, "credit")
        })

        it("can't be initialized with an invalid value", () => {
            const cmi = { credit: "batman" }
            assert.throws(() => new API(cmi))
        })
    })

    describe("Entry", () => {
        // TODO
        it("works", () => {
            const api = new API()
            api.Initialize("")

            const value = api.GetValue("cmi.entry")
            assert.strictEqual(value, "")
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

    describe("Interactions", () => {
        it("works", () => {
            const api = new API()
            api.Initialize("")

            let result = api.SetValue("cmi.interactions.0.id", "id")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.type", "true-false")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.correct_responses.0.pattern", "true")
            assert.strictEqual(result, "true")

            const value = api.GetValue("cmi.interactions.0.correct_responses.0.pattern")
            assert.strictEqual(result, "true")
        })

        it("fails if the objective id is already used in an interaction", () => {
            const api = new API()
            api.Initialize("")

            let result = api.SetValue("cmi.interactions.0.id", "interaction0")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.objectives.0.id", "objective0")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.objectives.1.id", "objective1")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.objectives.2.id", "objective0")
            assert.strictEqual(result, "false")
        })

        it("fails when trying to create by setting anything other than the id", () => {
            const api = new API()
            api.Initialize("")

            const result = api.SetValue("cmi.interactions.0.timestamp", "2022-03-22T00:00:00Z")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "408")
        })


        it("fails when setting a pattern before having id and type", () => {
            const api = new API()
            api.Initialize("")

            let result = api.SetValue("cmi.interactions.0.id", "id")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.correct_responses.0.pattern", "foo")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "408")
        })

        it("fails for invalid patterns", () => {
            const api = new API()
            api.Initialize("")

            let result = api.SetValue("cmi.interactions.0.id", "id")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.type", "true-false")
            assert.strictEqual(result, "true")

            result = api.SetValue("cmi.interactions.0.correct_responses.0.pattern", "foo")
            assert.strictEqual(result, "false")

            const errorCode = api.GetLastError()
            assert.strictEqual(errorCode, "351")
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
