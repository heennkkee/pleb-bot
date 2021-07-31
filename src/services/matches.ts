import CacheService from "./cache";
import ApiService from "./api";

export default class MatchesService {
    private cache: CacheService;
    private api: ApiService;

    constructor(cache: CacheService, api: ApiService) {
        this.cache = cache;
        this.api = api;
    }

    async getUnpublishedGames() {
        let gamesToCheck: Game[] = [];
    
        for (let i in this.cache.playerIds) {
            let pId = this.cache.playerIds[i];
    
            let games = await this.api.getPlayerMatches(pId);
            for (let x in games) {
    
                let gameIndex = gamesToCheck.findIndex(game => game.match_id === games[x].match_id);
    
                if (gameIndex > -1) {
                    gamesToCheck[gameIndex].stack.push({ account_id: pId, hero_id: games[x].hero_id, kills: games[x].kills, assist: games[x].assists, deaths: games[x].deaths });
                } else {
                    gamesToCheck.push({
                        match_id: games[x].match_id,
                        end_time: new Date(games[x].start_time * 1000 + games[x].duration * 1000),
                        won: games[x].player_slot <= 127 ? games[x].radiant_win : !games[x].radiant_win,
                        party_size: games[x].party_size,
                        skill_level: games[x].skill,
                        stack: [
                            { account_id: pId, hero_id: games[x].hero_id, kills: games[x].kills, assist: games[x].assists, deaths: games[x].deaths }
                        ]
                    });
                }
            }
        }
    
        gamesToCheck = gamesToCheck.sort((a, b) => (a.end_time >= b.end_time) ? 1 : -1);
    
        return gamesToCheck.filter(game => this.cache.publishedMatches.findIndex(publishedMatchId => publishedMatchId === game.match_id) === -1);
    }
}