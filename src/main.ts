import { makeHelix, draw, Plane, makeCylinder, makeSolid } from "replicad";
import type { Sketch, Face, Drawing } from "replicad";

import { METRIC_THREADS } from "./thread-standards";
import type { MetricThread } from "./thread-standards";
import { weld } from "./weld";

export function threadProfile(
  rootWidth: number,
  apexWidth: number,
  height: number,
  overlap = 0.1,
  apexOffset = 0,
) {
  const rootRadius = rootWidth / 2;
  const apexRadius = apexWidth / 2;

  const margin = Math.abs(overlap) * Math.sign(height);

  const pen = draw([rootRadius, -margin]);
  if (margin) {
    pen.vLine(margin);
  }
  pen
    .lineTo([apexRadius + apexOffset, height])
    .hLineTo(-apexRadius + apexOffset)
    .lineTo([-rootRadius, 0]);

  if (margin) {
    pen.vLine(-margin);
  }
  return pen.close();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

export function basicThreadLoop(
  pitch: number,
  radius: number,
  profile: Drawing,
  height = 1,
  includeEnd: "none" | "first" | "last" | "both" = "none",
  lefthand = false,
) {
  const helix = makeHelix(
    pitch,
    pitch * clamp(height, 0, 1),
    radius,
    [0, 0, 0],
    [0, 0, 1],
    lefthand,
  );

  const profiles = STEPS.map((step) => {
    const pos = helix.pointAt(step);
    const zDir = helix.tangentAt(step);
    const plane = new Plane(pos, [0, 0, 1], zDir);

    return profile.sketchOnPlane(plane) as Sketch;
  });

  const ends: Face[] = [];
  if (includeEnd === "first" || includeEnd === "both") {
    ends.push(profiles[0].faces());
  }
  if (includeEnd === "last" || includeEnd === "both") {
    const face = profiles[profiles.length - 1].faces();
    face.wrapped.Reverse();
    ends.push(face);
  }

  const shell = profiles[0].loftWith(profiles.slice(1), { ruled: false }, true);

  if (includeEnd === "none") return shell;
  return weld([shell, ...ends]);
}

export function fadedEnd(
  pitch: number,
  radius: number,
  profile: Drawing,
  bottom = false,
  lefthand = false,
  height = null,
) {
  const h = Math.max(height ?? pitch / 4, pitch / 4);
  const helix = makeHelix(
    pitch,
    h,
    radius,
    [0, 0, 0],
    [0, 0, bottom ? -1 : 1],
    lefthand,
  );

  const profiles = STEPS.map((step, i) => {
    const pos = helix.pointAt(step);
    let zDir = helix.tangentAt(step);
    if (bottom) {
      zDir = zDir.multiply(-1);
    }
    const plane = new Plane(pos, [0, 0, 1], zDir);

    return profile
      .scale((STEPS.length - i) / STEPS.length, [0, 0])
      .sketchOnPlane(plane) as Sketch;
  });
  const endFace = profiles[profiles.length - 1].faces();
  const shape = weld([
    profiles[0].loftWith(profiles.slice(1), { ruled: false }, true),
    endFace,
  ]);
  return bottom ? shape.rotate(180, [0, 0, 0]) : shape;
}

const range = (start, end) =>
  Array.from({ length: end - start }, (_, i) => i + start);

type ThreadConfig = {
  pitch: number;
  radius: number;
  height: number;
  rootWidth: number;
  apexWidth: number;
  toothHeight: number;
};

export const makeRawThread = ({
  pitch,
  radius,
  height,
  rootWidth,
  apexWidth,
  toothHeight,
}: ThreadConfig) => {
  const profile = threadProfile(rootWidth, apexWidth, toothHeight);

  const totalLoops = height / pitch;

  if (totalLoops <= 1) {
    return makeSolid([
      basicThreadLoop(pitch, radius, profile, totalLoops, "both"),
    ]);
  }

  const fullLoops = Math.floor(totalLoops);
  const leftover = totalLoops - fullLoops;

  const firstLoop = basicThreadLoop(pitch, radius, profile, 1, "first");

  let shellLoops = leftover > 0 ? fullLoops - 1 : fullLoops - 2;
  const lastLoop = basicThreadLoop(
    pitch,
    radius,
    profile,
    leftover > 0 ? leftover : 1,
    "last",
  ).translate([0, 0, (shellLoops + 1) * pitch]);

  if (!shellLoops) {
    return makeSolid([firstLoop, lastLoop]);
  }

  const singleLoop = basicThreadLoop(pitch, radius, profile);

  const shells = range(1, shellLoops + 1).map((i) =>
    singleLoop.clone().translate([0, 0, i * pitch]),
  );

  return makeSolid([firstLoop, ...shells, lastLoop]);
};

export const makeChamferedThread = ({
  pitch,
  radius,
  height,
  rootWidth,
  apexWidth,
  toothHeight,
}: ThreadConfig) => {
  const baseThread = makeRawThread({
    pitch,
    radius,
    height,
    rootWidth,
    apexWidth,
    toothHeight,
  });

  let shape;

  if (toothHeight > 0) {
    shape = makeCylinder(radius + toothHeight + 0.01, height).chamfer(
      toothHeight / 2,
    );
  } else {
    shape = makeCylinder(radius - 2 * toothHeight + 0.01, height)
      .cut(makeCylinder(radius + toothHeight - 0.01, height))
      .chamfer(Math.abs(toothHeight) / 2);
  }

  return baseThread.intersect(shape);
};

export const makeThread = ({
  pitch,
  radius,
  height,
  rootWidth,
  apexWidth,
  toothHeight,
}: ThreadConfig) => {
  const profile = threadProfile(rootWidth, apexWidth, toothHeight);

  const bottomEnd = fadedEnd(pitch, radius, profile, true);

  const totalLoops = height / pitch - 0.5;
  const fullLoops = Math.floor(totalLoops);

  const leftover = totalLoops - fullLoops;

  const singleLoop = basicThreadLoop(pitch, radius, profile);

  const shells = range(0, fullLoops).map((i) =>
    singleLoop.clone().translate([0, 0, i * pitch]),
  );

  if (leftover > 0) {
    const partialLoop = basicThreadLoop(pitch, radius, profile, leftover);
    shells.push(partialLoop.translate([0, 0, fullLoops * pitch]));
  }

  const topEnd = fadedEnd(pitch, radius, profile)
    .translate([0, 0, totalLoops * pitch])
    .rotate(360 * leftover);

  return makeSolid([bottomEnd, ...shells, topEnd]).translate([0, 0, pitch / 4]);
};

const rad = (deg) => (deg * Math.PI) / 180;

export const trapezoidalThreadConfig = (
  pitch: number,
  threadAngle = 30,
  external = true,
) => {
  const shoulderWidth = (pitch / 2) * Math.tan(rad(threadAngle / 2));
  const apexWidth = pitch / 2 - shoulderWidth;
  const rootWidth = pitch / 2 + shoulderWidth;

  return {
    pitch,
    rootWidth: rootWidth,
    apexWidth: apexWidth,
    toothHeight: external ? pitch / 2 : -pitch / 2,
  };
};

export function addClearance(
  threadConfig: ThreadConfig,
  clearance = 0,
): ThreadConfig {
  if (clearance === 0) {
    return threadConfig;
  }

  const isExternal = threadConfig.toothHeight > 0;

  const radius = isExternal
    ? threadConfig.radius - clearance
    : threadConfig.radius + clearance;

  return {
    ...threadConfig,
    apexWidth: Math.max(threadConfig.apexWidth - clearance, 0.01),
    rootWidth: Math.max(threadConfig.rootWidth - clearance, 0.01),
    radius: radius,
  };
}

export function trapezoidalThreadConfigConjugate(
  threadConfig: ThreadConfig,
  clearance = 0,
): ThreadConfig {
  const originalToothHeight = threadConfig.toothHeight;

  return addClearance(
    {
      ...threadConfig,
      toothHeight: -originalToothHeight,
      radius: threadConfig.radius + originalToothHeight,
    },
    clearance,
  );
}

export const metricThreadProfileConfig = (pitch: number, external = true) => {
  const h = (Math.sqrt(3) / 2) * pitch;

  const toothHeight = (5 / 8) * h;
  const apexWidth = external ? pitch / 8 : pitch / 4;
  const rootWidth = external ? (3 * pitch) / 4 : (7 * pitch) / 8;

  return {
    pitch,
    rootWidth,
    apexWidth,
    toothHeight: external ? toothHeight : -toothHeight,
  };
};

export const metricThreadConfig = (
  threadType: MetricThread,
  height: number,
  external = true,
  clearance = 0,
): ThreadConfig => {
  if (!METRIC_THREADS[threadType]) {
    throw new Error(`Thread type ${threadType} not found`);
  }
  const { pitch, nominalDiameter } = METRIC_THREADS[threadType];

  const { rootWidth, apexWidth, toothHeight } = metricThreadProfileConfig(
    pitch,
    external,
  );

  const apexRadius = nominalDiameter / 2;
  const rootRadius = apexRadius - toothHeight;

  const radius = external ? rootRadius : apexRadius;

  return addClearance(
    {
      pitch,
      radius,
      height,
      rootWidth,
      apexWidth,
      toothHeight: external ? toothHeight : -toothHeight,
    },
    clearance,
  );
};

export const metricThreadConfigConjugate = (
  threadConfig: ThreadConfig,
  clearance = 0,
) => {
  const originalToothHeight = threadConfig.toothHeight;
  const originalExternal = threadConfig.toothHeight > 0;

  return addClearance(
    {
      ...threadConfig,
      ...metricThreadProfileConfig(threadConfig.pitch, !originalExternal),
      radius: threadConfig.radius + originalToothHeight,
    },
    clearance,
  );
};
