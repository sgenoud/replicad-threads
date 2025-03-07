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
import { makeThread } from "https://cdn.jsdelivr.net/npm/replicad-threads@latest/dist/studio/replicad-threads.js";

/** @typedef { typeof import("replicad") } replicadLib */
/** @type {replicadLib} */
const { makeCylinder } = replicad;

export default function main() {
  const thread = makeThread({
    pitch: 5,
    radius: 10,
    height: 20,
    rootWidth: 3,
    apexWidth: 1,
    toothHeight: 1,
  });
  return thread.translate(0, 0, 1).fuse(makeCylinder(10, 22));
}
```

[studio]: https://studio.replicad.xyz/workbench#code=UEsDBAoAAAAIABt7XFqfPNxtGgEAAPUBAAAHAAAAY29kZS5qc2VRTWvDMAy951eInJLSxW3HLimDwi477DjY2YuVRVtiG1sZLSX%252FfUqaNoUJ448nvadnmzrvAsMZOv2D701AbWCAOrgO0obZx1KpytjiOxps6TcUFllZ36mAvqVKmweeSPHQasbIypBMkXtD7l%252BNqKT7JFGrFRz45NFgLZ3HnauBJidZeiWluRi5Ht7oE1ZqYcL5LjOMqcrZeL3Hy6klazCIwPNNQhrjcbqstNV9y1D3tmJyVjhksxzOCUhchC6Ohb68S3bJj%252BGJq6aEp%252FUNCdpQH0vYbhasQfpquITdHRac4w8yLOzHBdUejzO6XVCW2uZ1FpnxId9Pa0Dug51tFhy0jeMHZJs1yNjmRd1HzO4fIxNrsNvleTL8AVBLAQIUAAoAAAAIABt7XFqfPNxtGgEAAPUBAAAHAAAAAAAAAAAAAAAAAAAAAABjb2RlLmpzUEsFBgAAAAABAAEANQAAAD8BAAAAAA%253D%253D

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

#### `trapezoidalThreadConfigConjugate(threadConfig, clearance)`

Creates a conjugate thread configuration. This is useful to create the
corresponding internal thread from an external one (or vice versa). You can add
an offset which will be added to the radius to allow for some tolerance.

### `metricThreadConfig(name, height, external, clearance)`

Creates a thread configuration for a metric thread. The `name` is the name of
the thread (e.g. "M6") and the `height` is the height of the thread. Note that
external and internal threads have different configurations, you will use this
function with `external: true` for external threads and `external: false` for
internal threads.

### `addClearance(threadConfig, clearance)`

Adds a clearance to a thread configuration. This is useful to create a thread
that will fit into another one (especially for 3D printing). This function is
used by the previous ones if you specify a clearance.

## Example

You can find a full example in the `./example` directory. See what it
look [here][example].

[example]: https://studio.replicad.xyz/share/https%3A%2F%2Fraw.githubusercontent.com%2Fsgenoud%2Freplicad-threads%2Frefs%2Fheads%2Fmain%2Fexamples%2Fnut-bolt.js?disable-damping=true&ortho-camera=true&params=true
