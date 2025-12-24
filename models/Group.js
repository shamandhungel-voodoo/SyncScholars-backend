// backend/models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxMembers: { type: Number, default: 10 },
  studyFocus: { type: String },
  timerStatus: {
    isRunning: { type: Boolean, default: false },
    mode: { type: String, enum: ['study', 'break'], default: 'study' },
    timeLeft: { type: Number, default: 1500 }, // 25 minutes in seconds
    totalDuration: { type: Number, default: 1500 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);