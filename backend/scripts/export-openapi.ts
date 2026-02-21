import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildOpenApiDocument } from "../src/interfaces/http/openapi/document.js";

const version = process.env.APP_VERSION ?? "0.8.0";
const spec = buildOpenApiDocument({ version });
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, "..", "..", "docs", "openapi.json");

await writeFile(outputPath, JSON.stringify(spec, null, 2), "utf-8");
console.log(`Exported ${outputPath}`);
