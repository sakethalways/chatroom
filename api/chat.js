import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.REDIS_URL;

let redis;
try {
  if (!REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set');
  }
  
  // Convert TCP format (rediss://) to REST format (https://)
  let restUrl, token;
  
  if (REDIS_URL.startsWith('rediss://')) {
    // Parse rediss://default:TOKEN@HOST:6379
    const match = REDIS_URL.match(/rediss:\/\/default:(.+)@(.+):\d+/);
    if (!match) {
      throw new Error('Invalid REDIS_URL format');
    }
    token = match[1];
    const host = match[2];
    restUrl = `https://${host}`;
  } else if (REDIS_URL.startsWith('https://')) {
    // Already in REST format
    restUrl = REDIS_URL;
    // Token might be embedded or needs to be extracted
    const tokenMatch = REDIS_URL.match(/token=(.+?)(?:&|$)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  } else {
    throw new Error('REDIS_URL must start with rediss:// or https://');
  }
  
  redis = new Redis({
    url: restUrl,
    token: token,
    autoResetTtl: true
  });
} catch (error) {
  console.error('Redis initialization error:', error.message);
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#20B2AA', '#FFB6C1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function pushEvent(userId, event) {
  try {
    await redis.lpush(`events:${userId}`, JSON.stringify(event));
  } catch (e) {
    console.error('Error pushing event:', e);
  }
}

async function broadcastToRoom(roomId, event, excludeUserId = null) {
  try {
    const userIds = await redis.smembers(`room:${roomId}:users`);
    
    if (userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        if (excludeUserId && userId === excludeUserId) continue;
        await pushEvent(userId, event);
      }
    }
  } catch (e) {
    console.error('Error broadcasting:', e);
  }
}

async function handleCreateRoom(body) {
  try {
    const { userName, roomId: customRoomId } = JSON.parse(body);
    
    if (!userName || userName.length < 1 || userName.length > 50) {
      return { success: false, error: 'Invalid username' };
    }
    
    let roomId;
    
    if (customRoomId && customRoomId !== 'AUTO_GENERATE') {
      if (!/^[A-Z0-9]{3,20}$/.test(customRoomId)) {
        return { success: false, error: 'Room code must be 3-20 alphanumeric characters (uppercase)' };
      }
      
      const exists = await redis.exists(`rooms:${customRoomId}`);
      if (exists) {
        return { success: false, error: 'Room code already exists. Please choose another.' };
      }
      
      roomId = customRoomId;
    } else {
      roomId = generateRoomId();
    }
    
    const userId = generateId('user');
    const userColor = getRandomColor();
    const now = Date.now();
    
    await redis.hset(`rooms:${roomId}`, {
      id: roomId,
      creatorId: userId,
      creatorName: userName,
      createdAt: now.toString()
    });
    
    await redis.hset(`user:${userId}`, {
      id: userId,
      name: userName,
      color: userColor,
      roomId: roomId,
      isCreator: 'true',
      joinedAt: now.toString(),
      lastHeartbeat: now.toString()
    });
    
    await redis.sadd(`room:${roomId}:users`, userId);
    
    // Send connected event with room state to the creator
    await pushEvent(userId, {
      type: 'connected',
      roomId: roomId,
      userId: userId,
      userName: userName,
      roomUsers: [{
        id: userId,
        name: userName,
        color: userColor,
        isCreator: true
      }],
      messages: []
    });
    
    return {
      success: true,
      roomId: roomId,
      userId: userId,
      userName: userName,
      userColor: userColor,
      isCreator: true
    };
  } catch (e) {
    console.error('Create room error:', e);
    return { success: false, error: e.message || 'Failed to create room' };
  }
}

