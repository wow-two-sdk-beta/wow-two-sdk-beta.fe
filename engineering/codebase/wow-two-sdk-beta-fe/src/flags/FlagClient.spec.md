# Flag evaluation boundaries

Scalar getValue, evaluate, and useFlag widen fallback literals to boolean, string, or number.
A provider may return another value of the same scalar kind.

Object getObject and evaluateObject require a Result decoder before the optional targeting context.
`useObjectFlag(key, fallback, decoder)` exposes the same boundary reactively.
Decoders accept unknown and return Result<T, unknown>; SDK validator results compose directly.
Missing and disabled flags return the already typed caller fallback without decoding it.
Malformed payloads, resolution metadata, throwing accessors, and decoder failures report faults and fall back.
Caller error-listener exceptions remain programmer exceptions; they are not silently swallowed.

Static maps and targeting dictionaries read only own keys.
Every initial and merged context is frozen; context arrays are copied and frozen.

Migration: replace object useFlag calls with useObjectFlag and a Result decoder.
Pass the decoder as the third getObject/evaluateObject argument; targeting context moves fourth.
Explicitly decode nested object fields; a generic type argument no longer asserts wire shape.
