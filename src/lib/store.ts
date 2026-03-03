export type GameSettings = {
    seWavDataUrl: string | null;
    bgmMp3DataUrl: string | null;
    highScore: number;
};

const DEFAULT_SETTINGS: GameSettings = {
    seWavDataUrl: null,
    bgmMp3DataUrl: null,
    highScore: 0,
};

export const getGameSettings = (): GameSettings => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const stored = localStorage.getItem("tsum_game_settings");
    if (stored) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch {
            return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
};

export const saveGameSettings = (settings: Partial<GameSettings>) => {
    if (typeof window === "undefined") return;
    const current = getGameSettings();
    const next = { ...current, ...settings };
    localStorage.setItem("tsum_game_settings", JSON.stringify(next));
};
