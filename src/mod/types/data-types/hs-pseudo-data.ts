export interface PseudoUpgrade {
    upgradeId: number;
    maxLevel: number;
    name: string;
    description: string;
    internalName: string;
    level: number;
    cost: number;
}

export interface PseudoPlayerUpgrade {
    level: number;
    upgradeId: number;
    internalName: string;
}

export interface PseudoGameData {
    coins: number;
    upgrades: PseudoUpgrade[];
    playerUpgrades: PseudoPlayerUpgrade[];
    tier: number;
}