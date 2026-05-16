import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB, SYS_CONFIG } from '../src/constants';

export class ShopController {
    
    static async buyCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId, isPermanent } = req.body;
            if (!carId || typeof isPermanent !== 'boolean') {
                res.status(400).json({ error: 'Missing parameters' });
                return;
            }

            const carConfig = VEHICLES_DB.find(c => c.id === carId);
            if (!carConfig) {
                res.status(400).json({ error: 'Invalid carId' });
                return;
            }

            const cost = isPermanent ? carConfig.price : (carConfig.rent || 0);

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) {
                res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` });
                return;
            }

            playerData.wallet.coins -= cost;

            if (!playerData.garage) playerData.garage = [];
            const existingCar = playerData.garage.find((c: any) => c.carId === carId);

            if (existingCar) {
                if (existingCar.isPermanent) {
                    res.status(400).json({ error: '您已永久拥有该赛车' });
                    return;
                }
                
                if (isPermanent) {
                    existingCar.isPermanent = true;
                    existingCar.expireAt = null;
                } else {
                    existingCar.expireAt = Math.max(Date.now(), existingCar.expireAt || Date.now()) + SYS_CONFIG.RENTAL_DURATION_MS;
                }
            } else {
                playerData.garage.push({
                    carId,
                    level: 0,
                    durability: SYS_CONFIG.MAX_DURABILITY,
                    isPermanent,
                    expireAt: isPermanent ? null : Date.now() + SYS_CONFIG.RENTAL_DURATION_MS,
                    equippedParts: { engine: null, tires: null, launch: null, drift: null, acceleration: null }
                });
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle purchased successfully', carId, isPermanent, currentCoins: playerData.wallet.coins, playerData });
        } catch (error: any) {
            console.error('[ShopController] buyCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyPart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { partId, amount = 1 } = req.body;
            if (!partId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const partConfig = ITEMS_DB.find(p => p.id === partId);
            if (!partConfig) { res.status(400).json({ error: 'Invalid partId' }); return; }

            const cost = partConfig.price * amount;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) { res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` }); return; }

            playerData.wallet.coins -= cost;
            
            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.parts) playerData.inventory.parts = {};

            playerData.inventory.parts[partId] = (playerData.inventory.parts[partId] || 0) + amount;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: `储备入库成功 (数量: ${amount})`, partId, currentCoins: playerData.wallet.coins, partsInventory: playerData.inventory.parts, playerData });
        } catch (error: any) {
            console.error('[ShopController] buyPart error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    static async equipPart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            // partId: 可选，若为 null 则仅表示卸载
            const { carId, slotId, partId } = req.body;

            if (!carId || !slotId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const validSlots = ['engine', 'tires', 'launch', 'drift', 'acceleration'];
            if (!validSlots.includes(slotId)) { res.status(400).json({ error: 'Invalid slotId' }); return; }

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (partId && (!playerData.inventory?.parts?.[partId] || playerData.inventory.parts[partId] <= 0)) {
                res.status(400).json({ error: '背包内无此闲置配件' }); return;
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((c: any) => c.carId === carId);
            if (!vehicle) { res.status(400).json({ error: 'Vehicle not found in garage' }); return; }
            if (!vehicle.equippedParts) vehicle.equippedParts = { engine: null, tires: null, launch: null, drift: null, acceleration: null };

            const oldPartId = vehicle.equippedParts[slotId];
            let unequipCost = 0;

            // 卸下旧零件折损费规则
            if (oldPartId) {
                const oldPartConfig = ITEMS_DB.find(p => p.id === oldPartId);
                if (oldPartConfig) {
                    unequipCost = Math.floor(oldPartConfig.price * SYS_CONFIG.PART_DEPRECIATION_RATE);
                }
            }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (unequipCost > 0 && playerData.wallet.coins < unequipCost) {
                res.status(400).json({ error: `金币不足，无法拆卸/替换零件 (需要支付系统折损费 ${unequipCost} ⟁)` });
                return;
            }

            // 执行扣费与置换
            if (unequipCost > 0) {
                playerData.wallet.coins -= unequipCost;
            }

            if (oldPartId) {
                if (!playerData.inventory.parts) playerData.inventory.parts = {};
                playerData.inventory.parts[oldPartId] = (playerData.inventory.parts[oldPartId] || 0) + 1;
            }

            if (partId) {
                playerData.inventory.parts[partId] -= 1; // 从闲置库存扣除
                vehicle.equippedParts[slotId] = partId; // 装配到身上
            } else {
                vehicle.equippedParts[slotId] = null; // 仅仅卸载
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({
                success: true,
                message: partId ? '装配/替换成功' : '拆卸成功',
                carId, slotId, equippedPartId: partId, returnedPartId: oldPartId || null,
                unequipCost,
                currentCoins: playerData.wallet.coins,
                partsInventory: playerData.inventory.parts,
                vehicleParts: vehicle.equippedParts,
                playerData
            });
        } catch (error: any) {
            console.error('[ShopController] equipPart error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    static async repairCar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId } = req.body;
            if (!carId) { res.status(400).json({ error: 'Missing carId' }); return; }

            const carConfig = VEHICLES_DB.find(c => c.id === carId);
            if (!carConfig) { res.status(400).json({ error: 'Invalid carId' }); return; }

            const repairCost = carConfig.maintenanceFee;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < repairCost) {
                res.status(400).json({ error: `支付大修费失败 (不足 ${repairCost} ⟁)` });
                return;
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((c: any) => c.carId === carId);
            if (!vehicle) { res.status(400).json({ error: 'Vehicle not found in garage' }); return; }

            playerData.wallet.coins -= repairCost;
            vehicle.durability = SYS_CONFIG.MAX_DURABILITY;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle repaired successfully', currentDurability: SYS_CONFIG.MAX_DURABILITY, currentCoins: playerData.wallet.coins, playerData });
        } catch (error: any) {
            console.error('[ShopController] repairCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyItem(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { itemId, amount = 1 } = req.body;
            if (!itemId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            let unitPrice = 0;
            const itemConfig = ITEMS_DB.find(i => i.id === itemId);
            if (itemConfig) {
                unitPrice = itemConfig.price;
            } else if (itemId === 'core_primary') unitPrice = 100;
            else if (itemId === 'core_advanced') unitPrice = 500;
            else if (itemId === 'core_legendary') unitPrice = 2000;
            else if (itemId === 'card_silver') unitPrice = 1500;
            else if (itemId === 'card_gold') unitPrice = 8000;
            else { res.status(400).json({ error: 'Invalid item' }); return; }

            const totalCost = unitPrice * amount;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < totalCost) { res.status(400).json({ error: `金币不足 (需要 ${totalCost} ⟁)` }); return; }

            playerData.wallet.coins -= totalCost;
            
            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.materials) playerData.inventory.materials = {};
            if (!playerData.inventory.protectors) playerData.inventory.protectors = {};
            if (!playerData.inventory.parts) playerData.inventory.parts = {};
            if (!playerData.inventory.specialItems) playerData.inventory.specialItems = { rename_card: 0 };
            
            if (itemId.includes('core_') || itemId.includes('coreT')) {
                playerData.inventory.materials[itemId] = (playerData.inventory.materials[itemId] || 0) + amount;
            } else if (itemId.includes('Card') || itemId.includes('card_')) {
                playerData.inventory.protectors[itemId] = (playerData.inventory.protectors[itemId] || 0) + amount;
            } else if (itemId === 'rename_card') {
                playerData.inventory.specialItems.rename_card = (playerData.inventory.specialItems.rename_card || 0) + amount;
            } else {
                playerData.inventory.parts[itemId] = (playerData.inventory.parts[itemId] || 0) + amount;
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '购买成功', itemId, quantity: amount, currentCoins: playerData.wallet.coins, inventory: playerData.inventory, playerData });
        } catch (error: any) {
            console.error('[ShopController] buyItem error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyLivery(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { liveryId } = req.body;
            if (!liveryId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const liveryConfig = LIVERIES_DB.find(l => l.id === liveryId);
            if (!liveryConfig) { res.status(400).json({ error: 'Invalid livery' }); return; }
            const cost = liveryConfig.price;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.paints) playerData.inventory.paints = [];

            if (playerData.inventory.paints.includes(liveryId)) {
                res.status(400).json({ error: '您已拥有该涂装' });
                return;
            }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) {
                res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` });
                return;
            }

            playerData.wallet.coins -= cost;
            playerData.inventory.paints.push(liveryId);

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '涂装购买成功', liveryId, currentCoins: playerData.wallet.coins, paints: playerData.inventory.paints, playerData });
        } catch (error: any) {
            console.error('[ShopController] buyLivery error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async equipLivery(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { carId, liveryId } = req.body;
            if (!carId || !liveryId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            let finalPlayerData: any = null;
            let equippedPaint = null;

            await StorageEngine.transaction(uid, async (data) => {
                if (!data.inventory) data.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
                if (!data.inventory.paints) data.inventory.paints = [];

                if (liveryId !== 'default' && !liveryId.startsWith('#')) {
                    if (!data.inventory.paints.includes(liveryId)) {
                        throw new Error('您未拥有该涂装');
                    }
                }

                if (!data.garage) data.garage = [];
                const vehicle = data.garage.find((c: any) => c.carId === carId);
                if (!vehicle) {
                    throw new Error('Vehicle not found in garage');
                }

                vehicle.equippedPaint = liveryId === 'default' ? null : liveryId;
                equippedPaint = vehicle.equippedPaint;
                finalPlayerData = data;
            });

            res.json({ success: true, message: '涂装装备成功', carId, equippedPaint, playerData: finalPlayerData });
        } catch (error: any) {
            console.error('[ShopController] equipLivery error:', error);
            res.status(error.message.includes('未拥有') || error.message.includes('not found') ? 400 : 500)
                .json({ error: error.message || 'Internal Server Error' });
        }
    }
}
