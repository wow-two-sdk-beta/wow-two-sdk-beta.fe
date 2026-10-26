# Schema decoders

Source: [ApiDecoderExtensions.ts](ApiDecoderExtensions.ts).

Public import: `import { ApiDecoderExtensions } from '@wow-two-beta/fe/foundation/http';`.

## Contract

- `ApiDecoderExtensions.fromSchema(schema, options?)` returns an `ApiDecoder<T>` for any Standard Schema v1: the SDK's
  `foundation/validators`, zod, valibot, arktype. `T` is the schema's output, transforms included.
- A payload the schema accepts is `ok` with the schema's output value.
- A payload it rejects is `fail` with `ApiFailureFactory.create('protocol')`: `status` 0, no problem body and the
  display-safe catalog message. The issues never enter the failure, so response diagnostics never become display text.
- `options.onIssues` receives the rejected payload's issues (message and path) for a log line; the decoder still fails.
- A schema whose `validate` returns a promise throws a `TypeError`: `ApiDecoder` is synchronous and the client awaits no
  decoder. The abandoned promise is settled quietly.
- A schema that throws propagates the throw, like every decoder bug.
- Composes with `decodeWarned` and every other `ApiDecoder` consumer; pass it as `decode` on any client method.

```ts
const decodeCodes = ApiDecoderExtensions.fromSchema(z.array(CodeSchema), { onIssues: logger.warn });
const result = await client.get('/api/codes', { signal, decode: decodeCodes });
```

## Verification

[SchemaDecoder.test.ts](../../../tests/unit/foundation/http/SchemaDecoder.test.ts) sends canned responses through
`createApiClient` and covers the SDK validators, zod and valibot, transformed output, rejection with `onIssues`,
`decodeWarned` composition and asynchronous schemas.
