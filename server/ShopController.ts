import { Response } from 'express';
import { AuthenticatedRequest } from './GMMiddleware';
import { StorageEngine } from './StorageEngine';
import { VEHICLES_DB, ITEMS_DB } from '../src/constants';

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
                    existingCar.expireAt = Math.max(Date.now(), existingCar.expireAt || Date.now()) + 3 * 24 * 60 * 60 * 1000;
                }
            } else {
                playerData.garage.push({
                    carId,
                    level: 0,
                    durability: 100,
                    isPermanent,
                    expireAt: isPermanent ? null : Date.now() + 3 * 24 * 60 * 60 * 1000,
                    equippedParts: { engine: null, tires: null, launch: null, drift: null, acceleration: null }
                });
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle purchased successfully', carId, isPermanent, currentCoins: playerData.wallet.coins });
        } catch (error: any) {
            console.error('[ShopController] buyCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyPart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { partId } = req.body;
            if (!partId) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const partConfig = ITEMS_DB.find(p => p.id === partId);
            if (!partConfig) { res.status(400).json({ error: 'Invalid partId' }); return; }

            const cost = partConfig.price;

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.wallet) playerData.wallet = { coins: 0 };
            if (playerData.wallet.coins < cost) { res.status(400).json({ error: `金币不足 (需要 ${cost} ⟁)` }); return; }

            playerData.wallet.coins -= cost;
            
            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.parts) playerData.inventory.parts = {};

            playerData.inventory.parts[partId] = (playerData.inventory.parts[partId] || 0) + 1;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '储备入库成功 (Added to inventory)', partId, currentCoins: playerData.wallet.coins, partsInventory: playerData.inventory.parts });
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

            // 卸下旧零件 (20% 折损费规则) 
            // - PRD 指定：替换旧零件，或仅拆除旧零件，均需向系统支付旧零件原售价 20%
            if (oldPartId) {
                const oldPartConfig = ITEMS_DB.find(p => p.id === oldPartId);
                if (oldPartConfig) {
                    unequipCost = Math.floor(oldPartConfig.price * 0.2);
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
                vehicleParts: vehicle.equippedParts
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
            vehicle.durability = 100;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: 'Vehicle repaired successfully', currentDurability: 100, currentCoins: playerData.wallet.coins });
        } catch (error: any) {
            console.error('[ShopController] repairCar error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyItem(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { itemId, quantity = 1, cost } = req.body;
            if (!itemId || cost === undefined) { res.status(400).json({ error: 'Missing parameters' }); return; }

            const totalCost = cost * quantity;

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
                playerData.inventory.materials[itemId] = (playerData.inventory.materials[itemId] || 0) + quantity;
            } else if (itemId.includes('Card') || itemId.includes('card_')) {
                playerData.inventory.protectors[itemId] = (playerData.inventory.protectors[itemId] || 0) + quantity;
            } else if (itemId === 'rename_card') {
                playerData.inventory.specialItems.rename_card = (playerData.inventory.specialItems.rename_card || 0) + quantity;
            } else {
                playerData.inventory.parts[itemId] = (playerData.inventory.parts[itemId] || 0) + quantity;
            }

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '购买成功', itemId, quantity, currentCoins: playerData.wallet.coins, inventory: playerData.inventory });
        } catch (error: any) {
            console.error('[ShopController] buyItem error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async buyLivery(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const uid = req.user?.uid;
            if (!uid) { res.status(401).json({ error: 'Unauthorized' }); return; }

            const { liveryId, cost } = req.body;
            if (!liveryId || cost === undefined) { res.status(400).json({ error: 'Missing parameters' }); return; }

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
            res.json({ success: true, message: '涂装购买成功', liveryId, currentCoins: playerData.wallet.coins, paints: playerData.inventory.paints });
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

            let playerData = await StorageEngine.readEncrypted(uid);
            if (!playerData) { res.status(404).json({ error: 'Player data not found' }); return; }

            if (!playerData.inventory) playerData.inventory = { materials: {}, protectors: {}, parts: {}, paints: [] };
            if (!playerData.inventory.paints) playerData.inventory.paints = [];

            // If it's not a basic color/hex and not 'default', check if owned
            if (liveryId !== 'default' && !liveryId.startsWith('#')) {
                if (!playerData.inventory.paints.includes(liveryId)) {
                    res.status(400).json({ error: '您未拥有该涂装' });
                    return;
                }
            }

            if (!playerData.garage) playerData.garage = [];
            const vehicle = playerData.garage.find((c: any) => c.carId === carId);
            if (!vehicle) { res.status(400).json({ error: 'Vehicle not found in garage' }); return; }

            vehicle.equippedPaint = liveryId === 'default' ? null : liveryId;

            await StorageEngine.writeEncrypted(uid, playerData);
            res.json({ success: true, message: '涂装装备成功', carId, equippedPaint: vehicle.equippedPaint });
        } catch (error: any) {
            console.error('[ShopController] equipLivery error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
