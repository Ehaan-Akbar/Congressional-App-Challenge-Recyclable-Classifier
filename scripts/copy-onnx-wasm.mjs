import { createHash } from "node:crypto"
import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))
const packageDir = join(root, "..", "node_modules", "onnxruntime-web", "dist")
const publicRoot = join(root, "..", "public")
const publicDir = join(publicRoot, "ort")
const modelPath = join(publicRoot, "recycle-model.onnx")
const versionPath = join(publicRoot, "recycle-model-version.json")

await mkdir(publicDir, { recursive: true })
await cp(packageDir, publicDir, { recursive: true })

const modelBytes = await readFile(modelPath)
const sha256 = createHash("sha256").update(modelBytes).digest("hex")
await writeFile(versionPath, JSON.stringify({ sha256 }, null, 2) + "\n")

console.log("Copied ONNX Runtime Web assets to public/ort")
console.log(`Model SHA-256: ${sha256}`)
