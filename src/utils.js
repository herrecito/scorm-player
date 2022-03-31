export function lerp(a, b, t) {
    return a + t * (b - a)
}

export function fmap(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin
}

export function clamp(x, a, b) {
    return Math.max(a, Math.min(x, b))
}
