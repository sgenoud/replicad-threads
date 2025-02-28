# Replicad thread

A small library to build threads using replicad.

This is a library based on [replicad](https://replicad.xyz).

This library contains a set of helpers to create thread for your 3D models.

## As a library

This module can be used either as a library:

```js
pnpm install replicad-threads
```

## Within the replicad studio

You can also import it within the [replicad studio][studio]:

```js
import shrinkWrap from "https://cdn.jsdelivr.net/npm/replicad-threads/dist/studio/replicad-threads.js";
/** @typedef { typeof import("replicad") } replicadLib */
/** @type {replicadLib} */
const { drawRoundedRectangle, drawCircle, draw } = replicad;

export default function main() {
  const circle = drawCircle(7).translate(8, 18);
  const rect = drawRoundedRectangle(20, 14, 5);

  return [
    { shape: rect, color: "silver" },
    { shape: circle, color: "silver" },
    shrinkWrap(rect.fuse(circle), 50),
  ];
}
```

## API

### `makeThread({ pitch, radius, height, rootWidth, apexWidth, toothHeight })`

Creates a thread shape. The thread is a helix with a trapezoidal profile, with
the following parameters:

- `pitch`: the distance between two consecutive threads.
- `radius`: the base radius of the thread.
- `height`: the height of the thread.
- `rootWidth`: the width of the thread profile at the root (the radius)
- `apexWidth`: the width of the thread profile at the apex (the radius + toothHeight)
- `toothHeight`: the height of the tooth. A negative value will create an internal thread.

This thread will get small at the beginning and end of the thread. There are
additional function to create alternative shapes:

- `makeRawThread`: creates a thread with a blunt end.
- `makeChamferedThread`: creates a thread with a chamfered end.

### `trapezoidalThreadConfig(pitch, threadAngle, external: true)`

Creates a partial configuration (you need to provide the radius and the
height).

#### `trapezoidalThreadConfigConjugate(threadConfig, offset)`

Creates a conjugate thread configuration. This is useful to create the
corresponding internal thread from an external one (or vice versa). You can add
an offset which will be added to the radius to allow for some tolerance.

### `metricThreadConfig(name, height, external, offset)`

Creates a thread configuration for a metric thread. The `name` is the name of
the thread (e.g. "M6") and the `height` is the height of the thread. Note that
external and internal threads have different configurations, you will use this
function with `external: true` for external threads and `external: false` for
internal threads.
