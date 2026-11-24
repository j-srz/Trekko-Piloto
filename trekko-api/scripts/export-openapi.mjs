import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = process.env.PORT ?? '3000';
const url =
  process.env.OPENAPI_URL ?? `http://127.0.0.1:${port}/api/docs/openapi.json`;
const response = await fetch(url);

if (!response.ok) {
  throw new Error(
    `OpenAPI export failed with HTTP ${response.status} from ${url}`,
  );
}

const document = await response.json();
if (
  typeof document !== 'object' ||
  document === null ||
  !('openapi' in document)
) {
  throw new Error(`OpenAPI endpoint returned an invalid document: ${url}`);
}

await writeFile(
  resolve('docs/openapi.json'),
  `${JSON.stringify(document, null, 2)}\n`,
  'utf8',
);
