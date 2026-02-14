# ChatRoom - Real-Time Multi-User Chat

A simple chat app where people can create rooms and chat with each other in real-time. Built with plain HTML, CSS, JavaScript and Node.js - no complicated frameworks!

Works locally or deployed on the cloud with persistent data storage using Redis.

## What Does It Do?

- Create a chat room with an auto-generated or custom room code
- Share the code with friends to let them join
- All users see messages instantly
- See who's typing
- See all members in the room with their avatars
- Creator can close the room anytime
- Data persists even if server restarts (with Redis)

## How To Use It

### Step 1: Install Dependencies
```bash
cd chatroom
npm install
```

### Step 2: Set Up Environment Variables
Create a `.env` file in the project root:
```
REDIS_URL=your_redis_url
```

For **local testing**, you can use:
- A local Redis instance (if you have Redis installed), OR
- Skip the .env file and add `REDIS_URL` before running the server

For **production**, use Upstash Redis (see Deployment section below).

### Step 3: Start the Server
```bash
node server.js
```
The server starts at **http://localhost:3000**

### Step 4: Open in Browser
- Open `http://localhost:3000` in your web browser
- On your phone or another device, use `http://your-computer-ip:3000`

### Step 5: Create a Room
- Enter your name
- Click "Create Room"
- You'll get a room code - share it with friends!

### Step 6: Join a Room
- Friend enters their name
- Clicks "Join Room" tab
- Enters the room code
- They're now in the chat!

### Step 7: Start Chatting
- Type message and press Enter
- Others see it instantly
- You can see who's typing
- Use mobile members button to see people in the room

## How The Logic Works (Simple Explanation)

### The Basic Flow

1. **Frontend (Browser)** - What you see
   - Home page to create/join rooms
   - Chat page where you type and see messages
   - Shows member list and typing indicators

2. **Backend (Server)** - What runs in the background
   - Stores all active rooms in Redis (a fast database)
   - Keeps track of who's in each room
   - Stores the messages in Redis
   - Sends updates to everyone when something changes

3. **Database (Redis)** - Where data is saved
   - Keeps room information even if the server restarts
   - Stores messages, users, events, and typing info
   - Cloud version (Upstash) means your data stays safe in the cloud

4. **Communication** - How they talk to each other
   - Browser asks server "what's new?" every 200 milliseconds (polling)
   - Server responds with new messages, members joining/leaving, typing indicators
   - Browser updates the screen instantly

### What Happens When You Send a Message

```
1. You type and click Send
   ↓
2. Browser sends message to server
   ↓
3. Server saves it and broadcasts to everyone in the room
   ↓
4. All browsers get the update and show the message
   ↓
5. Your typing indicator disappears automatically
```

### Room Creation

```
You click "Create Room"
   ↓
Server creates a unique room code (ABC123 or your custom code)
   ↓
Server saves the room with you as the creator
   ↓
You can now receive messages and share the code
```

### Joining a Room

```
You enter room code and click "Join"
   ↓
Server checks if room exists
   ↓
Server adds you to the room members list
   ↓
You can now see all previous messages and chat
```

### Closing a Room

```
Creator clicks "Close Room"
   ↓
Server marks room as inactive
   ↓
Sends message to all members "Room closed"
   ↓
Everyone gets kicked out and goes back to home page
```

## File Structure

```
chatroom/
├── server.js         - The backend server (connects to Redis)
├── index.html        - The entire frontend (HTML + styling + JavaScript)
├── package.json      - Project info and dependencies
├── package-lock.json - Locked dependency versions (auto-generated)
├── .env              - Environment variables (your Redis URL) - Not in git!
├── .gitignore        - Files to ignore in Git (protects .env)
└── README.md         - This file
```

## How Each File Works

### server.js (The Backend)
- Listens for connections on port 3000
- Connects to Redis database using the URL from `.env`
- Stores all rooms, users, messages, and events in Redis
- Has async functions to:
  - Create/join rooms
  - Send/receive messages
  - Add/remove members
  - Track typing
  - Keep members alive with heartbeat
