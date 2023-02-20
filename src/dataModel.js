import parseISO from "date-fns/parseISO/index.js"
import isValid from "date-fns/isValid/index.js"
import isUndefined from "lodash/isUndefined.js"

//
// Interal Errors
//

export class ReadOnlyError extends Error {}
export class WriteOnlyError extends Error {}
export class TypeMismatchError extends Error {}
export class ValueNotInitializedError extends Error {}
export class OutOfBoundError extends Error {}
export class DuplicatedObjectiveIdError extends Error {}
export class InvalidPatternError extends Error {}
export class TargetNotCreatableError extends Error {}
//
// Simple Model Values
//

class SimpleElement {
    constructor(value, parent) {
        this.value = value
        this.parent = parent
    }

    getValue() {
        if (this.value === undefined) throw new ValueNotInitializedError()

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

class TimestampElement extends SimpleElement {
    setValue(value) {
        if (!isValid(parseISO(value))) {
            throw new TypeMismatchError(`${value} is an invalid date.`)
        }
        this.value = value
    }
}

function Enum(validValues) {
    return class Enum extends SimpleElement {
        constructor(value, parent) {
            if (!isUndefined(value) && !validValues.includes(value)) {
                throw new Error(
                    `${value} is not one of the valid values: ${validValues.join(", ")}`
                )
            }
            super(value, parent)
        }

        setValue(value) {
            if (!validValues.includes(value)) {
                throw new TypeMismatchError(
                    `${value} is not one of the valid values: ${validValues.join(", ")}`
                )
            }
            this.value = value
        }
    }
}

//
// Complex Model Values
//

function Collection(Element) {
    return class Collection {
        constructor(items=[], parent) {
            this.items = items.map(item => new Element(item))
            this.parent = parent
        }

        access(path, write) {
            const [name, ...rest] = path
            switch (name) {
                case "_count": {
                    return { getValue: () => this.items.length.toString() }
                }

                case "_children": {
                    return { getValue: () => Element.children.join(",") }
                }

                default: {
                    const index = parseInt(name, 10)
                    if (index in this.items) {
                        return this.items[index].access(rest, write)
                    } else if (write && index >= 0 && index <= this.items.length) {
                        const element = new Element(undefined, this)
                        const target = element.access(rest, write)
                        if (!target.constructor.creatable) throw new TargetNotCreatableError()
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

// children: { [name: string]: Element }
function Aggregate(children) {
    return class Aggregate {
        static children = Object.keys(children)

        constructor(value, parent) {
            for (const [name, Element] of Object.entries(children)) {
                this[name] = new Element(value?.[name], this)
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


//
// Element modifiers
//

// When accessing a children Element marked as Creatable of a missing Item in a Collection,
// a new Item will be automatically added to the Collection.
// Otherwise, an error will be thrown.
function Creatable(Element) {
    return class Creatable extends Element {
        static creatable = true
    }
}

// Trying to getValue from Element will throw an error.
function WriteOnly(Element) {
    return class WriteOnly extends Element {
        getValue() {
            throw new WriteOnlyError()
        }
    }
}

// Trying to setValue to Element will throw an error.
function ReadOnly(Element) {
    return class ReadOnly extends Element {
        setValue() {
            throw new ReadOnlyError()
        }
    }
}

// When creating an Element without giving it a value, defaultValue will be used.
function DefaultValue(Element, defaultValue) {
    return class DefaultValue extends Element {
        constructor(value=defaultValue, parent) {
            super(value, parent)
        }
    }
}

//
// Specific Model Values
//

class CompletionThreshold extends ReadOnly(SimpleElement) {
    constructor(completionThreshold, parent) {
        if (!isUndefined(completionThreshold)) {
            const th = parseFloat(completionThreshold)
            if (Number.isNaN(th)) throw new Error()
            if (th < 0) throw new Error()
            if (th > 1) throw new Error()
        }
        super(completionThreshold, parent)
    }
}

class Credit extends ReadOnly(DefaultValue(Enum(["credit", "no-credit"]), "credit")) {}

class CompletionStatus extends DefaultValue(Enum(["completed", "incomplete", "not attempted", "unknown"]), "unknown") {
    getValue() {
        let root = this
        while (root.parent) root = root.parent
        const cmi = root.export()
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
}

class SuccessStatus extends DefaultValue(Enum(["passed", "failed", "unknown"]), "unknown") {}

class CommentFromLearner extends Aggregate({
    comment:   Creatable(SimpleElement),
    location:  Creatable(SimpleElement),
    timestamp: Creatable(TimestampElement),
}) {}

class CommentFromLms extends Aggregate({
    comment:   ReadOnly(SimpleElement),
    location:  ReadOnly(SimpleElement),
    timestamp: ReadOnly(TimestampElement),
}) {}


class Objective extends Aggregate({
    id:                SimpleElement,
    progress_measure:  SimpleElement,
    completion_status: CompletionStatus,
}) {}

class InteractionObjectiveId extends SimpleElement {
    setValue(value) {
        const interactionObjective = this.parent
        const objectives = interactionObjective.parent
        if (objectives.export().some(o => o.id === value)) {
            throw new DuplicatedObjectiveIdError()
        }

        this.value = value
    }
}

class InteractionObjective extends Aggregate({
    id: Creatable(InteractionObjectiveId)
}) {}

class Pattern extends Creatable(SimpleElement) {
    setValue(value) {
        const correctResponse = this.parent
        const correctResponses = correctResponse.parent
        const interaction = correctResponses.parent
        const type = interaction.type.export()
        if (!type) throw new TargetNotCreatableError()

        switch (type) {
            case "true-false": {
                if (!["true", "false"].includes(value)) {
                    throw new InvalidPatternError()
                }
                break
            }

            case "choice": {
                // TODO Should be an URI. RFC 3986.
                if (value.trim().length === 0) {
                    throw new InvalidPatternError()
                }
                break
            }

            case "fill-in": {
                // TODO parse
            }
        }

        this.value = value
    }
}

class CorrectResponse extends Aggregate({
    pattern: Pattern
}) {}

class Interaction extends Aggregate({
    id: Creatable(SimpleElement),
    type: Enum([
        "true-false", "choice", "fill-in", "long-fill-in", "likert", "matching", "performance",
        "sequencing", "numeric", "other"
    ]),
    objectives: Collection(InteractionObjective),
    timestamp: TimestampElement,
    correct_responses: Collection(CorrectResponse),
}) {}

export class CMI extends Aggregate({
    _version: ReadOnly(DefaultValue(SimpleElement, "1.0")),
    location: SimpleElement,
    completion_status: CompletionStatus,
    completion_threshold: CompletionThreshold,
    credit: Credit,
    success_status: SuccessStatus,
    interactions: Collection(Interaction),
    objectives: Collection(Objective),
    comments_from_learner: Collection(CommentFromLearner),
    comments_from_lms: Collection(CommentFromLms),
    progress_measure: SimpleElement,
    session_time: SimpleElement,
    suspend_data: SimpleElement,
    mode: ReadOnly(DefaultValue(Enum(["browse", "normal", "review"]), "normal")),
    exit: WriteOnly(Enum(["time-out", "suspend", "logout", "normal", ""])),
}) {}
