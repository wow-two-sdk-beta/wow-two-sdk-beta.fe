# Temporal field codecs

`TemporalCodecs` decodes only the declared field passed to it. It never installs a JSON reviver or converts a date-looking identifier. Every decoder accepts unknown and returns the shared `Result<T, AppError>`; encoding returns `Result<string, AppError>`. Malformed input returns a display-safe validation failure without including the rejected value.

| Codec         | Decoded value        | Wire contract                                                                                                                    |
| ------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `instant`     | `Temporal.Instant`   | Four-digit ISO year, date, `T`, clock seconds, optional 1–9 fractional digits, explicit `Z` or `±HH:mm`; canonical output is UTC |
| `plainDate`   | `Temporal.PlainDate` | ISO-calendar `YYYY-MM-DD`, with no clock or timezone                                                                             |
| `plainTime`   | `Temporal.PlainTime` | `HH:mm:ss` with optional 1–9 fractional digits; no date or timezone                                                              |
| `isoDuration` | `Temporal.Duration`  | ISO duration, retaining calendar years/months when present                                                                       |
| `clrTimeSpan` | `Temporal.Duration`  | CLR constant `[-][d.]hh:mm:ss[.fffffff]`, exact signed 64-bit ticks at 100 ns                                                    |

The ISO date/time codecs reject whitespace, annotations, impossible dates, leap-second normalization and unrepresentable canonical output. Their four-digit year range includes year zero; an endpoint using CLR DateOnly/DateTimeOffset must additionally apply its narrower supported year range. Nullability and omission belong to the containing schema, so required-field codecs reject null and undefined.

The CLR codec accepts 1–7 fractional digits and emits exactly seven when a fractional tick exists. It uses BigInt internally for tick arithmetic, preserves TimeSpan.MinValue and MaxValue exactly, and returns failure on overflow or sub-tick precision. Years/months are rejected because they require a calendar anchor. Weeks mean seven elapsed days; each day means 24 elapsed hours. No timezone/DST conversion occurs.

ISO calendar duration and CLR elapsed duration are separate named encodings. A field declared as one cannot silently accept the other. The codec does not establish a generic decimal/int64 transport policy.

An integration schema composes the field result into its typed DTO/domain result. HTTP's `ApiDecoder<T>` can map the validation failure to its declared protocol failure through `ResultExtensions.mapFailure`; the temporal module has no HTTP dependency. Parsing a successful request response and choosing a field's wire encoding remain explicit integration responsibilities.

The older `parseIsoDate` and Date arithmetic functions remain local-calendar utilities. They do not validate these wire contracts and are not interchangeable with the Temporal codecs.

Verification: `tests/unit/foundation/datetime/TemporalCodecs.test.ts`; runtime evidence and fixture producer: `tests/unit/foundation/datetime/TemporalFixtures.md`. The observed default System.Text.Json TimeSpan format matches the backend SDK preset's lack of a registered CLR TimeSpan converter. No live backend endpoint was called.
