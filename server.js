// server.js - SyncScholars Backend (FIXED VERSION)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ⚠️ FIX 1: ALLOW ALL CONNECTIONS FOR TESTING
const io = new Server(server, {
  cors: {
    origin: "*",  // Changed from "http://localhost:3000"
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Middleware
app.use(
  cors({
    origin: "*",  // Allow all for testing
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const MONGODB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/syncscholars";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected to SyncScholars"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    console.log("⚠️ Please make sure MongoDB is running...");
  });

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: "default-avatar.png"
  },
  status: {
    type: String,
    enum: ["online", "offline", "away"],
    default: "offline"
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

const User = mongoose.model("User", userSchema);

// Study Group Schema
const studyGroupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: "A study group for focused learning"
  },
  subject: {
    type: String,
    default: "General"
  },
  code: { 
    type: String, 
    unique: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  maxMembers: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  members: [
    {
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      username: String,
      joinedAt: { 
        type: Date, 
        default: Date.now 
      },
      isHost: { 
        type: Boolean, 
        default: false 
      },
      isFocused: {
        type: Boolean,
        default: false
      },
      lastSeen: {
        type: Date,
        default: Date.now
      }
    },
  ],
  timer: {
    status: {
      type: String,
      enum: ["idle", "study", "break", "paused"],
      default: "idle"
    },
    timeLeft: { 
      type: Number, 
      default: 1500 
    },
    startTime: Date,
    mode: { 
      type: String, 
      enum: ["study", "break"], 
      default: "study" 
    },
    studyDuration: {
      type: Number,
      default: 1500 // 25 minutes in seconds
    },
    breakDuration: {
      type: Number,
      default: 300 // 5 minutes in seconds
    },
    lastUpdated: Date,
    totalSessions: {
      type: Number,
      default: 0
    }
  },
  tasks: [
    {
      id: String,
      text: String,
      completed: { 
        type: Boolean, 
        default: false 
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      assignedTo: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      dueDate: Date,
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
      },
      createdAt: { 
        type: Date, 
        default: Date.now 
      },
    },
  ],
  messages: [
    {
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      username: String,
      content: String,
      type: {
        type: String,
        enum: ["text", "system", "notification"],
        default: "text"
      },
      timestamp: { 
        type: Date, 
        default: Date.now 
      },
    },
  ],
  resources: [
    {
      name: String,
      url: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      fileType: String,
      size: Number
    }
  ],
  settings: {
    allowJoinRequests: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    enableVoiceChat: {
      type: Boolean,
      default: false
    },
    enableVideoChat: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    totalStudyTime: {
      type: Number,
      default: 0
    },
    totalTasks: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    activeDays: [
      {
        date: Date,
        studyTime: Number
      }
    ]
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt timestamp before saving
studyGroupSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

const StudyGroup = mongoose.model("StudyGroup", studyGroupSchema);

// API Routes
app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "SyncScholars Backend API",
    version: "1.0.0",
    status: "running"
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// WebSocket test endpoint
app.get("/ws-test", (req, res) => {
  res.json({
    success: true,
    message: "WebSocket server is running",
    wsUrl: "ws://localhost:5000"
  });
});

// Auth Routes
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Please provide all required fields" 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: "User already exists with this email or username" 
      });
    }

    // Create new user
    const user = new User({ 
      username, 
      email, 
      password 
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error during registration" 
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Please provide email and password" 
      });
    }

    // Find user
    const user = await User.findOne({ email, password });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid email or password" 
      });
    }

    // Update user status
    user.status = "online";
    user.lastActive = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error during login" 
    });
  }
});

// Group Routes
app.post("/api/groups", async (req, res) => {
  try {
    const { name, description, createdBy, isPrivate, maxMembers } = req.body;

    // Validate input
    if (!name || !createdBy) {
      return res.status(400).json({ 
        success: false,
        error: "Please provide group name and creator ID" 
      });
    }

    // Generate unique code
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    let existingGroup = await StudyGroup.findOne({ code });
    while (existingGroup) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      existingGroup = await StudyGroup.findOne({ code });
    }

    // Create group
    const group = new StudyGroup({
      name,
      description: description || "A study group for focused learning",
      code,
      createdBy,
      isPrivate: isPrivate || false,
      maxMembers: maxMembers || 10,
      members: [
        {
          userId: createdBy,
          username: "Host",
          isHost: true,
          isFocused: false
        },
      ],
      timer: {
        status: "idle",
        timeLeft: 1500,
        mode: "study",
        studyDuration: 1500,
        breakDuration: 300
      }
    });

    await group.save();

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        code: group.code,
        isPrivate: group.isPrivate,
        members: group.members,
        createdAt: group.createdAt
      },
    });
  } catch (error) {
    console.error("Group creation error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while creating group" 
    });
  }
});

