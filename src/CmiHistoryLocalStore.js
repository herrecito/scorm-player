export default class CmiHistoryLocalStore {
    constructor(id) {
        this.key = `scorm-player/${id}/history`
    }

    // Returns: Entry
    async last() {
        const item = window.localStorage.getItem(this.key)
        const history = item ? JSON.parse(item) : []
        return history.at(-1)
    }

    /**
     * entry: {
     *    timestamp: string // ISO8601
     *    cmi: CMII
     * }
     */
    async append(entry) {
        const item = window.localStorage.getItem(this.key)
        const history = item ? JSON.parse(item) : []
        history.push(entry)
        window.localStorage.setItem(this.key, JSON.stringify(history))
    }
}