- Data persists even if the server restarts

### index.html (The Frontend)
- Home screen: Create or join rooms
- Chat screen: Shows messages, members, typing indicators
- Works on desktop and mobile
- Automatically asks server for updates every 200ms
- Shows everything in real-time

### .env (Environment Variables)
- Contains sensitive information (your Redis URL)
- Never shared on Git (see .gitignore)
- Loaded automatically when server starts

## Special Features Explained

### Message Limit (500 messages per room)
- When a room gets crowded, old messages are removed to save database space
- Keeps the app running smoothly and data transfers fast
- Newest 500 messages are always kept

### Typing Indicators
- Automatically shows when someone starts typing
- Disappears after 2 seconds if they stop typing
- Clears when the message is sent

### Heartbeat (Every 15 seconds)
- Browser checks if still connected to server
- If no heartbeat for 60 seconds, you're kicked out
- Prevents "zombie" connections
- Data cleaned up in Redis database

### Mobile Responsive
- On mobile: Members button appears to view members in a popup
- On desktop: Members panel always shows on the right
- Buttons and text resize automatically

### Message Styling
- Your messages appear on the right (right-aligned)
- Others' messages appear on the left
- Creator's messages have a gold border to show they're in charge

### Data Persistence
- All messages, rooms, and user data saved in Redis
- Survives server restarts
- Data expires after room is closed (cleanup job runs every 10 seconds)

## Requirements to Run

**Locally:**
- Node.js installed (version 14 or higher)
- A web browser (Chrome, Firefox, Safari, Edge, etc.)
- Redis running (local or cloud - see below)

**Packages installed via npm:**
- `redis` - Database connection
- `dotenv` - Environment variables loading

## Environment Variables

Create a `.env` file in your project root:

```
REDIS_URL=your-redis-url-here
```

**For local testing:**
- If you have Redis installed locally: `REDIS_URL=redis://localhost:6379`
- Or use the default fallback in the code

**For production (Render deployment):**
- Use Upstash Redis (serverless Redis)
- Get your URL from Upstash console
- Add it to Render's environment variables dashboard

## Deployment on Render

### Step 1: Prepare for Deployment
1. Make sure your code is in a Git repository
2. Commit all changes including `.gitignore` and `package.json`
3. **Don't commit** `.env` (it's in `.gitignore`)

### Step 2: Set Up Redis on Upstash
1. Go to [upstash.com](https://upstash.com)
2. Create a free Redis database
3. Copy your Redis URL (looks like: `rediss://default:xxxxx@xxxx.upstash.io:6379`)

### Step 3: Deploy on Render
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Fill in:
   - **Name:** chatroom
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click "Advanced" and add Environment Variable:
   - **Key:** `REDIS_URL`
   - **Value:** (paste your Upstash Redis URL)
6. Click "Create Web Service"

### Step 4: Access Your App
- Render will give you a URL like: `https://chatroom-xxx.onrender.com`
- Share this with friends!
- Your app now runs 24/7 in the cloud

**Note:** Render's free tier might go to sleep if inactive for 15+ minutes. Upgrade to a paid plan to keep it always running.

## Troubleshooting

**"Can't connect to server"**
- Make sure you ran `node server.js`
- Check if you're using the correct IP address
- Try `http://localhost:3000`

**"Room not found"**
- Room code might be wrong
- Make sure it's uppercase
- Room might be closed

**"Messages not showing"**
- Refresh your browser
- Rejoin the room
- Check the browser console (F12) for errors

## What's Cool About This App

✅ No databases to manage locally - Redis in the cloud  
✅ No fancy frameworks - just plain JavaScript  
✅ Responds instantly (like you're all in the same app)  
✅ Works on mobile and desktop  
✅ Data persists even if server crashes (thanks to Redis)
✅ Can deploy to the cloud in minutes (Render + Upstash)  
✅ You can customize the code easily  
✅ Super lightweight and fast  
✅ Free hosting options available

---

**Made simple. Works great. Deploys easily. 💬**

