# Chinese Card Game - Multiplayer Casino Game

## Overview

This is a multiplayer Chinese card game where players compete to get rid of all their cards first. The game features:

- **Card Hierarchy**: 3 is the smallest, 2 is the biggest (3 < 4 < 5 < ... < 10 < J < Q < K < A < 2)
- **Jokers**: Two jokers per deck that can substitute for any card
- **Combinations**: Single cards, doubles, triplets, and bombs (4 of a kind)
- **Bombs**: Can beat any combination, but can be beaten by bigger bombs
- **Multiplayer**: 2-4 players per game
- **Real-time**: Uses Socket.IO for real-time updates
- **Betting**: Players bet pounds to join games

## Game Rules

1. **Objective**: Be the first player to get rid of all your cards
2. **Dealing**: Each player gets 25 cards (2 players) or cards are distributed evenly (3-4 players)
3. **Gameplay**: 
   - Players take turns clockwise
   - First player can play any valid combination
   - Subsequent players must match the combination type and beat the value
   - Players can pass their turn
   - Bombs can beat any combination
4. **Valid Combinations**:
   - Single card
   - Double (two same cards)
   - Triplet (three same cards)
   - Bomb (four same cards)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Socket.IO Server

In one terminal, start the game server:

```bash
npm run server
```

The server will run on port 3001.

### 3. Start the Next.js Development Server

In another terminal, start the main application:

```bash
npm run dev
```

The application will run on port 3000.

### 4. Access the Game

1. Navigate to `http://localhost:3000`
2. Log in to your account
3. Go to the Casino section
4. Click on "Chinese Card Game"
5. Create a new game or join an existing one

## How to Play

### Creating a Game

1. Set your bet amount (minimum £0.50, maximum £100)
2. Click "Create Game"
3. Share the Game ID with other players
4. Wait for players to join
5. Click "Ready to Play" when you're ready
6. Game starts when all players are ready

### Joining a Game

1. **Join Available Games**: See a list of open games and click "Join Game"
2. **Join by Game ID**: Enter a specific Game ID and click "Join"

### During the Game

1. **Your Turn**: Select cards from your hand by clicking on them
2. **Play Cards**: Click "Play Cards" to play your selected combination
3. **Pass**: Click "Pass" to skip your turn
4. **Winning**: First player to play all their cards wins the pot

## Technical Details

### Architecture

- **Frontend**: Next.js with React
- **Backend**: Socket.IO server for real-time communication
- **Database**: Firebase Firestore for game state persistence
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS with Framer Motion animations

### Key Files

- `pages/casino/cardgame.js` - Main game component
- `server.js` - Socket.IO server
- `src/lib/firebase.js` - Firebase configuration
- `pages/casino.js` - Casino lobby with game selection

### Game States

1. **Lobby**: Players can create or join games
2. **Waiting**: Players are in a game room, waiting for others to join
3. **Playing**: Active game in progress
4. **Finished**: Game completed, winner declared

### Real-time Features

- Live game updates via Socket.IO
- Player join/leave notifications
- Real-time card plays
- Automatic turn management
- Game state synchronization

## Troubleshooting

### Common Issues

1. **Server not running**: Make sure to start the Socket.IO server with `npm run server`
2. **Connection errors**: Check that both servers are running on the correct ports
3. **Game not starting**: Ensure all players have clicked "Ready to Play"
4. **Cards not updating**: Refresh the page if real-time updates stop working

### Development Notes

- The game uses Firebase Firestore for persistence
- Socket.IO handles real-time communication
- Game state is synchronized between all players
- Bet amounts are deducted when joining games
- Winners receive the total pot (bet amount × number of players)

## Future Enhancements

- Chat functionality between players
- Game history and statistics
- Tournament mode
- Custom game rules
- Spectator mode
- Mobile responsiveness improvements
