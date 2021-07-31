import dotenv from 'dotenv';
import { playerIds } from './conf';

import ApiService from './services/api';
import BotService from './services/bot';

import CacheService from './services/cache';
import ExpressService from './services/express';
import JobService from './services/job';
import MatchesService from './services/matches';

dotenv.config();

const init = async () => {
    const Api = new ApiService();
    const Cache = new CacheService(playerIds, Api);
    await Cache.init();
    const Matches = new MatchesService(Cache, Api);
    
    const Bot = new BotService(Cache, Matches);
    Bot.login();
    
    const Job = new JobService(Cache, Matches, Bot);
    
    const WebApp = new ExpressService(Cache, Matches, Job, Bot);
    WebApp.listen();
}

init();