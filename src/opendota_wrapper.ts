import { paths } from './schema';
import axios from 'axios';

export const OPENDOTA_API = {

    getHeroes: async () => {
        return await axios.get(`https://api.opendota.com/api/heroes`).then(resp => {
            return (resp.data as paths['/heroes']['get']['responses']['200']['schema']);
        });
    },

    getPlayer: async (account_id: number) => {
        return await axios.get(`https://api.opendota.com/api/players/${account_id}`).then(resp => {
            return (resp.data as paths['/players/{account_id}']['get']['responses']['200']['schema']);
        });
    },

    getPlayerMatches: async (account_id: number, daysOfHistory: number = 2) => {
        return await axios.get(`https://api.opendota.com/api/players/${account_id}/matches?date=${daysOfHistory}`).then(resp => {
            return (resp.data as paths['/players/{account_id}/matches']['get']['responses']['200']['schema']);
        });
    }

};