import fs, { promises as fsPromises } from 'fs';
import ApiService from './api';

export default class CacheService {
    playerIds: number[];
    playerInfo = {};
    heroInfo = [];
    publishedMatches: number[] = [];

    private api: ApiService;

    private PLAYERCACHE = './cache/players.json';
    private HEROCACHE = './cache/heroes.json';
    private MATCHESCACHE = './cache/matches.json';

    constructor(playerIds: number[], api: ApiService) {
        this.playerIds = playerIds;
        this.api = api;
    }

    async init() {
        console.log("Initiating cache..");
        await this.loadPlayerInfo();
        await this.loadHeroInfo();
        await this.loadPublishedMatches();
        console.log("Cache initialized");
    }

    async loadPlayerInfo() {
        let playerInfo = await this.loadFile(this.PLAYERCACHE);

        if (playerInfo === null) {
            for (let i in this.playerIds) {
                let playerData = await this.api.getPlayer(this.playerIds[i]);
                this.playerInfo[this.playerIds[i]] = playerData.profile;
            }
            await this.writeFile(this.PLAYERCACHE, JSON.stringify(this.playerInfo));


            let missingPlayer = false;
            for (let i in this.playerIds) {
                if (this.playerInfo[this.playerIds[i]] === undefined) {
                    console.log("missing player " + this.playerIds[i] + ", loading from API")
                    let playerData = await this.api.getPlayer(this.playerIds[i]);
                    this.playerInfo[this.playerIds[i]] = playerData.profile;

                    missingPlayer = true;
                }
            }

            if (missingPlayer) {
                await this.writeFile(this.PLAYERCACHE, JSON.stringify(this.playerInfo));
            }

        } else {
            this.playerInfo = JSON.parse(playerInfo);
        }

        console.log("PlayerInfo loaded!");
    }

    async loadHeroInfo() {
        let heroesInfo = await this.loadFile(this.HEROCACHE);
        
        if (heroesInfo === null) {
            let heroes = await this.api.getHeroes();
            this.heroInfo = heroes;
            await this.writeFile(this.HEROCACHE, JSON.stringify(heroes));
        } else {
            this.heroInfo = JSON.parse(heroesInfo);
        }

        console.log("HeroInfo loaded!");
    }

    async loadPublishedMatches() {
        let matches = await this.loadFile(this.MATCHESCACHE);
        if (matches === null) {
            console.log("No matches found in cache");
        } else {
            this.publishedMatches = JSON.parse(matches);
        }
    }

    async savePublishedMatchesToCache () {
        await this.writeFile(this.MATCHESCACHE, JSON.stringify(this.publishedMatches));
    }

    private async loadFile(path: string): Promise<string | null> {
        try {
            let res = await fsPromises.readFile(path);
            return res.toString('utf8');
        } catch (ex) {
            console.log(`Failed to loadfile ${path}:`, ex);
            return null;
        }
    }

    private async writeFile(path: string, data: string) {
        try {
            await fsPromises.writeFile(path, data);
            return true;
        } catch (ex) {
            console.log(`Failed to write to ${path}`, ex);
            return false;
        }
    }
}