import { expect, test } from "bun:test"
import { InputRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

/** Blocks the event loop, as a render does. */
function busy(ms: number) {
  const end = performance.now() + ms
  while (performance.now() < end) {}
}

test("a wheel report split after ESC [ does not type into a focused input", async () => {
  const { renderer, dispose } = await createTestRenderer({ width: 40, height: 5, useMouse: true })
  const input = new InputRenderable(renderer, { width: 30 })
  renderer.root.add(input)
  input.focus()

  renderer.stdin.emit("data", Buffer.from("\x1b["))
  busy(40)
  // Due timers run before the next read, so the parser's 20 ms timeout fires first.
  await new Promise((resolve) => setTimeout(resolve, 0))
  renderer.stdin.emit("data", Buffer.from("<64;87;26M"))

  expect(input.value).toBe("")
  await dispose()
})
