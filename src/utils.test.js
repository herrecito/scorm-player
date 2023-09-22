import { assert } from "chai"

import { parseCharacterString } from "./utils.js"

describe("parseCharacterString", () => {
    it("no delimiters", () => {
        const result = parseCharacterString("Characterstring {no=delimiter} in the English language")
        assert.deepEqual(result, {
            str: "Characterstring {no=delimiter} in the English language",
            delimiters: {},
        })
    })

    it("invalid delimiter", () => {
    	const result = parseCharacterString("{invalid= Characterstring")
    	assert.deepEqual(result, {
    		str: "{invalid= Characterstring",
    		delimiters: {},
    	})
    })

    it("with delimiters", () => {
        const result = parseCharacterString("{lang=es}{case_matters=true}{order_matters=true}Characterstring in the English language")
        assert.deepEqual(result, {
            str: "Characterstring in the English language",
            delimiters: {
                lang: "es",
                case_matters: "true",
                order_matters: "true",
            }
        })
    })
})
