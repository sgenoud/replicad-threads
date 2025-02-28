import { makeHelix, draw, Plane, makeCylinder } from "replicad";
import type { Drawing } from "replicad";

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

const STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

export function basicThreadLoop(
  pitch: number,
  radius: number,
  profile: Drawing,
  height = 1,
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

    return profile.sketchOnPlane(plane);
  });
  return profiles[0].loftWith(profiles.slice(1), { ruled: false });
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
      .sketchOnPlane(plane);
  });
  const shape = profiles[0].loftWith(profiles.slice(1), { ruled: false });
  return bottom ? shape.rotate(180, [0, 0, 0]) : shape;
}

type ThreadConfig = {
  pitch: number;
  radius: number;
  height: number;
};

type ThreadProfileConfig = {
  radiusWidth: number;
  apexWidth: number;
  toothHeight: number;
};

export const makeRawThread = (
  { pitch, radius, height }: ThreadConfig,
  { radiusWidth, apexWidth, toothHeight }: ThreadProfileConfig,
) => {
  const profile = threadProfile(radiusWidth, apexWidth, toothHeight);

  const totalLoops = height / pitch;
  const fullLoops = Math.floor(totalLoops);

  const leftover = totalLoops - fullLoops;
  const singleLoop = basicThreadLoop(pitch, radius, profile);

  let shape = singleLoop.clone();
  for (let i = 1; i < fullLoops; i++) {
    shape = shape.fuse(singleLoop.clone().translate([0, 0, i * pitch]), {
      optimization: "sameFace",
    });
  }

  if (leftover > 0) {
    const partialLoop = basicThreadLoop(pitch, radius, profile, leftover);
    shape = shape.fuse(partialLoop.translate([0, 0, fullLoops * pitch]), {
      optimization: "sameFace",
    });
  }

  return shape;
};

export const makeChamferedThread = (
  { pitch, radius, height }: ThreadConfig,
  { radiusWidth, apexWidth, toothHeight }: ThreadProfileConfig,
) => {
  const baseThread = makeRawThread(
    { pitch, radius, height },
    { radiusWidth, apexWidth, toothHeight },
  );

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

export const makeThread = (
  { pitch, radius, height }: ThreadConfig,
  { radiusWidth, apexWidth, toothHeight }: ThreadProfileConfig,
) => {
  const profile = threadProfile(radiusWidth, apexWidth, toothHeight);

  const bottomEnd = fadedEnd(pitch, radius, profile, true);

  const totalLoops = height / pitch - 0.5;
  const fullLoops = Math.floor(totalLoops);

  const leftover = totalLoops - fullLoops;

  const singleLoop = basicThreadLoop(pitch, radius, profile);

  let shape = bottomEnd;
  for (let i = 0; i < fullLoops; i++) {
    shape = shape.fuse(singleLoop.clone().translate([0, 0, i * pitch]), {
      optimization: "sameFace",
    });
  }

  if (leftover > 0) {
    const partialLoop = basicThreadLoop(pitch, radius, profile, leftover);
    shape = shape.fuse(partialLoop.translate([0, 0, fullLoops * pitch]), {
      optimization: "sameFace",
    });
  }

  const topEnd = fadedEnd(pitch, radius, profile)
    .translate([0, 0, totalLoops * pitch])
    .rotate(360 * leftover);

  return shape
    .fuse(topEnd, { optimization: "sameFace" })
    .translate([0, 0, pitch / 4]);
};

const rad = (deg) => (deg * Math.PI) / 180;

export const trapezoidalThreadConfig = ({
  threadAngle,
  pitch,
}: {
  threadAngle: number;
  pitch: number;
}) => {
  const shoulderWidth = (pitch / 2) * Math.tan(rad(threadAngle / 2));
  const apexWidth = pitch / 2 - shoulderWidth;
  const rootWidth = pitch / 2 + shoulderWidth;

  return {
    radiusWidth: rootWidth,
    apexWidth: apexWidth,
  };
};
