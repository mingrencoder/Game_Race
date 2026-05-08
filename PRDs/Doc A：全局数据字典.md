# 跑跑赛车 (Neon Racing) - 全局数据字典 (Document A)

## 1. 玩家加密资产库结构 (`UID_xxx.json`)
无论怎么读写，玩家的底层资产必须严格遵守以下 JSON 结构：
```json
{
  "profile": {
    "uid": "10000001",           // 【不可修改】账号唯一标识
    "nickname": "车手A",
    "role": "player",            // "player" 或 "admin"
    "status": "active",          // 【新增】账号状态："active" (正常) | "banned" (封禁)
    "banReason": "使用加速外挂",   // 【新增】封禁详细原因，active 状态下为空
    "registerTime": 1715000000000,
    "activeCarId": "car_basic"     // 【必须新增】当前正在驾驶/出战的车辆 ID
  },
  "wallet": {
    "coins": 0  // 游戏代币 ⟁，必须为整数，不可为负
  },
  "garage": [
    // 玩家拥有的赛车数组
    {
      "carId": "car_basic",       // 车辆唯一标识 (如新星-V1)
      "level": 0,               // 强化等级 (0 到 5)
      "durability": 100,        // 耐久度 (满分100，低于30降速)
      "isPermanent": true,      // 是否永久 (true=永久, false=租赁)
      "expireAt": null,         // 租赁到期时间戳 (isPermanent为true时为null)
      "equippedParts": {        // 装配的永久零件
        "engine": null,         // 引擎槽
        "tires": null,           // 轮胎槽
        "launch": null,        // 起步槽
        "drift": null,          // 漂移槽
        "acceleration": null    // 加速槽
      },
      "equippedPaint": "liv_silver" // 【必须新增】这辆车当前装配的喷漆ID，如果没装配可为 null 或 "default"
    }
  ],
  "inventory": {
    // 背包材料统计
    "materials": {
      "core_primary": 0,    // 初级强化核心
      "core_advanced": 0,   // 高级强化核心
      "core_legendary": 0   // 传说强化核心
    },
    "protectors": {
      "card_silver": 0,     // 白银保护卡 (+3冲+4用)
      "card_gold": 0        // 黄金保护卡 (+4冲+5用)
    },
    "specialItems": {
      "rename_card": 0       // 改名卡数量
    },
    "parts": {},            // 拥有且未装配的闲置配件计数 (如 "engine_t1": 2)
    "paints": []            // 拥有的喷漆外观 ID 数组
  }
}