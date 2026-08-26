import { WebSocketServer, WebSocket } from 'ws';
import {
  addChatMessage,
  updateChatMessage,
  markConversationRead,
  updateUserPresence,
  getAllUserPresences,
  getUserPresence,
  getConversationById,
  logEmailFallbackNotification
} from './db.mjs';

let wss = null;
const clients = new Map(); // ws -> { userId, role, name, rooms: Set<string>, isAlive: boolean }

export function setupWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws/chat' });

  wss.on('connection', (ws, req) => {
    const clientState = {
      userId: null,
      role: 'guest',
      name: 'Guest User',
      rooms: new Set(),
      isAlive: true
    };
    clients.set(ws, clientState);

    ws.on('pong', () => {
      clientState.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString();
        const payload = JSON.parse(text);
        await handleClientMessage(ws, clientState, payload);
      } catch (err) {
        console.error('WS parse/handle error:', err);
        safeSend(ws, { type: 'error', message: err.message });
      }
    });

    ws.on('close', () => {
      handleClientDisconnect(clientState);
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('WS client error:', err.message);
      clients.delete(ws);
    });

    // Send connection greeting
    safeSend(ws, {
      type: 'connected',
      message: 'VeriPinoy Real-Time E2EE WebSocket Hub Connected',
      timestamp: new Date().toISOString()
    });
  });

  // Heartbeat interval to detect stale/dead connections
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    for (const [ws, state] of clients.entries()) {
      if (state.isAlive === false) {
        handleClientDisconnect(state);
        clients.delete(ws);
        try { ws.terminate(); } catch (e) {}
        continue;
      }
      state.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        clients.delete(ws);
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('VeriPinoy Real-Time WebSocket Messaging Hub initialized on /ws/chat');
  return wss;
}

