import { VEHICLES_DB } from '../../src/constants';

export function getVehicleTier(carId: string): number {
    const vehicle = VEHICLES_DB.find(v => v.id === carId);
    if (!vehicle) return 0;
    
    // Parse the tier string (e.g. 'T0', 'T1', 'T2', 'T3') into a number
    const match = vehicle.tier.match(/\d+/);
    if (match) {
        return parseInt(match[0], 10);
    }
    
    return 0; // Default fallback
}
