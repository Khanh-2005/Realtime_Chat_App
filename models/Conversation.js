const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
  {
    creator: {
      id: mongoose.Types.ObjectId,
      name: String,
      avatar: String,
    },

    participant: {
      id: mongoose.Types.ObjectId,
      name: String,
      avatar: String,
    },
    members: [
      {
        id: mongoose.Types.ObjectId,
        name: String,
        avatar: String,
      },
    ],
    is_group: {
      type: Boolean,
      default: false,
    },
    group_name: {
      type: String,
      trim: true,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
