import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const temp = await mkdtemp(join(tmpdir(), "omscs-source-rules-"))
try {
  const outfile = join(temp, "rules.mjs")
  await build({
    entryPoints: ["lib/data/specializations.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    tsconfig: "tsconfig.json",
    logLevel: "silent",
  })
  const { SPECIALIZATIONS } = await import(pathToFileURL(outfile).href)
  process.stdout.write(JSON.stringify(SPECIALIZATIONS))
} finally {
  await rm(temp, { recursive: true, force: true })
}
