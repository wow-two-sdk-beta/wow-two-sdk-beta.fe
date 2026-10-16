# .NET numeric wire fixture

`DotNetNumbers.json.txt` is the unedited stdout of `Program.cs`, executed by the parent sweep lane using .NET SDK 10.0.300 and default `System.Text.Json.JsonSerializer.Serialize` on 2026-09-12. The project targets net10.0; no converters or serializer options apply. It covers both long/decimal endpoints, a number beyond JS's safe integer range, 28-place decimals, retained decimal scale, and native decimal arithmetic. This is recorded runtime evidence, not JSON reconstructed using JavaScript numbers.

The `.txt` suffix protects the exact wire spelling from code formatters that normalize JSON decimal scale.
