// external imports
const createError = require("http-errors");
const { unlink } = require("fs");
const path = require("path");
// internal imports
const User = require("../models/People");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const escape = require("../utilities/escape");

function conversationAccessQuery(userId) {
  return {
    $or: [
      { "creator.id": userId },
      { "participant.id": userId },
      { "members.id": userId },
    ],
  };
}

function getConversationTitle(conversation, userId) {
  if (conversation.is_group) {
    return conversation.group_name || "Group conversation";
  }

  return conversation.creator.id.toString() === userId
    ? conversation.participant.name
    : conversation.creator.name;
}

function getConversationAvatar(conversation, userId) {
  if (conversation.is_group) {
    return null;
  }

  return conversation.creator.id.toString() === userId
    ? conversation.participant.avatar
    : conversation.creator.avatar;
}

function formatConversation(conversation, userId) {
  return {
    _id: conversation._id,
    title: getConversationTitle(conversation, userId),
    avatar: getConversationAvatar(conversation, userId),
    is_group: conversation.is_group || false,
    last_updated: conversation.last_updated,
  };
}

// get inbox page
async function getInbox(req, res, next) {
  try {
    const conversations = await Conversation.find(
      conversationAccessQuery(req.user.userid)
    ).sort("-last_updated");
    res.locals.data = conversations;
    res.render("inbox");
  } catch (err) {
    next(err);
  }
}

