# Exact canonical hashing

stableStringify uses the strict lossless JSON codec with sorted object keys.
Array order and ExactNumber token spelling remain significant, including decimal scale and exponent spelling.
Hashing changes neither numeric values nor numeric strings.

Unsupported fields, native fractions, unsafe integers, Maps, Sets, Dates, cycles, and executable properties fail.
They cannot collide through omission or conversion to empty objects.
Encode custom values explicitly and construct exact numbers from text before hashing them.

Migration: callers relying on native JSON omission or custom toJSON conversion must encode explicitly.
Numeric-equivalent tokens with different spellings intentionally retain different cache keys.

Base64 decoders reject nonzero padding bits; canonical padded and unpadded inputs remain supported.
Digest helpers snapshot shared-buffer views because SubtleCrypto requires non-shared backing storage.
