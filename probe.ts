import { StdinParser } from "@opentui/core"

// SGR mouse report: wheel up at column 87, row 26.
const report = "\x1b[<64;87;26M"
const encoder = new TextEncoder()
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

for (const cut of [1, 2, 3, 6]) {
  const events: string[] = []
  const parser = new StdinParser({ timeoutMs: 20, armTimeouts: true })
  const drain = () =>
    parser.drain((event) =>
      events.push(event.type === "key" ? `key(${JSON.stringify(event.raw)})` : `${event.type}(${JSON.stringify(event.raw ?? event.sequence)})`),
    )

  parser.push(encoder.encode(report.slice(0, cut)))
  drain()
  await wait(40)
  drain()
  parser.push(encoder.encode(report.slice(cut)))
  drain()

  console.log(`read 1: ${JSON.stringify(report.slice(0, cut))}, read 2 40 ms later -> ${events.join(" ")}`)
  parser.destroy()
}