async function handleClientMessage(ws, state, payload) {
  const { type } = payload;

  switch (type) {
    case 'ping': {
      safeSend(ws, { type: 'pong', timestamp: Date.now() });
      break;
    }

    case 'auth': {
      const { userId, role, name, activeConversationId, activeThreadId } = payload;
      if (userId) {
        state.userId = userId;
        state.role = role || 'customer';
        state.name = name || userId;
        state.rooms.add(`user:${userId}`);

        if (state.role === 'support' || state.role === 'staff' || state.role === 'admin') {
          state.rooms.add('staff_portal');
        }

        const activeId = activeConversationId || activeThreadId;
        if (activeId) {
          state.rooms.add(`room:thread_${activeId}`);
          state.rooms.add(`conv:${activeId}`);
        }

        // Update presence in database
        try {
          updateUserPresence(userId, 'online', activeId || null);
        } catch (e) {}

        // Broadcast presence
        broadcastToAll({
          type: 'presence:update',
          user_id: userId,
          status: 'online',
          name: state.name,
          role: state.role,
          is_typing_in: activeId || null,
          timestamp: new Date().toISOString()
        });

        // Send current all presences snapshot to newly authenticated client
        try {
          const presences = getAllUserPresences();
          safeSend(ws, {
            type: 'presence:snapshot',
            presences
          });
        } catch (e) {}

        safeSend(ws, {
          type: 'auth:success',
          user_id: userId,
          role: state.role,
          name: state.name,
          rooms: Array.from(state.rooms)
        });
      }
      break;
    }

    case 'join:room':
    case 'subscribe': {
      const { channel, conversationId, threadId, room } = payload;
      const targetChannel = room || channel || (threadId ? `room:thread_${threadId}` : (conversationId ? `room:thread_${conversationId}` : null));
      if (targetChannel) {
        state.rooms.add(targetChannel);
        // Also map legacy alias if thread/conv
        if (targetChannel.startsWith('room:thread_')) {
          const id = targetChannel.replace('room:thread_', '');
          state.rooms.add(`conv:${id}`);
        } else if (targetChannel.startsWith('conv:')) {
          const id = targetChannel.replace('conv:', '');
          state.rooms.add(`room:thread_${id}`);
        }
        safeSend(ws, { type: 'subscribed', channel: targetChannel, room: targetChannel });
      }
      break;
    }

    case 'leave:room':
    case 'unsubscribe': {
      const { channel, conversationId, threadId, room } = payload;
      const targetChannel = room || channel || (threadId ? `room:thread_${threadId}` : (conversationId ? `room:thread_${conversationId}` : null));
      if (targetChannel) {
        state.rooms.delete(targetChannel);
        if (targetChannel.startsWith('room:thread_')) {
          const id = targetChannel.replace('room:thread_', '');
          state.rooms.delete(`conv:${id}`);
        } else if (targetChannel.startsWith('conv:')) {
          const id = targetChannel.replace('conv:', '');
          state.rooms.delete(`room:thread_${id}`);
        }
        safeSend(ws, { type: 'unsubscribed', channel: targetChannel, room: targetChannel });
      }
      break;
    }

    case 'message:send': {
      const {
        conversationId,
        threadId,
        tempId,
        sender_id,
        sender_name,
        sender_role,
        recipient_id,
        message_text,
        is_e2ee,
        encrypted_payload,
        attachments,
        quote_reply_to,
        quote_preview
      } = payload;

      const activeId = conversationId || threadId;
      if (!activeId || !sender_id) {
        safeSend(ws, { type: 'error', message: 'Missing conversationId/threadId or sender_id' });
        return;
      }

      // Persist to Database
      const msg = addChatMessage({
        conversation_id: activeId,
        sender_id,
        sender_name: sender_name || state.name || 'User',
        sender_role: sender_role || state.role || 'customer',
        recipient_id: recipient_id || 'recipient',
        message_text: message_text || '',
        is_e2ee: is_e2ee ? 1 : 0,
        encrypted_payload: encrypted_payload || null,
        attachments: attachments || null,
        quote_reply_to: quote_reply_to || null,
        quote_preview: quote_preview || null
      });

      // Acknowledge back to sender with tempId for optimistic reconciliation
      safeSend(ws, {
        type: 'message:ack',
        tempId: tempId || null,
        conversationId: activeId,
        thread_id: activeId,
        message: msg
      });

      // Broadcast new message strictly to this thread's channel and explicit participants
      const broadcastPayload = {
        type: 'message:new',
        conversationId: activeId,
        thread_id: activeId,
        tempId: tempId || null,
        message: msg,
        sender_id,
        recipient_id
      };

      const targetRooms = [
        `room:thread_${activeId}`,
        `conv:${activeId}`,
        `user:${recipient_id}`,
        `user:${sender_id}`
      ];
      broadcastToRooms(targetRooms, broadcastPayload);

      // Check recipient presence for offline email fallback
      try {
        const recipientPresence = getUserPresence(recipient_id);
        if (recipientPresence.status !== 'online') {
          const preview = is_e2ee ? 'You received an end-to-end encrypted message.' : (message_text ? (message_text.substring(0, 80) + (message_text.length > 80 ? '...' : '')) : 'Sent an attachment');
          logEmailFallbackNotification({
            recipient_email: recipient_id.includes('@') ? recipient_id : `${recipient_id.toLowerCase()}@veripinoy.ph`,
            recipient_name: recipient_id,
            sender_name: sender_name || state.name || 'A VeriPinoy User',
            conversation_id: activeId,
            preview_snippet: preview,
            direct_link: `https://veripinoy.ph/chat?conversation_id=${activeId}`
          });
        }
      } catch (e) {}
      break;
    }

    case 'typing:start': {
      const { conversationId, threadId, userId, userName } = payload;
      const activeId = conversationId || threadId;
      if (activeId) {
        try {
          updateUserPresence(userId || state.userId, 'online', activeId);
        } catch (e) {}

        broadcastToRooms([`room:thread_${activeId}`, `conv:${activeId}`], {
          type: 'typing:indicator',
          conversationId: activeId,
          thread_id: activeId,
          user_id: userId || state.userId,
          user_name: userName || state.name,
          is_typing: true,
          timestamp: Date.now()
        }, ws); // exclude sender
      }
      break;
    }

    case 'typing:stop': {
      const { conversationId, threadId, userId } = payload;
      const activeId = conversationId || threadId;
      if (activeId) {
        try {
          updateUserPresence(userId || state.userId, 'online', null);
        } catch (e) {}

        broadcastToRooms([`room:thread_${activeId}`, `conv:${activeId}`], {
          type: 'typing:indicator',
          conversationId: activeId,
          thread_id: activeId,
          user_id: userId || state.userId,
          is_typing: false,
          timestamp: Date.now()
        }, ws); // exclude sender
      }
      break;
    }

    case 'presence:update':
    case 'presence:set': {
      const { userId, status, is_typing_in } = payload;
      const targetUserId = userId || state.userId;
      if (targetUserId) {
        try {
          updateUserPresence(targetUserId, status || 'online', is_typing_in || null);
        } catch (e) {}

        broadcastToAll({
          type: 'presence:update',
          user_id: targetUserId,
          status: status || 'online',
          name: state.name,
          role: state.role,
          is_typing_in: is_typing_in || null,
          timestamp: new Date().toISOString()
        });
      }
      break;
    }

    case 'read:mark': {
      const { conversationId, threadId, readerId } = payload;
      const activeId = conversationId || threadId;
      if (activeId) {
        try {
          markConversationRead(activeId, readerId || state.userId || '');
        } catch (e) {}

        broadcastToRooms([`room:thread_${activeId}`, `conv:${activeId}`, `user:${readerId}`], {
          type: 'read:receipt',
          conversationId: activeId,
          thread_id: activeId,
          reader_id: readerId || state.userId,
          read_at: new Date().toISOString()
        });
      }
      break;
    }

    case 'message:update': {
      const { messageId, conversationId, threadId, message_text, is_deleted } = payload;
      const activeId = conversationId || threadId;
      if (messageId) {
        const updated = updateChatMessage(messageId, {
          message_text,
          is_edited: is_deleted ? 0 : 1,
          is_deleted: is_deleted ? 1 : 0
        });

        broadcastToRooms([`room:thread_${activeId}`, `conv:${activeId}`], {
          type: 'message:updated',
          conversationId: activeId,
          thread_id: activeId,
          messageId,
          message: updated
        });
      }
      break;
    }

    default:
      console.log('Unhandled WS message type:', type);
  }
}

