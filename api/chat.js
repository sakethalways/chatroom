// Vercel Serverless Function - Chat API
// Uses Upstash Redis REST API

const REDIS_URL = process.env.REDIS_URL;

// Parse Redis URL to get token and host
function parseRedisUrl(url) {
  if (!url) throw new Error('REDIS_URL environment variable is not set');
  const match = url.match(/rediss:\/\/default:(.+)@(.+):\d+/);
  if (!match) throw new Error('Invalid REDIS_URL format');
  return {
    token: match[1],
    host: match[2]
  };
}

let UPSTASH_API, AUTH_HEADER;
try {
  const { token, host } = parseRedisUrl(REDIS_URL);
  UPSTASH_API = `https://${host}`;
  AUTH_HEADER = `Bearer ${token}`;
} catch (error) {
  console.error('Startup error:', error.message);
}

// Redis command helper using Upstash REST API
async function redis(command, ...args) {
  try {
    const response = await fetch(`${UPSTASH_API}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER
      },
      body: JSON.stringify([command, ...args])
    });
    
    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Redis error:', error);
    throw error;
  }
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
  await redis('lpush', `events:${userId}`, JSON.stringify(event));
}

async function broadcastToRoom(roomId, event, excludeUserId = null) {
  const userIds = await redis('smembers', `room:${roomId}:users`) || [];
  
  for (const userId of userIds) {
    if (excludeUserId && userId === excludeUserId) continue;
    await pushEvent(userId, event);
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
      
      const exists = await redis('exists', `rooms:${customRoomId}`);
      if (exists) {
        return { success: false, error: 'Room code already exists. Please choose another.' };
      }
      
      roomId = customRoomId;
    } else {
      roomId = generateRoomId();
    }
    
    const userId = generateId('user');
    const color = getRandomColor();
    
    const user = {
      id: userId,
      name: userName,
      color: color,
      roomId: roomId,
      isCreator: 'true',
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isOnline: 'true'
    };
    
    const room = {
      id: roomId,
      creatorId: userId,
      creatorName: userName,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isActive: 'true'
    };
    
    await redis('hset', `rooms:${roomId}`, ...Object.entries(room).flat());
    await redis('hset', `user:${userId}`, ...Object.entries(user).flat());
    await redis('sadd', `room:${roomId}:users`, userId);
    
    await pushEvent(userId, { type: 'connected', roomId, userId, userName, color });
    
    return {
      success: true,
      userId,
      roomId,
      isCreator: true,
      message: 'Room created successfully'
    };
  } catch (e) {
    console.error('Create room error:', e);
    return { success: false, error: 'Failed to create room' };
  }
}

async function handleJoinRoom(body) {
  try {
    const { userName, roomId } = JSON.parse(body);
    
    if (!userName || userName.length < 1 || userName.length > 50) {
      return { success: false, error: 'Invalid username' };
    }
    
    const roomExists = await redis('exists', `rooms:${roomId}`);
    if (!roomExists) {
      return { success: false, error: 'Room not found or closed', status: 404 };
    }
    
    const room = await redis('hgetall', `rooms:${roomId}`);
    if (!room || room.isActive !== 'true') {
      return { success: false, error: 'Room is closed' };
    }
    
    const userId = generateId('user');
    const color = getRandomColor();
    
    const user = {
      id: userId,
      name: userName,
      color: color,
      roomId: roomId,
      isCreator: 'false',
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isOnline: 'true'
    };
    
    await redis('hset', `user:${userId}`, ...Object.entries(user).flat());
    await redis('sadd', `room:${roomId}:users`, userId);
    await redis('hset', `rooms:${roomId}`, 'lastActivity', Date.now());
    
    const userIds = await redis('smembers', `room:${roomId}:users`) || [];
    const roomUsers = [];
    
    for (const uId of userIds) {
      const u = await redis('hgetall', `user:${uId}`);
      if (u && u.id) {
        roomUsers.push({ id: u.id, name: u.name, color: u.color, isCreator: u.isCreator === 'true' });
      }
    }
    
    const messages = await redis('lrange', `room:${roomId}:messages`, 0, -1) || [];
    const parsedMessages = messages.map(m => JSON.parse(m));
    
    await broadcastToRoom(roomId, {
      type: 'user_joined_room',
      userId,
      userName,
      color,
      roomUsers
    }, userId);
    
    await pushEvent(userId, {
      type: 'connected',
      roomId,
      userId,
      userName,
      color,
      roomUsers,
      messages: parsedMessages
    });
    
    return {
      success: true,
      userId,
      roomId,
      isCreator: false,
      usersInRoom: userIds.length,
      message: 'Joined room successfully'
    };
  } catch (e) {
    console.error('Join room error:', e);
    return { success: false, error: 'Failed to join room' };
  }
}

async function handleSendMessage(body) {
  try {
    const { userId, roomId, content } = JSON.parse(body);
    
    if (!content || content.length < 1 || content.length > 500) {
      return { success: false, error: 'Invalid message' };
    }
    
    const now = Date.now();
    const lastMessageTime = await redis('get', `lastMessage:${userId}`);
    const timeSinceLastMessage = lastMessageTime ? now - parseInt(lastMessageTime) : 1000;
    
    if (timeSinceLastMessage < 100) {
      return { success: false, error: 'Message sent too quickly' };
    }
    
    await redis('set', `lastMessage:${userId}`, now);
    
    const room = await redis('hgetall', `rooms:${roomId}`);
    if (!room || !room.id || room.isActive !== 'true') {
      return { success: false, error: 'Room not found' };
    }
    
    const user = await redis('hgetall', `user:${userId}`);
    if (!user || !user.id || user.roomId !== roomId) {
      return { success: false, error: 'Not in this room' };
    }
    
    const message = {
      id: generateId('msg'),
      senderId: userId,
      senderName: user.name,
      senderColor: user.color,
      content: content,
      timestamp: Date.now(),
      roomId: roomId,
      delivered: 'true'
    };
    
    await redis('rpush', `room:${roomId}:messages`, JSON.stringify(message));
    await redis('hset', `rooms:${roomId}`, 'lastActivity', Date.now());
    
    const msgCount = await redis('llen', `room:${roomId}:messages`);
    if (msgCount > 500) {
      await redis('ltrim', `room:${roomId}:messages`, -500, -1);
    }
    
    await broadcastToRoom(roomId, {
      type: 'message_received',
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      senderName: message.senderName,
      senderColor: message.senderColor,
      timestamp: message.timestamp,
      isCreator: user.isCreator
    });
    
    return { success: true, messageId: message.id };
  } catch (e) {
    console.error('Send message error:', e);
    return { success: false, error: 'Failed to send message' };
  }
}

async function handleLeaveRoom(body) {
  try {
    const { userId, roomId } = JSON.parse(body);
    
    const room = await redis('hgetall', `rooms:${roomId}`);
    if (!room || !room.id) {
      return { success: false, error: 'Room not found' };
    }
    
    const user = await redis('hgetall', `user:${userId}`);
    if (!user || !user.id) {
      return { success: false, error: 'User not found' };
    }
    
    if (user.isCreator === 'true') {
      await redis('hset', `rooms:${roomId}`, 'isActive', 'false');
      
      const creatorLeftEvent = {
        type: 'creator_left',
        message: `${room.creatorName} has stopped the room`,
        creatorName: room.creatorName
      };
      
      const userIds = await redis('smembers', `room:${roomId}:users`) || [];
      for (const uId of userIds) {
        await pushEvent(uId, creatorLeftEvent);
      }
      
      await redis('del', `rooms:${roomId}`);
      await redis('del', `room:${roomId}:users`);
      await redis('del', `room:${roomId}:messages`);
    } else {
      await redis('srem', `room:${roomId}:users`, userId);
      
      const userIds = await redis('smembers', `room:${roomId}:users`) || [];
      const roomUsers = [];
      
      for (const uId of userIds) {
        const u = await redis('hgetall', `user:${uId}`);
        if (u && u.id) {
          roomUsers.push({ id: u.id, name: u.name, color: u.color, isCreator: u.isCreator });
        }
      }
      
      await broadcastToRoom(roomId, {
        type: 'user_left_room',
        userName: user.name,
        remainingUsers: userIds.length,
        roomUsers: roomUsers
      });
    }
    
    await redis('del', `user:${userId}`);
    await redis('del', `events:${userId}`);
    
    return { success: true, message: 'Left room successfully' };
  } catch (e) {
    console.error('Leave room error:', e);
    return { success: false, error: 'Failed to leave room' };
  }
}

async function handleTyping(body) {
  try {
    const { userId, roomId, isTyping } = JSON.parse(body);
    
    const room = await redis('hgetall', `rooms:${roomId}`);
    if (!room || !room.id) return { success: false, error: 'Room not found' };
    
    const user = await redis('hgetall', `user:${userId}`);
    if (!user || !user.id) return { success: false, error: 'User not found' };
    
    if (isTyping) {
      await broadcastToRoom(roomId, {
        type: 'typing_update',
        userName: user.name,
        isTyping: true
      }, userId);
    }
    
    return { success: true };
  } catch (e) {
    console.error('Typing error:', e);
    return { success: false, error: 'Failed to send typing' };
  }
}

async function handleHeartbeat(body) {
  try {
    const { userId } = JSON.parse(body);
    
    const user = await redis('hgetall', `user:${userId}`);
    if (!user || !user.id) {
      return { success: false, error: 'User not found' };
    }
    
    await redis('hset', `user:${userId}`, 'lastHeartbeat', Date.now());
    
    return { success: true };
  } catch (e) {
    console.error('Heartbeat error:', e);
    return { success: false, error: 'Heartbeat failed' };
  }
}

async function handlePoll(userId, roomId) {
  try {
    if (!userId || !roomId) {
      return { events: [] };
    }
    
    const room = await redis('hgetall', `rooms:${roomId}`);
    const user = await redis('hgetall', `user:${userId}`);
    
    if (!user || !user.id || user.roomId !== roomId) {
      return { events: [], error: 'Not in room' };
    }
    
    const events = await redis('lrange', `events:${userId}`, 0, -1) || [];
    await redis('del', `events:${userId}`);
    
    return { events: events.map(e => JSON.parse(e)) };
  } catch (e) {
    console.error('Poll error:', e);
    return { events: [] };
  }
}

async function handleGetRoomInfo(roomId) {
  try {
    const room = await redis('hgetall', `rooms:${roomId}`);
    if (!room || !room.id) {
      return { success: false, error: 'Room not found' };
    }
    
    const userIds = await redis('smembers', `room:${roomId}:users`) || [];
    const users = [];
    
    for (const uId of userIds) {
      const u = await redis('hgetall', `user:${uId}`);
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
    
    const messages = await redis('llen', `room:${roomId}:messages`);
    
    return {
      success: true,
      room: {
        id: room.id,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        usersCount: userIds.length,
        users: users,
        messageCount: messages,
        createdAt: parseInt(room.createdAt)
      }
    };
  } catch (e) {
    console.error('Get room info error:', e);
    return { success: false, error: 'Failed to get room info' };
  }
}

async function handleStatus() {
  try {
    const roomKeys = await redis('keys', 'rooms:*') || [];
    const userKeys = await redis('keys', 'user:*') || [];
    
    let totalMessages = 0;
    for (const roomKey of roomKeys) {
      const roomId = roomKey.replace('rooms:', '');
      const count = await redis('llen', `room:${roomId}:messages`);
      totalMessages += count || 0;
    }
    
    return {
      success: true,
      status: {
        activeRooms: roomKeys.length,
        totalUsers: userKeys.length,
        totalMessages: totalMessages,
        timestamp: Date.now()
      }
    };
  } catch (e) {
    console.error('Status error:', e);
    return { success: false, error: 'Failed to get status' };
  }
}

async function handleDebug() {
  return {
    redisConfigured: !!REDIS_URL,
    upstashConfigured: !!UPSTASH_API,
    redisUrlPrefix: REDIS_URL ? REDIS_URL.substring(0, 20) + '...' : 'NOT SET',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'unknown'
  };
}

// Main handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (!REDIS_URL) {
    console.error('REDIS_URL not configured');
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
    return res.status(500).json({ success: false, error: 'Server error' });
  }
  
  res.status(404).json({ error: 'Not found' });
}