async function handleJoinRoom(body) {
  try {
    const { roomId, userName } = JSON.parse(body);
    
    if (!roomId || !userName) {
      return { success: false, error: 'Room ID and username required' };
    }
    
    if (userName.length < 1 || userName.length > 50) {
      return { success: false, error: 'Invalid username' };
    }
    
    const room = await redis.hgetall(`rooms:${roomId}`);
    if (!room || !room.id) {
      return { success: false, error: 'Room not found' };
    }
    
    const userId = generateId('user');
    const userColor = getRandomColor();
    const now = Date.now();
    
    await redis.hset(`user:${userId}`, {
      id: userId,
      name: userName,
      color: userColor,
      roomId: roomId,
      isCreator: 'false',
      joinedAt: now.toString(),
      lastHeartbeat: now.toString()
    });
    
    await redis.sadd(`room:${roomId}:users`, userId);
    
    // Get all users in room
    const userIds = await redis.smembers(`room:${roomId}:users`);
    const roomUsers = [];
    if (userIds && Array.isArray(userIds)) {
      for (const uId of userIds) {
        const u = await redis.hgetall(`user:${uId}`);
        if (u && u.id) {
          roomUsers.push({
            id: u.id,
            name: u.name,
            color: u.color,
            isCreator: u.isCreator === 'true'
          });
        }
      }
    }
    
    // Get all messages in room (in correct order - oldest first)
    const messagesList = await redis.lrange(`room:${roomId}:messages`, 0, -1);
    const messages = [];
    if (messagesList && Array.isArray(messagesList)) {
      for (const msg of messagesList) {
        try {
          messages.push(JSON.parse(msg));
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      }
    }
    
    // Send connected event to new user with room state
    await pushEvent(userId, {
      type: 'connected',
      roomId: roomId,
      userId: userId,
      userName: userName,
      roomUsers: roomUsers,
      messages: messages
    });
    
    // Broadcast user joined event to all OTHER users (exclude the joiner)
    await broadcastToRoom(roomId, {
      type: 'user_joined_room',
      userId: userId,
      userName: userName,
      userColor: userColor,
      roomUsers: roomUsers
    }, userId);
    
    return {
      success: true,
      roomId: roomId,
      userId: userId,
      userName: userName,
      userColor: userColor,
      isCreator: false
    };
  } catch (e) {
    console.error('Join room error:', e);
    return { success: false, error: e.message || 'Failed to join room' };
  }
}

async function handleLeaveRoom(body) {
  try {
    const { userId, roomId } = JSON.parse(body);
    
    const user = await redis.hgetall(`user:${userId}`);
    if (!user || user.roomId !== roomId) {
      return { success: true };
    }
    
    // Check if user is creator
    const isCreator = user.isCreator === 'true';
    
    if (isCreator) {
      // Creator left - close room and notify all users
      const allUserIds = await redis.smembers(`room:${roomId}:users`);
      if (allUserIds && Array.isArray(allUserIds)) {
        for (const uId of allUserIds) {
          await pushEvent(uId, {
            type: 'creator_left',
            creatorName: user.name
          });
        }
      }
      await redis.del(`rooms:${roomId}`);
      await redis.del(`room:${roomId}:users`);
      await redis.del(`room:${roomId}:messages`);
    } else {
      // Regular user left - update room and notify others
      await redis.srem(`room:${roomId}:users`, userId);
      
      // Get remaining users
      const userIds = await redis.smembers(`room:${roomId}:users`);
      const roomUsers = [];
      if (userIds && Array.isArray(userIds)) {
        for (const uId of userIds) {
          const u = await redis.hgetall(`user:${uId}`);
          if (u && u.id) {
            roomUsers.push({
              id: u.id,
              name: u.name,
              color: u.color,
              isCreator: u.isCreator === 'true'
            });
          }
        }
      }
      
      // Broadcast user left event (including to existing users)
      await broadcastToRoom(roomId, {
        type: 'user_left_room',
        userName: user.name,
        roomUsers: roomUsers
      });
    }
    
    await redis.del(`user:${userId}`);
    await redis.del(`events:${userId}`);
    
    return { success: true };
  } catch (e) {
    console.error('Leave room error:', e);
    return { success: false, error: e.message || 'Failed to leave room' };
  }
}

async function handleSendMessage(body) {
  try {
    const { userId, roomId, content, text } = JSON.parse(body);
    const messageContent = content || text;
    
    if (!messageContent || messageContent.length < 1 || messageContent.length > 500) {
      return { success: false, error: 'Invalid message' };
    }
    
    const user = await redis.hgetall(`user:${userId}`);
    if (!user || user.roomId !== roomId) {
      return { success: false, error: 'Not in room' };
    }
    
    const message = {
      id: generateId('msg'),
      senderId: userId,
      senderName: user.name,
      senderColor: user.color,
      content: messageContent,
      timestamp: Date.now(),
      isCreator: user.isCreator === 'true'
    };
    
    await redis.rpush(`room:${roomId}:messages`, JSON.stringify(message));
    
    // Broadcast to all users in room (including the sender)
    await broadcastToRoom(roomId, {
      type: 'message_received',
      id: message.id,
      senderId: userId,
      senderName: user.name,
      senderColor: user.color,
      content: messageContent,
      timestamp: message.timestamp,
      isCreator: user.isCreator === 'true'
    });
    
    return { success: true };
  } catch (e) {
    console.error('Send message error:', e);
    return { success: false, error: e.message || 'Failed to send message' };
  }
}

async function handleTyping(body) {
  try {
    const { userId, roomId } = JSON.parse(body);
    
    const user = await redis.hgetall(`user:${userId}`);
    if (!user || user.roomId !== roomId) {
      return { success: false, error: 'Not in room' };
    }
    
    await broadcastToRoom(roomId, {
      type: 'user_typing',
      userId: userId,
      userName: user.name
    }, userId);
    
    return { success: true };
  } catch (e) {
    console.error('Typing error:', e);
    return { success: false, error: e.message || 'Failed to send typing status' };
  }
}

async function handleHeartbeat(body) {
  try {
    const { userId, roomId } = JSON.parse(body);
    
    const user = await redis.hgetall(`user:${userId}`);
    if (!user || user.roomId !== roomId) {
      return { success: false, error: 'Not in room' };
    }
    
    const now = Date.now().toString();
    await redis.hset(`user:${userId}`, { lastHeartbeat: now });
    
    return { success: true };
  } catch (e) {
    console.error('Heartbeat error:', e);
    return { success: false, error: e.message || 'Failed to send heartbeat' };
  }
}

async function handlePoll(userId, roomId) {
  try {
    const user = await redis.hgetall(`user:${userId}`);
    
    if (!user || !user.id || user.roomId !== roomId) {
      return { events: [], error: 'Not in room' };
    }
    
    const events = await redis.lrange(`events:${userId}`, 0, -1);
    await redis.del(`events:${userId}`);
    
    return { events: events && Array.isArray(events) ? events.map(e => typeof e === 'string' ? JSON.parse(e) : e) : [] };
  } catch (e) {
    console.error('Poll error:', e);
    return { events: [] };
  }
}

async function handleGetRoomInfo(roomId) {
  try {
    const room = await redis.hgetall(`rooms:${roomId}`);
    if (!room || !room.id) {
      return { success: false, error: 'Room not found' };
    }
    
    const userIds = await redis.smembers(`room:${roomId}:users`);
    const users = [];
    
    if (userIds && Array.isArray(userIds)) {
      for (const uId of userIds) {
        const u = await redis.hgetall(`user:${uId}`);
        if (u && u.id) {
          users.push({
            id: u.id,
            name: u.name,
            color: u.color,
            isCreator: u.isCreator === 'true',
            joinedAt: parseInt(u.joinedAt)
          });
        }
      }
    }
    
    const messages = await redis.llen(`room:${roomId}:messages`);
    
    return {
      success: true,
      room: {
        id: room.id,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        usersCount: userIds ? userIds.length : 0,
        users: users,
        messageCount: messages || 0,
        createdAt: parseInt(room.createdAt)
      }
    };
  } catch (e) {
    console.error('Get room info error:', e);
    return { success: false, error: e.message || 'Failed to get room info' };
  }
}

async function handleRefreshRoomState(userId, roomId) {
  try {
    const user = await redis.hgetall(`user:${userId}`);
    if (!user || user.roomId !== roomId) {
      return { success: false, error: 'Not in room' };
    }
    
    // Get current room state
    const userIds = await redis.smembers(`room:${roomId}:users`);
    const roomUsers = [];
    if (userIds && Array.isArray(userIds)) {
      for (const uId of userIds) {
        const u = await redis.hgetall(`user:${uId}`);
        if (u && u.id) {
          roomUsers.push({
            id: u.id,
            name: u.name,
            color: u.color,
            isCreator: u.isCreator === 'true'
          });
        }
      }
    }
    
    // Get all messages
    const messagesList = await redis.lrange(`room:${roomId}:messages`, 0, -1);
    const messages = [];
    if (messagesList && Array.isArray(messagesList)) {
      for (const msg of messagesList) {
        try {
          messages.push(JSON.parse(msg));
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      }
    }
    
    return {
      success: true,
      roomUsers: roomUsers,
      messages: messages
    };
  } catch (e) {
    console.error('Refresh room state error:', e);
    return { success: false, error: e.message || 'Failed to refresh room state' };
  }
}

async function handleStatus() {
  try {
    const roomKeys = await redis.keys('rooms:*');
    const userKeys = await redis.keys('user:*');
    
    let totalMessages = 0;
    if (roomKeys && Array.isArray(roomKeys)) {
      for (const roomKey of roomKeys) {
        const roomId = roomKey.replace('rooms:', '');
        const count = await redis.llen(`room:${roomId}:messages`);
        totalMessages += count || 0;
      }
    }
    
    return {
      success: true,
      status: {
        activeRooms: roomKeys ? roomKeys.length : 0,
        totalUsers: userKeys ? userKeys.length : 0,
        totalMessages: totalMessages,
        timestamp: Date.now()
      }
    };
  } catch (e) {
    console.error('Status error:', e);
    return { success: false, error: e.message || 'Failed to get status' };
  }
}

async function handleDebug() {
  return {
    redisConfigured: !!redis,
    redisUrlSet: !!REDIS_URL,
    redisUrlPrefix: REDIS_URL ? REDIS_URL.substring(0, 20) + '...' : 'NOT SET',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'unknown'
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (!redis) {
    console.error('Redis not configured');
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }
  
  try {
    if (req.method === 'POST') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = data.action;
      let response;
      
      switch (action) {
        case 'create_room':
          response = await handleCreateRoom(JSON.stringify(data));
          break;
        case 'join_room':
          response = await handleJoinRoom(JSON.stringify(data));
          break;
        case 'send_message':
          response = await handleSendMessage(JSON.stringify(data));
          break;
        case 'leave_room':
          response = await handleLeaveRoom(JSON.stringify(data));
          break;
        case 'typing':
          response = await handleTyping(JSON.stringify(data));
          break;
        case 'heartbeat':
          response = await handleHeartbeat(JSON.stringify(data));
          break;
        default:
          response = { success: false, error: 'Unknown action' };
      }
      
      return res.status(200).json(response);
    } else if (req.method === 'GET') {
      const action = req.query.action;
      let response;
      
      switch (action) {
        case 'poll':
          response = await handlePoll(req.query.userId, req.query.roomId);
          break;
        case 'get_room_info':
          response = await handleGetRoomInfo(req.query.roomId);
          break;
        case 'refresh_room_state':
          response = await handleRefreshRoomState(req.query.userId, req.query.roomId);
          break;
        case 'status':
          response = await handleStatus();
          break;
        case 'debug':
          response = await handleDebug();
          break;
        default:
          response = { success: false, error: 'Unknown action' };
      }
      
      return res.status(200).json(response);
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
  
  res.status(404).json({ error: 'Not found' });
}
