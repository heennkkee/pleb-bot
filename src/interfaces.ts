interface Game {
    match_id: number
    end_time: Date //(new Date(start_time * 1000))
    won: boolean //(player_slot <= 127 ? radiant_win : !radiant_win))
    party_size: number
    stack: GameParticipant[]
}

interface GameParticipant {
    account_id: number,
    hero_id: number
}