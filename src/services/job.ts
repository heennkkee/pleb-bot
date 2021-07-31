import schedule from 'node-schedule';
import BotService from './bot';
import CacheService from './cache';
import MatchesService from './matches';

export default class JobService {
    job: schedule.Job;

    private cache: CacheService;
    private matches: MatchesService;
    private bot: BotService;
    
    constructor(cache: CacheService, matches: MatchesService, bot: BotService) {
        this.cache = cache;
        this.matches = matches;
        this.bot = bot;

        this.job = schedule.scheduleJob('*/5 * * * *', async () => {
            let newGames = await this.matches.getUnpublishedGames();
            if (newGames.length > 0) {
        
                for (let i in newGames) {
                    let game = newGames[i];
                    this.bot.publishGame(game);
                    this.cache.publishedMatches.push(game.match_id);
                }
                
                this.cache.savePublishedMatchesToCache();
            
            } else {
                console.log(new Date(), "Checked for new games, but nothing found");
            }
        });
    }
}