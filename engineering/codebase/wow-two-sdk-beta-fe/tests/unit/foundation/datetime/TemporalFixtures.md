# .NET temporal wire fixtures

Observed 2026-09-10 with local .NET SDK `10.0.300`, isolated console target `net10.0`, default System.Text.Json. This verifies the framework serializer, not a running backend service or the backend SDK's full configured serializer.

Backend source inspected read-only: `wow-two-sdk.backend.beta/engineering/codebase/wow-two-back-beta-sdk/src/Foundation/Serialization/JsonOptionsConstants.cs`, `Build` lines 18–36. It configures NodaTime at line 31 and registers no CLR TimeSpan converter. The currently observed CLR default is therefore the relevant baseline unless an endpoint explicitly overrides it.

Producer:

```csharp
using System;
using System.Text.Json;
var values = new[] {
    TimeSpan.Zero, new TimeSpan(2, 0, 0, 1),
    TimeSpan.FromTicks(1), TimeSpan.FromTicks(-1),
    new TimeSpan(3, 17, 25, 30, 500), TimeSpan.MinValue, TimeSpan.MaxValue
};
foreach (var value in values)
    Console.WriteLine(JsonSerializer.Serialize(new { ticks = value.Ticks.ToString(), wire = value }));
Console.WriteLine(JsonSerializer.Serialize(new {
    date = new DateOnly(2028, 2, 29),
    time = new TimeOnly(23, 59, 59).Add(TimeSpan.FromTicks(1234567)),
    instant = new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.FromHours(5))
}));
```

Observed output:

```jsonl
{"ticks":"0","wire":"00:00:00"}
{"ticks":"1728010000000","wire":"2.00:00:01"}
{"ticks":"1","wire":"00:00:00.0000001"}
{"ticks":"-1","wire":"-00:00:00.0000001"}
{"ticks":"3219305000000","wire":"3.17:25:30.5000000"}
{"ticks":"-9223372036854775808","wire":"-10675199.02:48:05.4775808"}
{"ticks":"9223372036854775807","wire":"10675199.02:48:05.4775807"}
{"date":"2028-02-29","time":"23:59:59.1234567","instant":"2026-09-10T12:00:00+05:00"}
```

The tests round-trip all seven TimeSpan values and reject the immediate positive/negative overflow neighbors. Tick strings in this fixture are diagnostic output from the producer; they do not establish an endpoint-wide int64 wire policy.

Official references: [System.Text.Json TimeSpan format](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/6.0/timespan-serialization-format), [CLR constant format](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-timespan-format-strings), [Temporal duration semantics](https://tc39.es/proposal-temporal/docs/duration.html).
