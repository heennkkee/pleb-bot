import dotenv from 'dotenv';
import Discord from 'discord.js';

import { OPENDOTA_API } from './opendota_wrapper';

import fs from 'fs';

import express from 'express';

import schedule from 'node-schedule';

dotenv.config();

let publicationChannel;

const job = schedule.scheduleJob('*/5 * * * *', async () => {
    let newGames = await checkForUnpublishedGames();
    if (newGames.length > 0) {

        for (let i in newGames) {
            let game = newGames[i];
            let message = formatGameForPublication(game);
            publicationChannel.send(message);
            publishedMatches.push(game);
        }
        
        updateMatchesCache();
    
    } else {
        console.log("Checked for new games, but nothing found");
    }
});

const app = express();

app.get('/matches/unpublished', async (req, res) => {
    let games = await checkForUnpublishedGames();
    res.json(games);
});

app.get('/heroes', async (req, res) => {
    res.json(heroInfo);
});

app.get('/players', async (req, res) => {
    res.json(playerInfo);
});

app.get('/matches/published', async (req, res) => {
    res.json(publishedMatches);
})

app.listen(3000);


const bot = new Discord.Client();

const playerIds = [
    76573026,
    124579759,
    69564590,
    10015261
];


let playerInfo = {};
let heroInfo = [];

let publishedMatches: Game[] = [];

bot.on('ready', async () => {
    console.log("Bot is connected!");
    let channel = await bot.channels.fetch('828642317422428197');
    if (channel != undefined) {
        publicationChannel = channel;
    }
});

const formatGameForPublication = (game: Game) => {
    let descr = `${game.won ? 'Senpai' : 'Weeb'}${game.party_size > 1 ? 's' : ''} `;
    let playerDescr = [];
    for (let j in game.stack) {
        let heroArr = heroInfo.filter(x => x.id === game.stack[j].hero_id);
        let hero = "N/A";
        if (heroArr.length > 0) {
            hero = heroArr[0].localized_name;
        }
        playerDescr.push(`[${playerInfo[game.stack[j].account_id].personaname}](https://www.opendota.com/players/${[game.stack[j].account_id]}) (${hero})`);
    }
    descr += `${playerDescr.join(', ')} ${game.won ? 'won' : 'UwU:d'} a game.`; 
    const message: Discord.MessageEmbed = new Discord.MessageEmbed()
        .setColor(game.won ? '#10ff00' : '#ff5e00')
        .setTitle(`${game.won ? 'Win' : 'UwU'} detected`)
        .setDescription(descr)
        .addFields(
            { name: "More info", value: "Check [OpenDota](https://www.opendota.com/matches/" + game.match_id + ") or [DotaBuff](https://www.dotabuff.com/matches/" + game.match_id + ") for more details about the skirmish." }
        )
        .setTimestamp(game.end_time);

    return message;
}

const updateMatchesCache = () => {
    fs.writeFile('./cache/matches.json', JSON.stringify(publishedMatches), (err) => {
        if (err) {
            console.log("Failed to write to matches cache", err);
        }
    });
}

bot.on('message', async (msg) => {
    if (msg.content === "check") {
        let newGames = await checkForUnpublishedGames();
        if (newGames.length > 0) {

            for (let i in newGames) {
                let game = newGames[i];
                let message = formatGameForPublication(game);
                msg.channel.send(message);
                publishedMatches.push(game);
            }
            
            updateMatchesCache();
        
        } else {
            msg.channel.send("No new matches found");
        }
    }
});

const checkForUnpublishedGames = async () => {
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
                    end_time: new Date(games[x].start_time * 1000 + games[x].duration * 1000),
                    won: games[x].player_slot <= 127 ? games[x].radiant_win : !games[x].radiant_win,
                    party_size: games[x].party_size,
                    stack: [
                        { account_id: pId, hero_id: games[x].hero_id }
                    ]
                });
            }
        }
    }

    gamesToCheck = gamesToCheck.sort((a, b) => (a.end_time >= b.end_time) ? 1 : -1);

    return gamesToCheck.filter(game => publishedMatches.findIndex(publishedGame => publishedGame.match_id === game.match_id) === -1);
}

bot.login(process.env.TOKEN);

fs.readFile('./cache/matches.json', (err, data) => {
    if (err) {
        console.log("No matches present in cache");
    } else {
        console.log("Published matches loaded from cache");
        publishedMatches = JSON.parse(data.toString('utf8'));
    }
});


fs.readFile('./cache/heroes.json', async (err, data) => {
    if (err !== null && err.errno === -2) { //no such file
        console.log("loading hero info via API")
        let heroes = await OPENDOTA_API.getHeroes();
        heroInfo = heroes;
        fs.writeFile('./cache/heroes.json', JSON.stringify(heroInfo), (err) => {
            if (err) {
                console.error("FAILED TO WRITE HEROCACHE: ", err);
            }
        });
    } else if (err === null) {
        console.log("loading hero info from cache")
        heroInfo = JSON.parse(data.toString('utf8'));
    }
    console.log("HeroInfo loaded!");
});

fs.readFile('./cache/players.json', async (err, data) => {
    if (err !== null && err.errno === -2) { //no such file
        console.log("loading player info via API")
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
        console.log("loading player info from cache")
        playerInfo = JSON.parse(data.toString('utf8'));

        let missingPlayer = false;
        for (let i in playerIds) {
            if (playerInfo[playerIds[i]] === undefined) {
                console.log("missing player " + playerIds[i] + ", loading from API")
                let playerData = await OPENDOTA_API.getPlayer(playerIds[i]);
                playerInfo[playerIds[i]] = playerData.profile;

                missingPlayer = true;
            }
        }
        if (missingPlayer) {
            fs.writeFile('./cache/players.json', JSON.stringify(playerInfo), (err) => {
                if (err) {
                    console.error("FAILED TO WRITE PLAYERCACHE: ", err);
                }
            });
        }
    }
    console.log("PlayerInfo loaded!");
});