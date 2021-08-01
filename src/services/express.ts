import axios from 'axios';
import { SlowBuffer } from 'buffer';
import { Message } from 'discord.js';
import express from 'express';
import { formatMilliSeconds } from '../functions';
import BotService from './bot';
import CacheService from './cache';
import JobService from './job';
import MatchesService from './matches';

export default class ExpressService {
    private app;

    private cache: CacheService;
    private matches: MatchesService;
    private job: JobService;
    private bot: BotService;

    constructor(cache: CacheService, matches: MatchesService, job: JobService,
            bot: BotService) {
        this.app = express();

        this.cache = cache;
        this.matches = matches;
        this.job = job;
        this.bot = bot;

        this.app.get('/matches/unpublished', async (req, res) => {
            let games = await this.matches.getUnpublishedGames();
            res.json(games);
        });

        this.app.get('/matches/published', async (req, res) => {
            res.json(this.cache.publishedMatches);
        });

        this.app.get('/heroes', async (req, res) => {
            res.json(this.cache.heroInfo);
        });

        this.app.get('/players', async (req, res) => {
            res.json(this.cache.playerInfo);
        });

        this.app.get('/job', (req, res) => {
            let nextRun = this.job.job.nextInvocation();
            let timeUntilNextCheck = nextRun.getTime() - new Date().getTime();
            res.send(`Next scheduled check in ${formatMilliSeconds(timeUntilNextCheck)} (${nextRun.toLocaleString()}).`);
        });

        this.app.get('/messages', async (req, res) => {
            let messages = await this.bot.loadMessagesFromChannel(20);
            res.json(messages);
        });

        this.app.get('/updates', async (req, res) => {
            let test = await axios.get('https://store.steampowered.com/events/ajaxgetpartnereventspageable/?appid=570&l=english');
            let result: string[] = [];
            // https://www.dota2.com/datafeed/patchnoteslist?language=english
            // https://www.dota2.com/datafeed/itemlist?language=english
            // https://www.dota2.com/datafeed/abilitylist?language=english
            // https://www.dota2.com/datafeed/herolist?language=english
            // https://www.dota2.com/datafeed/patchnotes?version=7.29d&language=english
            
            for (let ev of test.data.events) {
                if (ev.event_type === 12) { // Dota gameplay update?
                    result.push('<h3>' + ev.event_type + ' - ' + (new Date(ev.rtime32_start_time * 1000).toLocaleString()) + ' - ' + ev.event_name + '</h3><p>' + ev.announcement_body.body + '</p>');
                }
            }
            res.send(`<html>${result.join('\n')}</html>`);
            //res.json(test.data.events);
        })
    }

    listen() {
        console.log("Webapp listening on port 3000")
        this.app.listen(3000);
    }
}