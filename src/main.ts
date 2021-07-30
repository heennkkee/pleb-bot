import dotenv from 'dotenv';
import Discord from 'discord.js';
import axios from 'axios';

import { OPENDOTA_API } from './opendota_wrapper';

import fs from 'fs';
import { paths } from './schema';

dotenv.config();


const bot = new Discord.Client();

const playerIds = [
    76573026,
    124579759,
    69564590,
    10015261
];


let playerInfo = {};
let heroInfo = [];


bot.on('ready', async () => {
    console.log("Bot is connected!");
    fs.readFile('./cache/heroes.json', async (err, data) => {
        if (err !== null && err.errno === -2) { //no such file
            let heroes = await OPENDOTA_API.getHeroes();
            heroInfo = heroes;
            fs.writeFile('./cache/heroes.json', JSON.stringify(heroInfo), (err) => {
                if (err) {
                    console.error("FAILED TO WRITE HEROCACHE: ", err);
                }
            });
        } else if (err === null) {
            heroInfo = JSON.parse(data.toString('utf8'));
        }
        console.log("HeroInfo loaded!");
    });

    fs.readFile('./cache/players.json', async (err, data) => {
        if (err !== null && err.errno === -2) { //no such file
            for (let i in playerIds) {
                let playerData = await OPENDOTA_API.getPlayer(playerIds[i]);
                playerInfo[playerIds[i]] = playerData.profile;
            }
            fs.writeFile('./cache/players.json', JSON.stringify(playerInfo), (err) => {
                if (err) {
                    console.error("FAILED TO WRITE PLAYERCACHE: ", err);
                }
            });
        } else if (err === null) {
            playerInfo = JSON.parse(data.toString('utf8'));

            let missingPlayer = false;
            for (let i in playerIds) {
                if (playerInfo[playerIds[i]] === undefined) {
                    let playerData = await OPENDOTA_API.getPlayer(playerIds[i]);
                    playerInfo[playerIds[i]] = playerData.profile;

                    missingPlayer = true;
                }
            }

            fs.writeFile('./cache/players.json', JSON.stringify(playerInfo), (err) => {
                if (err) {
                    console.error("FAILED TO WRITE PLAYERCACHE: ", err);
                }
            });
        }
        console.log("PlayerInfo loaded!");
    });
});

bot.on('message', async (msg) => {
    if (msg.content === "check") {
        
        let gamesToCheck: Game[] = [];

        for (let i in playerIds) {
            let pId = playerIds[i];

            let games = await OPENDOTA_API.getPlayerMatches(pId);
            for (let x in games) {
                
                let gameIndex = gamesToCheck.findIndex(game => game.match_id === games[x].match_id);

                if (gameIndex > -1) {
                    gamesToCheck[gameIndex].stack.push({ account_id: pId, hero_id: games[x].hero_id });
                } else {
                    gamesToCheck.push({
                        match_id: games[x].match_id,
                        start_time: new Date(games[x].start_time * 1000),
                        won: games[x].player_slot <= 127 ? games[x].radiant_win : !games[x].radiant_win,
                        party_size: games[x].party_size,
                        stack: [
                            { account_id: pId, hero_id: games[x].hero_id }
                        ]
                    });
                }
            }
            /*
            axios.get(`https://api.opendota.com/api/players/${pId}/recentMatches`).then(resp => {
                let data: paths['/players/{account_id}/recentMatches']['get']['responses']['200']['schema'] = resp.data;
                
                let match = data[1];

                let win = (match.player_slot <= 127 ? match.radiant_win : !match.radiant_win)
                let heroArr = heroInfo.filter(hero => hero.id === match.hero_id);
                let hero = "N/A";
                if (heroArr.length > 0) {
                    hero = heroArr[0].localized_name;
                }

                const message: Discord.MessageEmbed = new Discord.MessageEmbed()
                    .setColor(win ? '#10ff00' : '#ff5e00')
                    .setTitle(`${win ? 'Win' : 'Loss'} detected!`)
                    .setDescription(`Pleb [${playerInfo[pId].personaname}](https://www.opendota.com/players/${pId}) ${win ? 'won' : 'lost'} as ${hero}!`)
                    .addFields(
                        { name: "More info", value: "Check [OpenDota](https://www.opendota.com/matches/" + match.match_id + ") ([parse replay](https://www.opendota.com/request#" + match.match_id + ")) or check [DotaBuff](https://www.dotabuff.com/matches/" + match.match_id + ")" }
                    )
                    .setTimestamp(new Date(match.start_time * 1000));
                
                msg.channel.send(message);
            });
            */
        }
        console.log(gamesToCheck);
    }
});

bot.login(process.env.TOKEN);


interface Game {
    match_id: number
    start_time: Date //(new Date(start_time * 1000))
    won: boolean //(player_slot <= 127 ? radiant_win : !radiant_win))
    party_size: number
    stack: GameParticipant[]
}

interface GameParticipant {
    account_id: number,
    hero_id: number
}