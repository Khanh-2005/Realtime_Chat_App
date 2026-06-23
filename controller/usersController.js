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

// edit user
async function editUser(req, res, next) {
  try {
    const updateData = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    };

    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    if (req.files && req.files.length > 0) {
      updateData.avatar = req.files[0].filename;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: false,
    });

    if (!user) {
      return res.status(404).json({
        errors: {
          common: {
            msg: "User not found",
          },
        },
      });
    }

    if (updateData.avatar && user.avatar) {
      unlink(
        path.join(__dirname, `/../public/uploads/avatars/${user.avatar}`),
        (err) => {
          if (err) console.log(err);
        },
      );
    }

    res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: req.params.id,
        name: updateData.name,
        email: updateData.email,
        mobile: updateData.mobile,
        avatar: updateData.avatar || user.avatar || null,
      },
    });
  } catch (err) {
    res.status(500).json({
      errors: {
        common: {
          msg: "Couldn't update user",
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

    if (!user) {
      return res.status(404).json({
        errors: {
          common: {
            msg: "User not found",
          },
        },
      });
    }

    if (user.avatar) {
      unlink(
        path.join(__dirname, `/../public/uploads/avatars/${user.avatar}`),
        (err) => {
          if (err) console.log(err);
        },
      );
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
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
  editUser,
  removeUser,
};
