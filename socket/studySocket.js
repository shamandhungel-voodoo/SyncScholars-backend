// backend/sockets/studySockets.js
module.exports = (io) => {
  const activeSessions = new Map();
  
  io.on('connection', (socket) => {
    console.log('🔌 New connection:', socket.id);

    // Join study group
    socket.on('join-study-group', async (data) => {
      const { groupId, userId } = data;
      
      socket.join(groupId);
      socket.groupId = groupId;
      socket.userId = userId;
      
      // Update active users
      if (!activeSessions.has(groupId)) {
        activeSessions.set(groupId, new Set());
      }
      activeSessions.get(groupId).add(userId);
      
      // Notify others in group
      socket.to(groupId).emit('user-joined', {
        userId,
        timestamp: new Date(),
        activeUsers: Array.from(activeSessions.get(groupId))
      });
      
      // Send current state to new user
      const groupState = getGroupState(groupId);
      socket.emit('group-state', groupState);
      
      console.log(`👥 User ${userId} joined group ${groupId}`);
    });

    // Timer controls
    socket.on('timer-start', (data) => {
      const { groupId, duration, mode } = data;
      
      io.to(groupId).emit('timer-started', {
        duration,
        mode,
        startedAt: Date.now(),
        initiatedBy: socket.userId
      });
      
      updateGroupTimer(groupId, {
        status: mode,
        startTime: Date.now(),
        duration
      });
    });

    socket.on('timer-pause', (groupId) => {
      io.to(groupId).emit('timer-paused', {
        pausedAt: Date.now(),
        by: socket.userId
      });
      
      updateGroupTimer(groupId, { status: 'paused' });
    });

    socket.on('timer-resume', (groupId) => {
      io.to(groupId).emit('timer-resumed', {
        resumedAt: Date.now(),
        by: socket.userId
      });
      
      updateGroupTimer(groupId, { status: 'study' });
    });

    socket.on('timer-reset', (groupId) => {
      io.to(groupId).emit('timer-reset', {
        resetBy: socket.userId,
        timestamp: new Date()
      });
      
      updateGroupTimer(groupId, { 
        status: 'idle',
        timeLeft: 1500 
      });
    });

    // Real-time chat
    socket.on('send-message', (data) => {
      const { groupId, content, type = 'text' } = data;
      
      const message = {
        id: Date.now().toString(),
        senderId: socket.userId,
        content,
        type,
        timestamp: new Date(),
        groupId
      };
      
      // Broadcast to group
      io.to(groupId).emit('new-message', message);
      
      // Save to database (async)
      saveMessage(message);
    });

    // Task management
    socket.on('add-task', (data) => {
      const { groupId, task } = data;
      
      io.to(groupId).emit('task-added', {
        ...task,
        addedBy: socket.userId,
        createdAt: new Date()
      });
    });

    socket.on('update-task', (data) => {
      const { groupId, taskId, updates } = data;
      
      io.to(groupId).emit('task-updated', {
        taskId,
        updates,
        updatedBy: socket.userId,
        updatedAt: new Date()
      });
    });

    socket.on('delete-task', (data) => {
      const { groupId, taskId } = data;
      
      io.to(groupId).emit('task-deleted', {
        taskId,
        deletedBy: socket.userId
      });
    });

    // Focus status
    socket.on('update-focus', (data) => {
      const { groupId, status } = data;
      
      io.to(groupId).emit('focus-updated', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
      
      updateUserFocus(groupId, socket.userId, status);
    });

    // Break activity
    socket.on('start-break-activity', (data) => {
      const { groupId, activity } = data;
      
      io.to(groupId).emit('break-activity-started', {
        activity,
        startedBy: socket.userId,
        startedAt: Date.now()
      });
    });

    // Study streak
    socket.on('complete-session', (data) => {
      const { groupId, duration } = data;
      
      io.to(groupId).emit('session-completed', {
        userId: socket.userId,
        duration,
        timestamp: new Date()
      });
      
      updateUserStreak(socket.userId, groupId, duration);
    });

    // Typing indicators
    socket.on('typing-start', (groupId) => {
      socket.to(groupId).emit('user-typing', {
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing-stop', (groupId) => {
      socket.to(groupId).emit('user-typing', {
        userId: socket.userId,
        isTyping: false
      });
    });

    // Disconnection handling
    socket.on('disconnect', () => {
      const { groupId, userId } = socket;
      
      if (groupId && userId) {
        // Remove from active users
        if (activeSessions.has(groupId)) {
          activeSessions.get(groupId).delete(userId);
          
          // Notify others
          socket.to(groupId).emit('user-left', {
            userId,
            timestamp: new Date(),
            activeUsers: Array.from(activeSessions.get(groupId))
          });
          
          // Update focus status to away
          updateUserFocus(groupId, userId, 'away');
        }
      }
      
      console.log('🔌 User disconnected:', socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Helper functions
  function getGroupState(groupId) {
    // This would fetch from database
    return {
      timer: { status: 'idle', timeLeft: 1500 },
      activeUsers: [],
      recentMessages: [],
      tasks: []
    };
  }

  async function updateGroupTimer(groupId, updates) {
    // Update in database
    // Implementation would update StudyGroup model
  }

  async function updateUserFocus(groupId, userId, status) {
    // Update member focus status in database
  }

  async function updateUserStreak(userId, groupId, duration) {
    // Update user streak and study time
  }

  async function saveMessage(message) {
    // Save message to database
  }
};