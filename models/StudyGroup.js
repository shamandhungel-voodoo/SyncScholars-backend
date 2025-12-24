// backend/models/StudyGroup.js
const mongoose = require('mongoose');

const StudyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isHost: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    focusStatus: {
      type: String,
      enum: ['focusing', 'break', 'away'],
      default: 'focusing'
    },
    studyStreak: {
      type: Number,
      default: 0
    }
  }],
  settings: {
    maxMembers: {
      type: Number,
      default: 12,
      min: 2,
      max: 50
    },
    studyDuration: {
      type: Number,
      default: 25,
      min: 5,
      max: 60
    },
    breakDuration: {
      type: Number,
      default: 5,
      min: 1,
      max: 30
    },
    autoStartTimer: {
      type: Boolean,
      default: false
    },
    requireFocusMode: {
      type: Boolean,
      default: false
    }
  },
  timer: {
    status: {
      type: String,
      enum: ['idle', 'study', 'break', 'paused'],
      default: 'idle'
    },
    timeLeft: {
      type: Number,
      default: 1500
    },
    startTime: Date,
    cyclesCompleted: {
      type: Number,
      default: 0
    }
  },
  activeSession: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    enum: ['coding', 'math', 'science', 'language', 'exam-prep', 'project', 'research', 'writing']
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique group code before saving
StudyGroupSchema.pre('save', async function(next) {
  if (this.isNew) {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existingGroup = await this.constructor.findOne({ code });
      if (!existingGroup) {
        isUnique = true;
      }
    }
    
    this.code = code;
  }
  this.updatedAt = Date.now();
  next();
});

// Add creator as host member
StudyGroupSchema.pre('save', async function(next) {
  if (this.isNew && this.createdBy) {
    this.members.push({
      user: this.createdBy,
      isHost: true,
      focusStatus: 'focusing'
    });
  }
  next();
});

module.exports = mongoose.model('StudyGroup', StudyGroupSchema);