// Fails if any tracked file in frontend/ has a line longer than MAX_LINE characters.
// Team rule: keep every line readable (CLAUDE.md style + Andu's 300-char limit).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const MAX_LINE = 300
const SKIP = [/^package-lock\.json$/, /\.(png|jpe?g|gif|webp|ico)$/]

const listFiles = () =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && existsSync(file) && !SKIP.some((pattern) => pattern.test(file)))

const tooLong = listFiles().flatMap((file) =>
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .flatMap((line, i) => (line.length > MAX_LINE ? [`${file}:${i + 1} (${line.length} chars)`] : [])),
)

if (tooLong.length > 0) {
  console.error(`Lines longer than ${MAX_LINE} characters:\n  ${tooLong.join('\n  ')}`)
  process.exit(1)
}
console.log(`check:lines ok, no line over ${MAX_LINE} characters`)
