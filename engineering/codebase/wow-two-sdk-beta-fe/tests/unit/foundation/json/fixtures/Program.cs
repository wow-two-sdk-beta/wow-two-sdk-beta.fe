using System.Text.Json;

var exact = new {
    longMin = long.MinValue,
    longMax = long.MaxValue,
    unsafeInteger = 9007199254740993L,
    decimalMin = decimal.MinValue,
    decimalMax = decimal.MaxValue,
    fractional = 0.1234567890123456789012345678m,
    tiny = 0.0000000000000000000000000001m,
    scaled = 123.4500m,
    sum = 0.1m + 0.2m,
    difference = 9007199254740993m - 9007199254740992m,
    product = 123456789.123456789m * 0.000000001m,
    quotient = 1m / 8m,
    halfwayEven = decimal.Round(1.005m, 2, MidpointRounding.ToEven),
};
Console.WriteLine(JsonSerializer.Serialize(exact));
