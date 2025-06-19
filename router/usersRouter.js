// external imports
const express = require("express");
const { check } = require("express-validator");

// internal imports
const User = require("../models/People");
const {
  getUsers,
  addUsers,
  removeUser,
} = require("../controller/usersController");
const decorateHtmlResponse = require("../middlewares/common/decorateHtmlResponse");
const avatarUploads = require("../middlewares/users/avatarUploads");
const {
  addUserValidators,
  addUserValidationHandler,
} = require("../middlewares/users/userValidators");
const { checkLogin } = require("../middlewares/common/checkLogin");

const router = express.Router();

// users page
router.get("/", decorateHtmlResponse("Users Page"), checkLogin, getUsers);

// add user
router.post(
  "/",
  checkLogin,
  avatarUploads,
  addUserValidators,
  addUserValidationHandler,
  addUsers
);

// remove user
router.delete("/:id", removeUser);
module.exports = router;
