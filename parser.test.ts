import { expect, test } from "bun:test"
import { StdinParser } from "@opentui/core"

// SGR mouse report: wheel up at column 87, row 26.
const report = "\x1b[<64;87;26M"
const encoder = new TextEncoder()
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Feeds `report` in two reads, the second one 40 ms after the first, past the 20 ms timeout. */
async function eventsForSplit(cut: number): Promise<string[]> {
  const events: string[] = []
  const parser = new StdinParser({ timeoutMs: 20, armTimeouts: true })
  const drain = () =>
    parser.drain((event) => events.push(event.type === "mouse" ? `mouse(${event.event.type})` : `${event.type}(${JSON.stringify(event.raw ?? event.sequence)})`))

  parser.push(encoder.encode(report.slice(0, cut)))
  drain()
  await wait(40)
  drain()
  parser.push(encoder.encode(report.slice(cut)))
  drain()
  parser.destroy()
  return events
}

test("split after ESC: the report survives", async () => {
  expect(await eventsForSplit(1)).toEqual(['key("\\u001b")', "mouse(scroll)"])
})

test("split after ESC [ <: the report survives", async () => {
  expect(await eventsForSplit(3)).toEqual(["mouse(scroll)"])
})

test("split after ESC [ <64;: the report survives", async () => {
  expect(await eventsForSplit(6)).toEqual(["mouse(scroll)"])
})

test("split after ESC [: the report survives", async () => {
  expect(await eventsForSplit(2)).toEqual(["mouse(scroll)"])
})
