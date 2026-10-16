# Structural collection comparisons

Deep comparison supports plain records, arrays, dates, regular expressions, maps, sets, and binary views.
ExactNumber comparisons use numeric equality. Other class and opaque instances use identity.
Unknown objects cannot compare equal merely because their internal state has no enumerable keys.

Cyclic comparisons retain only currently active pair assumptions.
A failed Map or Set candidate cannot leave nested assumptions cached as successful comparisons.

Record omission normalizes numeric property keys to strings before matching Object.keys output.
