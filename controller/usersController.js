// external imports
const bcrypt = require("bcrypt");
const { unlink } = require("fs");
const path = require("path");

// internal imports
const User = require("../models/People");
// get users page
async function getUsers(req, res, next) {
  try {
    const users = await User.find();
    res.render("users", {
      users: users,
    });
  } catch (err) {
    next(err);
  }
}

// add users
async function addUsers(req, res, next) {
  let newUser;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  if (req.files && req.files.length > 0) {
    newUser = new User({
      ...req.body,
      password: hashedPassword,
      avatar: req.files[0].filename,
    });
  } else {
    newUser = new User({
      ...req.body,
      password: hashedPassword,
    });
  }

  // save user or send error
  try {
    const result = await newUser.save();
    res.status(200).json({
      message: "User added successfully",
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        email: {
          msg: "Unkown error occured",
        },
      },
    });
  }
}

// remove user
async function removeUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete({
      _id: req.params.id,
    });

    if (user.avatar) {
      unlink(
        path.join(__dirname, `/../public/uploads/avatars/${user.avatar}`),
        (err) => {
          if (err) console.log(err);
        }
      );
    }
  } catch (err) {
    res.status(500).json({
      errors: {
        email: {
          msg: "Couldn't delete user",
        },
      },
    });
  }
}

module.exports = {
  getUsers,
  addUsers,
  removeUser,
};
