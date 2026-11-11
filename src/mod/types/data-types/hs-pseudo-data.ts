export interface PseudoUpgrade {
    upgradeId: number;
    maxLevel: number;
    name: string;
    description: string;
    internalName: string;
    cost?: number;
}

export interface PseudoPlayerUpgrade {
    level: number;
    upgradeId: number;
    internalName?: string;
}

export interface PseudoGameData {
    coins: number;
    /** Upgrade metadata. Older responses may contain player-level entries here. */
    upgrades: Array<PseudoUpgrade | PseudoPlayerUpgrade>;
    playerUpgrades: PseudoPlayerUpgrade[];
}
