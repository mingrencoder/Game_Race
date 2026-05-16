import { Vehicle, GarageCar } from '../types';
import { VEHICLES_DB, ITEMS_DB } from '../constants';

/**
 * 赛车数值与乘区成长映射字典
 * 每一级强化提升的基础属性乘区
 */
export const LEVEL_MULTI = [0, 0.1, 0.25, 0.45, 0.65, 1.0];

/** 每辆车最高级专属的满级额外属性参数补偿 */
export const MAX_BONUS: Record<string, { speed: number, accel: number, grip?: number, launch?: number, drift?: number }> = {
  car_basic: { speed: 0.6, accel: 0.03, grip: 0.02 },
  car_speed: { speed: 1.6, accel: 0.05, launch: 0.5 },
  car_drift: { speed: 0.8, accel: 0.05, drift: 2.0 },
  car_tank: { speed: 0.7, accel: 0.04, launch: 1.5, grip: 0.08 },
  car_ninja: { speed: 1.2, accel: 0.10, launch: 0.8 },
  car_cyber: { speed: 1.1, accel: 0.06, drift: 1.6 },
  car_boss: { speed: 2.2, accel: 0.12, grip: 0.12 },
  car_legend: { speed: 2.6, accel: 0.15, drift: 1.5 },
};

/**
 * 实时计算战车的局内最终动态战斗力模型
 * 公式：基于车辆原始白值 + (满级成长上限补偿 * 当前被动强化阶等) + 当前挂载部件装备加成 
 * 计算最终还要受到当前战车受损耐久度 DEBUFF 的乘区缩减处理
 */
export function getVehicleStats(vehicleData: Vehicle, state?: GarageCar) {
  const lv = state?.level || 0;
  const multi = LEVEL_MULTI[lv];
  const bonus = MAX_BONUS[vehicleData.id] || { speed: 0, accel: 0 };
  
  const baseEnhancedSpeed = vehicleData.baseSpeed + (bonus.speed * multi);
  const baseEnhancedGrip = vehicleData.baseGrip + ((bonus.grip || 0) * multi);
  const baseEnhancedLaunch = (vehicleData.baseLaunch || 0) + ((bonus.launch || 0) * multi);
  const baseEnhancedDrift = (vehicleData.baseDriftSpeed || 0) + ((bonus.drift || 0) * multi);
  const baseEnhancedAccel = (vehicleData.baseAcceleration || 0.15) + ((bonus.accel || 0) * multi);

  const equippedParts = state?.equippedParts || { engine: null, tires: null, launch: null, drift: null, acceleration: null };

  const engineBoost = ITEMS_DB.find(i => i.id === equippedParts.engine)?.speedBoost || 0;
  const tireBoost = ITEMS_DB.find(i => i.id === equippedParts.tires)?.gripBoost || 0;
  const launchBoost = ITEMS_DB.find(i => i.id === equippedParts.launch)?.launchBoost || 0;
  const driftBoost = ITEMS_DB.find(i => i.id === equippedParts.drift)?.driftSpeedBoost || 0;
  const accelBoost = ITEMS_DB.find(i => i.id === equippedParts.acceleration)?.accelerationBoost || 0;

  // physical penalty if durability < 30
  let debuffMultiplier = 1.0;
  if (state && state.durability < 30) {
    debuffMultiplier = 0.5; // for example, half performance (50% penalty)
  }

  return {
    engineBoost: Number(engineBoost.toFixed(3)),
    tireBoost: Number(tireBoost.toFixed(3)),
    launchBoost: Number(launchBoost.toFixed(3)),
    driftBoost: Number(driftBoost.toFixed(3)),
    accelBoost: Number(accelBoost.toFixed(3)),
    speed: Number(((baseEnhancedSpeed + engineBoost) * debuffMultiplier).toFixed(3)),
    grip: Number(((baseEnhancedGrip + tireBoost) * debuffMultiplier).toFixed(3)),
    launch: Number(((baseEnhancedLaunch + launchBoost) * debuffMultiplier).toFixed(3)),
    drift: Number(((baseEnhancedDrift + driftBoost) * debuffMultiplier).toFixed(3)),
    accel: Number(((baseEnhancedAccel + accelBoost) * debuffMultiplier).toFixed(3))
  };
}
