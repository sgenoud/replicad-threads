/** @typedef { typeof import("replicad") } replicadLib */

/** @type {replicadLib} */
const { makeCylinder, drawPolysides } = replicad;

import {
  makeThread,
  trapezoidalThreadConfig,
  trapezoidalThreadConfigConjugate,
  metricThreadProfileConfig,
  metricThreadConfigConjugate,
} from "https://cdn.jsdelivr.net/npm/replicad-threads@latest/dist/studio/replicad-threads.js";

export const defaultParams = {
  bolt: true,
  nut: false,
  height: 20,
  radius: 8,
  pitch: 2.5,
  tolerance: 0.2,
  metric: true,
};

export const defaultName = "Bolt and Nut";

export default function main({
  bolt,
  nut,
  pitch,
  radius,
  height,
  tolerance,
  metric,
}) {
  const profileConfig = metric
    ? metricThreadProfileConfig(pitch, true)
    : trapezoidalThreadConfig(pitch, 30, true);

  const config = {
    ...profileConfig,
    radius,
    height,
  };

  const shapes = [];

  const boltHeight = 8;
  const baseRadius = Math.ceil(radius + config.toothHeight + tolerance + 5);

  if (bolt) {
    const boltThread = makeThread(config);

    const boltShape = boltThread
      .translate([0, 0, 2])
      .fuse(makeCylinder(config.radius, height + 4), {
        optimization: "commonFace",
      })
      .translate([0, 0, boltHeight])
      .fuse(
        drawPolysides(baseRadius, 6)
          .sketchOnPlane()
          .extrude(boltHeight)
          .chamfer(1, (e) => e.parallelTo("XY")),
      );

    shapes.push({ shape: boltShape, name: "Bolt" });
  }

  if (nut) {
    const nutHeight = config.pitch * 2.5;

    let nutConfig = metric
      ? metricThreadConfigConjugate(config, tolerance)
      : trapezoidalThreadConfigConjugate(config, tolerance);

    const nutThread = makeThread({
      ...nutConfig,
      height: nutHeight,
    });

    const nutShape = drawPolysides(baseRadius, 6)
      .sketchOnPlane()
      .extrude(nutHeight + 4)
      .chamfer(1, (e) => e.parallelTo("XY"))
      .cut(makeCylinder(nutConfig.radius, nutHeight + 4))
      .fuse(nutThread.translate([0, 0, 2]));

    shapes.push({ shape: nutShape, name: "Nut" });
  }

  return shapes;
}
