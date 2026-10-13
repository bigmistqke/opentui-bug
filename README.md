# opentui-bug

Minimal reproduction for a bug in `@opentui/core` 0.6.3 on Bun 1.4.2. 0.5.12 on Node 26 shows the same bug.

An SGR mouse report that arrives in two reads, split right after `ESC [`, becomes typed keys when the second read comes more than 20 ms after the first.

| | |
| --- | --- |
| Bytes in | `ESC [` , then 40 ms later `<64;87;26M` (wheel up, column 87, row 26) |
| Events out | `response("\u001b[")`, then ten key events: `<` `6` `4` `;` `8` `7` `;` `2` `6` `M` |
| Expected | One mouse scroll event, the same as for the other splits |

In an app, a focused `InputRenderable` receives the text `<64;87;26M`.

The 20 ms is `timeoutMs: 20` in the renderer's `new StdinParser(...)` call. It is hard-coded. An app cannot change it.

## Run

```sh
bun install
bun test
bun probe.ts
```

`mise.toml` pins Bun 1.4.2.

## Probe output

`probe.ts` feeds the report to a `StdinParser` in two reads, 40 ms apart, at four split points:

```
read 1: "\u001b", read 2 40 ms later -> key("\u001b") mouse("\u001b[<64;87;26M")
read 1: "\u001b[", read 2 40 ms later -> response("\u001b[") key("<") key("6") key("4") key(";") key("8") key("7") key(";") key("2") key("6") key("M")
read 1: "\u001b[<", read 2 40 ms later -> mouse("\u001b[<64;87;26M")
read 1: "\u001b[<64;", read 2 40 ms later -> mouse("\u001b[<64;87;26M")
```

Only the split after `ESC [` loses the report.

## Tests

`bun test`: 3 pass, 2 fail.

| Test | Result |
| --- | --- |
| `parser.test.ts` split after ESC: the report survives | pass |
| `parser.test.ts` split after ESC [ <: the report survives | pass |
| `parser.test.ts` split after ESC [ <64;: the report survives | pass |
| `parser.test.ts` split after ESC [: the report survives | fail: response + 10 keys, expected `["mouse(scroll)"]` |
| `input.test.ts` a wheel report split after ESC [ does not type into a focused input | fail: expected `""`, received `"<64;87;26M"` |

## In a real app

The symptom: in a terminal app on `@opentui/core` with a focused `<input>`, scrolling a list with the mouse wheel sometimes types `<64;87;26M` into the input.

Why the second read arrives late is not proven. The likely cause is a busy event loop, for example a render after the previous wheel steps. The runtime runs due timers before it polls stdin, so the parser's timeout fires before the rest of the report is read. `input.test.ts` models this: it emits `ESC [`, blocks the loop for 40 ms, yields one timer tick, then emits the rest.

## Related

- [anomalyco/opentui#1614](https://github.com/anomalyco/opentui/issues/1614): the input parser conformance table. It does not list this case.