function handleClientDisconnect(state) {
  if (state.userId) {
    try {
      updateUserPresence(state.userId, 'offline', null);
      broadcastToAll({
        type: 'presence:update',
        user_id: state.userId,
        status: 'offline',
        name: state.name,
        role: state.role,
        is_typing_in: null,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}
  }
}

function safeSend(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (e) {
      console.warn('WS send error:', e.message);
    }
  }
}

export function broadcastToRooms(roomNames, data, excludeWs = null) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const targetRooms = new Set(roomNames);

  for (const [ws, state] of clients.entries()) {
    if (ws === excludeWs) continue;
    if (ws.readyState !== WebSocket.OPEN) continue;

    let hasMatch = false;
    for (const room of state.rooms) {
      if (targetRooms.has(room)) {
        hasMatch = true;
        break;
      }
    }

    if (hasMatch) {
      try {
        ws.send(jsonStr);
      } catch (e) {}
    }
  }
}

export function broadcastToAll(data, excludeWs = null) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  for (const [ws] of clients.entries()) {
    if (ws === excludeWs) continue;
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(jsonStr);
      } catch (e) {}
    }
  }
}

// REST Helper function so express routes can trigger real-time broadcasts
export function broadcastWsMessage(event) {
  if (!event || !event.type) return;
  if (event.type === 'message:new' && (event.conversationId || event.thread_id)) {
    const threadId = event.conversationId || event.thread_id;
    const rooms = [`room:thread_${threadId}`, `conv:${threadId}`];
    if (event.recipient_id) rooms.push(`user:${event.recipient_id}`);
    if (event.sender_id) rooms.push(`user:${event.sender_id}`);
    broadcastToRooms(rooms, event);
  } else if (event.type === 'presence:update') {
    broadcastToAll(event);
  } else if (event.type === 'ticket:update' || event.type === 'ticket:message:new') {
    const rooms = ['staff_portal'];
    if (event.ticket_id) {
      rooms.push(`room:ticket_${event.ticket_id}`);
      rooms.push(`ticket:${event.ticket_id}`);
    }
    if (event.user_id) rooms.push(`user:${event.user_id}`);
    broadcastToRooms(rooms, event);
  } else if (event.conversationId || event.thread_id) {
    const threadId = event.conversationId || event.thread_id;
    broadcastToRooms([`room:thread_${threadId}`, `conv:${threadId}`], event);
  } else {
    broadcastToAll(event);
  }
}
