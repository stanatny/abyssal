import { tr } from "./i18n.js";
/** 玩家自由游泳的转向与姿态读数；不依赖渲染、输入设备或世界坐标。 */
export const MAX_SWIM_PITCH = (Math.PI * 85) / 180;

/**
 * 按输入角速度改变游向，松开输入保留当前方向，不自动回到水平。
 * @param {{yaw:number,pitch:number}} orientation 当前偏航和俯仰角，单位为弧度。
 * @param {{x:number,y:number}} input 左右/上下输入，正值分别为右转/上仰。
 * @param {{yawRate:number,pitchRate:number}} movement 当前角色的转向速度，单位为弧度/秒。
 * @param {number} dt 本帧物理时间，暂停时为零。
 * @returns {{yaw:number,pitch:number}} 新姿态；不修改输入，所有角色均可接近垂直游泳。
 */
export function stepSteering(orientation, input, movement, dt) {
  const elapsed = Math.max(0, finite(dt));
  const yawRate = Math.max(0, finite(movement?.yawRate, 1.15));
  const pitchRate = Math.max(0, finite(movement?.pitchRate, yawRate));
  return {
    yaw:
      finite(orientation?.yaw) -
      clamp(finite(input?.x), -1, 1) * yawRate * elapsed,
    pitch: clamp(
      finite(orientation?.pitch) +
        clamp(finite(input?.y), -1, 1) * pitchRate * elapsed,
      -MAX_SWIM_PITCH,
      MAX_SWIM_PITCH,
    ),
  };
}

/**
 * 将当前实际前向换成姿态刻度，空中可直接使用弹道前向。
 * @param {{x:number,y:number,z:number}} forward 当前前向向量，不要求单位长度。
 * @returns {{pitch:number,degrees:number,fraction:number,direction:string,label:string}} 弧度、整数角度及可读提示。
 */
export function getSwimmingAttitude(forward) {
  const horizontal = Math.hypot(finite(forward?.x), finite(forward?.z));
  const pitch = Math.atan2(finite(forward?.y), horizontal);
  const degrees = Math.round((pitch * 180) / Math.PI) || 0;
  const direction = degrees > 0 ? "up" : degrees < 0 ? "down" : "level";
  return {
    pitch,
    degrees,
    fraction: clamp(pitch / MAX_SWIM_PITCH, -1, 1),
    direction,
    label:
      direction === "level"
        ? "平游 0°"
        : tr`${direction === "up" ? "上仰" : "下俯"} ${Math.abs(degrees)}°`,
  };
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