// search user
async function searchUser(req, res, next) {
  const user = req.body.user;
  const searchQuery = user.replace("+88", "");

  const name_search_regex = new RegExp(escape(searchQuery), "i");
  const mobile_search_regex = new RegExp("^" + escape("+88" + searchQuery));
  const email_search_regex = new RegExp("^" + escape(searchQuery) + "$", "i");

  try {
    if (searchQuery !== "") {
      const users = await User.find(
        {
          $or: [
            {
              name: name_search_regex,
            },
            {
              mobile: mobile_search_regex,
            },
            {
              email: email_search_regex,
            },
          ],
        },
        "name avatar"
      );

      res.json(users);
    } else {
      throw createError("You must provide some text to search!");
    }
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
}

// add conversation
async function addConversation(req, res, next) {
  try {
    const creator = {
      id: req.user.userid,
      name: req.user.username,
      avatar: req.user.avatar || null,
    };

    let newConversation;

    if (req.body.type === "group") {
      if (!req.body.group_name || !req.body.participants?.length) {
        throw createError("Group name and members are required!");
      }

      const participantIds = [...new Set(req.body.participants)].filter(
        (id) => id !== req.user.userid
      );
      const users = await User.find(
        {
          _id: { $in: participantIds },
        },
        "name avatar"
      );

      if (users.length === 0) {
        throw createError("Select at least one member!");
      }

      newConversation = new Conversation({
        creator,
        members: [
          creator,
          ...users.map((user) => ({
            id: user._id,
            name: user.name,
            avatar: user.avatar || null,
          })),
        ],
        is_group: true,
        group_name: req.body.group_name,
      });
    } else {
      newConversation = new Conversation({
        creator,
        participant: {
          name: req.body.participant,
          id: req.body.id,
          avatar: req.body.avatar || null,
        },
        members: [
          creator,
          {
            name: req.body.participant,
            id: req.body.id,
            avatar: req.body.avatar || null,
          },
        ],
      });
    }

    const result = await newConversation.save();
    res.status(200).json({
      message: "Conversation was added successfully!",
      conversation: formatConversation(result, req.user.userid),
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
}

// get messages of a conversation
async function getMessages(req, res, next) {
  try {
    const messages = await Message.find({
      conversation_id: req.params.conversation_id,
    }).sort("-createdAt");

    const conversation = await Conversation.findOne({
      _id: req.params.conversation_id,
      ...conversationAccessQuery(req.user.userid),
    });

    if (!conversation) {
      throw createError("Conversation not found!");
    }

    const participant = conversation.is_group
      ? {
          id: conversation._id,
          name: conversation.group_name,
          avatar: null,
          is_group: true,
        }
      : conversation.creator.id.toString() === req.user.userid
        ? conversation.participant
        : conversation.creator;

    res.status(200).json({
      data: {
        messages: messages,
        participant,
        conversation: formatConversation(conversation, req.user.userid),
      },
      user: req.user.userid,
      conversation_id: req.params.conversation_id,
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: "Unknows error occured!",
        },
      },
    });
  }
}

// send new message
async function sendMessage(req, res, next) {
  if (req.body.message || (req.files && req.files.length > 0)) {
    try {
      const conversation = await Conversation.findOne({
        _id: req.body.conversationId,
        ...conversationAccessQuery(req.user.userid),
      });

      if (!conversation) {
        throw createError("Conversation not found!");
      }

      // save message text/attachment in database
      let attachments = null;

      if (req.files && req.files.length > 0) {
        attachments = [];

        req.files.forEach((file) => {
          attachments.push(file.filename);
        });
      }

      const newMessage = new Message({
        text: req.body.message,
        attachment: attachments,
        sender: {
          id: req.user.userid,
          name: req.user.username,
          avatar: req.user.avatar || null,
        },
        receiver: conversation.is_group
          ? {
              id: conversation._id,
              name: conversation.group_name,
              avatar: null,
            }
          : {
              id: req.body.receiverId,
              name: req.body.receiverName,
              avatar: req.body.avatar || null,
            },
        conversation_id: req.body.conversationId,
      });

      const result = await newMessage.save();
      await Conversation.findByIdAndUpdate(req.body.conversationId, {
        last_updated: Date.now(),
      });

      // emit socket event
      global.io.emit("new_message", {
        message: {
          conversation_id: req.body.conversationId,
          sender: {
            id: req.user.userid,
            name: req.user.username,
            avatar: req.user.avatar || null,
          },
          message: req.body.message,
          attachment: attachments,
          date_time: result.date_time,
        },
      });

      res.status(200).json({
        message: "Successful!",
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        errors: {
          common: {
            msg: err.message,
          },
        },
      });
    }
  } else {
    res.status(500).json({
      errors: {
        common: "message text or attachment is required!",
      },
    });
  }
}

// delete conversation
async function deleteConversation(req, res, next) {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.conversation_id,
      ...conversationAccessQuery(req.user.userid),
    });

    if (!conversation) {
      return res.status(404).json({
        errors: {
          common: {
            msg: "Conversation not found",
          },
        },
      });
    }

    const messages = await Message.find({
      conversation_id: req.params.conversation_id,
    });

    messages.forEach((message) => {
      if (message.attachment && message.attachment.length > 0) {
        message.attachment.forEach((attachment) => {
          unlink(
            path.join(__dirname, `/../public/uploads/attachments/${attachment}`),
            (err) => {
              if (err) console.log(err);
            },
          );
        });
      }
    });

    await Message.deleteMany({
      conversation_id: req.params.conversation_id,
    });

    global.io.emit("conversation_deleted", {
      conversation_id: req.params.conversation_id,
    });

    res.status(200).json({
      message: "Conversation deleted successfully!",
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
}

// search conversations
async function searchConversation(req, res, next) {
  const searchQuery = (req.query.q || "").trim();

  try {
    if (!searchQuery) {
      const conversations = await Conversation.find(
        conversationAccessQuery(req.user.userid)
      ).sort("-last_updated");

      return res.status(200).json({
        data: conversations.map((conversation) =>
          formatConversation(conversation, req.user.userid)
        ),
      });
    }

    const searchRegex = new RegExp(escape(searchQuery), "i");
    const userConversationIds = (
      await Conversation.find(conversationAccessQuery(req.user.userid), "_id")
    ).map((conversation) => conversation._id);

    const matchedMessages = await Message.find(
      {
        conversation_id: { $in: userConversationIds },
        $or: [{ text: searchRegex }, { attachment: searchRegex }],
      },
      "conversation_id"
    );

    const messageConversationIds = matchedMessages.map(
      (message) => message.conversation_id
    );

    const conversations = await Conversation.find({
      _id: { $in: [...userConversationIds, ...messageConversationIds] },
      $and: [
        conversationAccessQuery(req.user.userid),
        {
          $or: [
            { "creator.name": searchRegex },
            { "participant.name": searchRegex },
            { "members.name": searchRegex },
            { group_name: searchRegex },
            { _id: { $in: messageConversationIds } },
          ],
        },
      ],
    }).sort("-last_updated");

    res.status(200).json({
      data: conversations.map((conversation) =>
        formatConversation(conversation, req.user.userid)
      ),
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
}

module.exports = {
  getInbox,
  searchUser,
  addConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  searchConversation,
};
