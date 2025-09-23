const { body, validationResult } = require("express-validator");

const unandEmailRegex = /@([a-z0-9.-]+\.)?unand\.ac\.id$/i;

const validateRegister = [
  body("email")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((value) => {
      if (!unandEmailRegex.test(value)) {
        throw new Error("Harap gunakan email Unand");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name").notEmpty().withMessage("Name is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((value) => {
      if (!unandEmailRegex.test(value)) {
        throw new Error("Harap gunakan email Unand");
      }
      return true;
    }),
  body("password").notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateRegister,
  validateLogin,
};
