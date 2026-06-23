// external imports
const { check, validationResult } = require("express-validator");
const createError = require("http-errors");
const path = require("path");
const { unlink } = require("fs");

// internal imports
const User = require("../../models/People");

// add user
const addUserValidators = [
  check("name")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 chars long")
    .isAlpha("en-US", { ignore: " -" })
    .withMessage("Name must be only alphabets")
    .trim(),
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .trim()
    .custom(async (value) => {
      try {
        const user = await User.findOne({ email: value });
        if (user) {
          throw createError("Email already exists");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("mobile")
    .matches(/^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/)
    .withMessage("Please enter a valid Vietnamese mobile number")
    .custom(async (value) => {
      try {
        const user = await User.findOne({ mobile: value });
        if (user) {
          throw createError("Mobile number already exists");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("password")
    .isStrongPassword()
    .withMessage(
      "Password must be at least 8 chars long, and should contain at least 1 lowercase, 1 uppercase, 1 number and 1 symbol"
    ),
];

const addUserValidationHandler = function (req, res, next) {
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();

  if (Object.keys(mappedErrors).length === 0) {
    next();
  } else {
    // remove uploaded file
    if (req.files && req.files.length > 0) {
      const filename = req.files[0].filename;
      unlink(
        path.join(__dirname, `../../public/uploads/avatars/${filename}`),
        (err) => {
          if (err) console.log(err);
        }
      );
    }

    res.status(500).json({
      errors: mappedErrors,
    });
  }
};

// edit user
const editUserValidators = [
  check("name")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 chars long")
    .isAlpha("en-US", { ignore: " -" })
    .withMessage("Name must be only alphabets")
    .trim(),
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .trim()
    .custom(async (value, { req }) => {
      try {
        const user = await User.findOne({
          email: value,
          _id: { $ne: req.params.id },
        });
        if (user) {
          throw createError("Email already exists");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("mobile")
    .matches(/^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/)
    .withMessage("Please enter a valid Vietnamese mobile number")
    .custom(async (value, { req }) => {
      try {
        const user = await User.findOne({
          mobile: value,
          _id: { $ne: req.params.id },
        });
        if (user) {
          throw createError("Mobile number already exists");
        }
      } catch (err) {
        throw createError(err.message);
      }
    }),
  check("password")
    .optional({ checkFalsy: true })
    .isStrongPassword()
    .withMessage(
      "Password must be at least 8 chars long, and should contain at least 1 lowercase, 1 uppercase, 1 number and 1 symbol"
    ),
];

const editUserValidationHandler = addUserValidationHandler;

module.exports = {
  addUserValidators,
  addUserValidationHandler,
  editUserValidators,
  editUserValidationHandler,
};
