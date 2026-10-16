# Download ownership

Downloads create one object URL and release it after dispatch, including when anchor clicks throw.
Temporary anchors are removed in the same cleanup path.

JSON downloads use LosslessJson with two-space formatting by default.
ExactNumber and bigint values emit numeric tokens without native-number conversion.
Unsupported values throw; native fractions and custom instances need explicit encoding.
SSR calls return false before serialization or DOM work.
