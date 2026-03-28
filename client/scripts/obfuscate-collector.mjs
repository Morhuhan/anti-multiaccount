import fs from 'node:fs'
import path from 'node:path'

import JavaScriptObfuscator from 'javascript-obfuscator'

const assetsDir = path.resolve('dist/assets')

if (!fs.existsSync(assetsDir)) {
  process.exit(0)
}

const targetFiles = fs
  .readdirSync(assetsDir)
  .filter((file) => /^fingerprint-collector-.*\.js$/.test(file))

for (const file of targetFiles) {
  const fullPath = path.join(assetsDir, file)
  const source = fs.readFileSync(fullPath, 'utf8')
  const obfuscated = JavaScriptObfuscator.obfuscate(source, {
    compact: true,
    simplify: true,
    stringArray: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    splitStrings: false,
  })

  fs.writeFileSync(fullPath, obfuscated.getObfuscatedCode(), 'utf8')
}
