interface User {
    id: string;
    username: string;
    discriminator: string;
    global_name: string;
    avatar: string | null;
    banner: string | null;
    accent_color: null;
    flags: number;
    public_flags: number;
  }
  
interface Member {
    user: User;
    nick: string | null;
    avatar: string | null;
    roles: string[];
    joined_at: string;
    premium_since: string | null;
    deaf: boolean;
    mute: boolean;
    flags: number;
    pending: boolean;
    communication_disabled_until: string | null;
}

export interface Bonus {
    quarkBonus: number;
}

export interface MeData {
    personalBonus: number;
    globalBonus: number;
    bonus: Bonus;
}