app.get("/api/groups/:code", async (req, res) => {
  try {
    const group = await StudyGroup.findOne({ code: req.params.code })
      .populate("members.userId", "username avatar status")
      .populate("createdBy", "username avatar");

    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error("Group fetch error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while fetching group" 
    });
  }
});

// Join group
app.post("/api/groups/:code/join", async (req, res) => {
  try {
    const { userId, username } = req.body;
    const group = await StudyGroup.findOne({ code: req.params.code });

    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.userId.toString() === userId.toString()
    );

    if (isMember) {
      return res.status(400).json({ 
        success: false,
        error: "Already a member of this group" 
      });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ 
        success: false,
        error: "Group is full" 
      });
    }

    // Add member
    group.members.push({
      userId,
      username,
      isHost: false,
      isFocused: false,
      joinedAt: new Date()
    });

    await group.save();

    res.json({
      success: true,
      message: "Joined group successfully",
      group: {
        id: group._id,
        name: group.name,
        members: group.members
      }
    });
  } catch (Error) {
    console.error("Join group error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while joining group" 
    });
  }
});

// Timer API endpoints
app.post("/api/groups/:groupId/timer/start", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { mode = "study", duration = 1500 } = req.body;

    const group = await StudyGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    group.timer = {
      status: mode,
      timeLeft: duration,
      startTime: new Date(),
      mode,
      studyDuration: mode === "study" ? duration : group.timer.studyDuration,
      breakDuration: mode === "break" ? duration : group.timer.breakDuration,
      lastUpdated: new Date(),
      totalSessions: group.timer.totalSessions + (mode === "study" ? 1 : 0)
    };

    await group.save();
    
    res.json({ 
      success: true,
      timer: group.timer 
    });
  } catch (error) {
    console.error("Timer start error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while starting timer" 
    });
  }
});

app.post("/api/groups/:groupId/timer/pause", async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    if (group.timer.status !== "paused") {
      group.timer.status = "paused";
      group.timer.lastUpdated = new Date();
      await group.save();
    }

    res.json({ 
      success: true,
      timer: group.timer 
    });
  } catch (error) {
    console.error("Timer pause error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while pausing timer" 
    });
  }
});

app.post("/api/groups/:groupId/timer/reset", async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    group.timer = {
      status: "idle",
      timeLeft: group.timer.studyDuration || 1500,
      mode: "study",
      studyDuration: group.timer.studyDuration || 1500,
      breakDuration: group.timer.breakDuration || 300,
      lastUpdated: new Date(),
      totalSessions: group.timer.totalSessions
    };

    await group.save();
    res.json({ 
      success: true,
      timer: group.timer 
    });
  } catch (error) {
    console.error("Timer reset error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while resetting timer" 
    });
  }
});

// Get timer state
app.get("/api/groups/:groupId/timer", async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await StudyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({ 
        success: false,
        error: "Group not found" 
      });
    }

    res.json({ 
      success: true,
      timer: group.timer 
    });
  } catch (error) {
    console.error("Timer fetch error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while fetching timer" 
    });
  }
});

// Get user groups
app.get("/api/users/:userId/groups", async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await StudyGroup.find({
      "members.userId": userId
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error("User groups error:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error while fetching user groups" 
    });
  }
});

