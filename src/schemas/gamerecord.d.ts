/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Schema describing expected response of a game script to an 'archive' request. The structure is modelled after chess PGN files because many (even most) abstract strategy games can be represented with such notation. Each game will define its own move notation. We chose to go with a JSON schema over raw PGN because there are important games (such as Homeworlds) that don't work well with pure PGN. These reports are the reports of record. Game data is periodically purged from the main databases. Player rankings and ratings are calculated based on these game reports. This format is also being extended so it can be used by other game services. That way we could run a centralized records & ranking service that could work across game platforms.
 */
export interface APGameRecord {
  /**
   * Series of (essentially) name-value pairs that gives the game metadata.
   */
  header: {
    /**
     * A description of exactly what game this report represents.
     */
    game: {
      /**
       * Full name of the game. Needs to be consistent across services, unless some sort of aliasing is provided.
       */
      name: string;
      /**
       * Variants used in this game.
       */
      variants?: string[];
    };
    /**
     * Only provide if part of a formal tournament or event. The 'round' header must also exist.
     */
    event?: string;
    /**
     * Only use when part of a larger formal event. The 'event' header must also exist.
     */
    round?: string;
    /**
     * Where the game took place.
     */
    site: {
      /**
       * For physical games, it should be the location of the game. For online games, use a consistent name for that service so that records can be collated. For Abstract Play games, this should always be 'Abstract Play'.
       */
      name: string;
      /**
       * For online games, provide the unique game identifier for this game on the given site. This should be unique across the entire site. For physical games, you should omit this. When absent, the system will provide a random UUID.
       */
      gameid?: string | number;
    };
    /**
     * Datetime the game started.
     */
    "date-start": string;
    /**
     * Datetime the game ended. Required because the recrank system is not intended to house incomplete records.
     */
    "date-end": string;
    /**
     * The datetime this report was last generated/updated.
     */
    "date-generated": string;
    /**
     * Set to true to explicitly flag a record as 'unrated'
     */
    unrated?: boolean;
    /**
     * List of the players and their userids and final scores. They should be listed in seating order (first player, then second player, etc.). Additional properties are accepted, so feel free to include information specifically relevant to a particular game. Any additional properties should be provided consistently for any reports from that site for that game.
     */
    players: [
      {
        /**
         * User's name as of the time the game was archived.
         */
        name: string;
        /**
         * User's unique identifier on the `site` indicated. Optional, but if not provided, the game cannot be rated.
         */
        userid?: string;
        /**
         * Where applicable, give the player's score.
         */
        score?: number;
        /**
         * This field flags a player as being an AI.
         */
        is_ai?: boolean;
        /**
         * This is how the system determines who won. Each player should be given a number. Players who share the same number are scored as tied in their bracket. Higher numbers indicate 'more winning' players (e.g., a group of players with a result of 2 are considered as having beat any group of players with a result of less than 2). For two-player games, stick with convention: winners are given a result of 1 and losers are given a result of 0 (though the exact number is insignificant; you could just as easily give them a result of 100 and 3; what matters are the relative magnitudes). For a two-player draw, just give each player the same number. For games with more than two players, group and order them in whatever way makes sense for your game. The recranks system will have certain default behaviours and will also be tailored for specific games where necessary.
         */
        result: number;
        [k: string]: unknown;
      },
      ...{
        /**
         * User's name as of the time the game was archived.
         */
        name: string;
        /**
         * User's unique identifier on the `site` indicated. Optional, but if not provided, the game cannot be rated.
         */
        userid?: string;
        /**
         * Where applicable, give the player's score.
         */
        score?: number;
        /**
         * This field flags a player as being an AI.
         */
        is_ai?: boolean;
        /**
         * This is how the system determines who won. Each player should be given a number. Players who share the same number are scored as tied in their bracket. Higher numbers indicate 'more winning' players (e.g., a group of players with a result of 2 are considered as having beat any group of players with a result of less than 2). For two-player games, stick with convention: winners are given a result of 1 and losers are given a result of 0 (though the exact number is insignificant; you could just as easily give them a result of 100 and 3; what matters are the relative magnitudes). For a two-player draw, just give each player the same number. For games with more than two players, group and order them in whatever way makes sense for your game. The recranks system will have certain default behaviours and will also be tailored for specific games where necessary.
         */
        result: number;
        [k: string]: unknown;
      }[]
    ];
    /**
     * Some games have variable starting conditions (like Alien City). This string should describe that position.
     */
    startingPosition?: string;
  };
  /**
   * The list of moves, including possible commentary. Each entry represents a game round (one turn for each player).
   */
  moves: (
    | null
    | string
    | {
        /**
         * For those rare situations where turn order changes a lot and you need to specify the order the moves took place during the round (it differed from the seating order), add simple integers to show the sequence of moves that round.
         */
        sequence?: number;
        /**
         * The text notation of the move itself. May be multi-line (as in Homeworlds) or any format appropriate for your game.
         */
        move: string;
        /**
         * Optional. It sometimes makes sense to express the result of the move for human readers (e.g., points gained, player elimination). Express it here as a string, or see the [Move Result schema](https://www.abstractplay.com/schemas/moveresults/1-0-0.json#) contained in the `gameslib` repository.
         */
        result?:
          | string
          | {
              [k: string]: unknown;
            }[];
      }
  )[][];
}
