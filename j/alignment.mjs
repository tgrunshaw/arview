// Pure metric calibration. Never changes the scale of the architecture.
export function calibrate(a, b, modelB) {
  const dx=b.x-a.x, dz=b.z-a.z;
  const measured=Math.hypot(dx,dz), expected=Math.hypot(modelB[0],modelB[2]);
  if (measured<1) throw new Error('Move to B before setting it; the two points are too close.');
  const yaw=Math.atan2(modelB[2],modelB[0])-Math.atan2(dz,dx);
  return {yaw, measured, expected, error:measured-expected, heightError:(b.y-a.y)-modelB[1]};
}
export function rotateXZ(x,z,yaw) {
  return {x:Math.cos(yaw)*x+Math.sin(yaw)*z,z:-Math.sin(yaw)*x+Math.cos(yaw)*z};
}