// ⚠️ FIX 2: IMPROVED SOCKET.IO IMPLEMENTATION
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Send welcome message immediately
  socket.emit("connected", { 
    message: "Connected to SyncScholars WebSocket", 
    socketId: socket.id 
  });

  // Join group room
  socket.on("join-group", (groupId) => {
    console.log(`User ${socket.id} joined group ${groupId}`);
    socket.join(groupId);
    
    // Notify others in group
    socket.to(groupId).emit("user-joined", {
      userId: socket.id,
      timestamp: new Date(),
    });
    
    // Acknowledge to sender
    socket.emit("group-joined", {
      groupId: groupId,
      message: `Successfully joined group ${groupId}`
    });
  });

  // Leave group room
  socket.on("leave-group", (groupId) => {
    console.log(`User ${socket.id} left group ${groupId}`);
    socket.leave(groupId);
    
    // Notify others in group
    socket.to(groupId).emit("user-left", {
      userId: socket.id,
      timestamp: new Date(),
    });
  });

  // Timer controls - FIXED: All handlers must receive data properly
  socket.on("timer-start", (data) => {
    console.log("Timer start received:", data);
    if (!data || !data.groupId) {
      socket.emit("error", { message: "Invalid timer-start data" });
      return;
    }
    
    const { groupId, timeLeft, mode } = data;
    console.log(`Broadcasting timer-start to group ${groupId}`);
    
    // Broadcast to everyone in group including sender
    io.to(groupId).emit("timer-started", {
      timeLeft: timeLeft || 1500,
      mode: mode || "study",
      startedAt: Date.now(),
      startedBy: socket.id
    });
  });

  socket.on("timer-pause", (data) => {
    console.log("Timer pause received:", data);
    const groupId = typeof data === 'string' ? data : (data && data.groupId ? data.groupId : data);
    
    if (!groupId) {
      socket.emit("error", { message: "Group ID required for timer-pause" });
      return;
    }
    
    console.log(`Broadcasting timer-pause to group ${groupId}`);
    io.to(groupId).emit("timer-paused", {
      pausedBy: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on("timer-reset", (data) => {
    console.log("Timer reset received:", data);
    const groupId = typeof data === 'string' ? data : (data && data.groupId ? data.groupId : data);
    
    if (!groupId) {
      socket.emit("error", { message: "Group ID required for timer-reset" });
      return;
    }
    
    console.log(`Broadcasting timer-reset to group ${groupId}`);
    io.to(groupId).emit("timer-reset", {
      resetBy: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on("timer-tick", (data) => {
    console.log("Timer tick received:", data);
    if (!data || !data.groupId) {
      socket.emit("error", { message: "Invalid timer-tick data" });
      return;
    }
    
    const { groupId, timeLeft, mode } = data;
    console.log(`Broadcasting timer-tick to group ${groupId}`);
    
    io.to(groupId).emit("timer-updated", {
      timeLeft,
      mode,
      timestamp: Date.now(),
      updatedBy: socket.id
    });
  });

  // Chat messages
  socket.on("send-message", (data) => {
    console.log("Message received:", data);
    if (!data || !data.groupId || !data.message) {
      socket.emit("error", { message: "Invalid message data" });
      return;
    }
    
    const { groupId, message, user } = data;
    const messageData = {
      message,
      user: user || { id: socket.id, name: "Anonymous" },
      timestamp: new Date(),
    };
    
    // Broadcast to everyone in group including sender
    io.to(groupId).emit("new-message", messageData);
  });

  // Tasks
  socket.on("add-task", (data) => {
    console.log("Add task received:", data);
    if (!data || !data.groupId || !data.task) {
      socket.emit("error", { message: "Invalid task data" });
      return;
    }
    
    const { groupId, task } = data;
    io.to(groupId).emit("task-added", task);
  });

  socket.on("update-task", (data) => {
    console.log("Update task received:", data);
    if (!data || !data.groupId || !data.taskId) {
      socket.emit("error", { message: "Invalid update task data" });
      return;
    }
    
    const { groupId, taskId, completed } = data;
    io.to(groupId).emit("task-updated", { taskId, completed });
  });

  socket.on("delete-task", (data) => {
    console.log("Delete task received:", data);
    if (!data || !data.groupId || !data.taskId) {
      socket.emit("error", { message: "Invalid delete task data" });
      return;
    }
    
    const { groupId, taskId } = data;
    io.to(groupId).emit("task-deleted", { taskId });
  });

  // User focus status
  socket.on("update-focus", (data) => {
    console.log("Update focus received:", data);
    if (!data || !data.groupId || !data.userId) {
      socket.emit("error", { message: "Invalid focus data" });
      return;
    }
    
    const { groupId, userId, isFocused } = data;
    io.to(groupId).emit("user-focus-update", { userId, isFocused });
  });

  // User typing status
  socket.on("typing", (data) => {
    console.log("Typing received:", data);
    if (!data || !data.groupId || !data.userId) {
      socket.emit("error", { message: "Invalid typing data" });
      return;
    }
    
    const { groupId, userId, isTyping } = data;
    io.to(groupId).emit("user-typing", { userId, isTyping });
  });

  // Test echo endpoint
  socket.on("echo", (data) => {
    console.log("Echo received:", data);
    socket.emit("echo-response", { 
      original: data, 
      timestamp: new Date(),
      server: "SyncScholars" 
    });
  });

  // Ping
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
  });

  // Disconnection
  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SyncScholars Backend running on port ${PORT}`);
  console.log(`📡 WebSocket ready at ws://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Test WebSocket: curl http://localhost:${PORT}/ws-test`);
});

// Export for testing
module.exports = { app, server, io };