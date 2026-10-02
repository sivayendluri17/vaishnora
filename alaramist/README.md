# alaramist

A lightweight alarm package for evaluating metric thresholds and creating notifications.

## Why separate?

Keeping alarms separate from metrics is a good idea because:

- metrics capture raw values
- alarms decide whether those values are concerning
- notification logic can evolve independently from instrumentation

## Example

```ts
import { Alarmist } from "./src/index";

const alarmist = new Alarmist([
  {
    name: "high-latency",
    metric: "api.latency.ms",
    comparison: "gt",
    threshold: 2000,
    severity: "warning",
  },
]);

const triggered = alarmist.evaluate([
  { name: "api.latency.ms", value: 2600, unit: "ms" },
]);

console.log(triggered);
```
