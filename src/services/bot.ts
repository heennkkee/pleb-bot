import Discord, { TextChannel } from 'discord.js';
import CacheService from './cache';
import MatchesService from './matches';

export default class BotService {
    private bot: Discord.Client;
    private publicationChannel?: Discord.TextChannel = undefined;
    private cache: CacheService;
    private matches: MatchesService;

    constructor(cache: CacheService, matches: MatchesService) {
        this.bot = new Discord.Client();
        this.cache = cache;
        this.matches = matches;

        this.bot.on('ready', async () => {
            console.log("Bot is connected!");
            let channel = await this.bot.channels.fetch('828642317422428197');
            if (channel !== undefined) {
                this.publicationChannel = (channel as TextChannel);
            }
            this.loadPublishedMatchesFromChat();
        });

        this.bot.on('message', async (msg) => {
            if (msg.content === "check") {
                let newGames = await this.matches.getUnpublishedGames();
                if (newGames.length > 0) {
        
                    for (let i in newGames) {
                        let game = newGames[i];
                        
                        this.publishGame(game);

                        this.cache.publishedMatches.push(game.match_id);
                    }
                    
                    this.cache.savePublishedMatchesToCache();
                
                } else {
                    msg.channel.send("No new matches found");
                }
            }
        });
    }

    login() {
        this.bot.login(process.env.TOKEN);
    }

    async loadMessagesFromChannel(limit: number = 100) {
        return await this.publicationChannel.messages.fetch({ limit: limit });
    }


    private async loadPublishedMatchesFromChat() {
        let messages = await this.loadMessagesFromChannel(50);
        let matchIds = [];
        for (let [id, msg] of messages) {
            for (let embed of msg.embeds) {
                for (let field of embed.fields) {
                    if (field.name === "Match ID") {
                        matchIds.push(parseInt(field.value));
                    }
                }
            }
        }

        let saveCache = false;
        matchIds.map((id) => {
            if (this.cache.publishedMatches.findIndex(publishedId => publishedId === id) === -1) {
                saveCache = true;
                console.log(`Adding game ${id} to cache (loaded via chat)`);
                this.cache.publishedMatches.push(id);
            }
        });

        if (saveCache) {
            this.cache.savePublishedMatchesToCache();
        }
    }

    publishGame(game: Game) {
        let message = this.formatGameForPublication(game);
        this.publicationChannel.send(message);
    }
    
    private formatGameForPublication (game: Game) {
        let descr = `${game.won ? 'Senpai' : 'Weeb'}${game.party_size > 1 ? 's' : ''} `;
        let playerDescr = [];
        for (let j in game.stack) {
            let heroArr = this.cache.heroInfo.filter(x => x.id === game.stack[j].hero_id);
            let hero = "N/A";
            if (heroArr.length > 0) {
                hero = heroArr[0].localized_name;
            }
            playerDescr.push(`[${this.cache.playerInfo[game.stack[j].account_id].personaname}](https://www.opendota.com/players/${[game.stack[j].account_id]}) (${hero} - ${game.stack[j].kills}/${game.stack[j].deaths}/${game.stack[j].assist})`);
        }
        descr += `\n  * ${playerDescr.join('\n  * ')}\n ${game.won ? 'won' : 'UwU:d'} a game. \n\nThe game was at a ${game.skill_level === 1 ? 'normal' : (game.skill_level === 2 ? 'high' : game.skill_level === 3 ? 'very-senpai' : 'unknown')} skill level.`; 
        const message: Discord.MessageEmbed = new Discord.MessageEmbed()
            .setColor(game.won ? '#10ff00' : '#ff5e00')
            .setTitle(`${game.won ? 'Win' : 'UwU'} detected`)
            .setDescription(descr)
            .addFields(
                { name: "More info", value: "Check [OpenDota](https://www.opendota.com/matches/" + game.match_id + ") or [DotaBuff](https://www.dotabuff.com/matches/" + game.match_id + ") for more details about the skirmish." },
                { name: "Match ID", value: game.match_id }
            )
            .setTimestamp(game.end_time);
    
        return message;
    }
    
}