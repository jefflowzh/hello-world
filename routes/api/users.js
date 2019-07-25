const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");

// Load input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// Load User model
const User = require("../../models/User");

//register endpoint
router.post("/register", (req, res) => {
  // Form validation
  const { errors, isValid } = validateRegisterInput(req.body);
  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      });
      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});

//login endpoint
router.post("/login", (req, res) => {
  // Form validation
  const { errors, isValid } = validateLoginInput(req.body);
  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const email = req.body.email;
  const password = req.body.password;
  // Find user by email
  User.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }
    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };
        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926 // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});

router.post("/caregiverCheck", (req, res) => {
  User.findOne({ email: req.body.email }).then(r =>
    res.json(r.isRegisteredCaregiver)
  );
});

router.post("/listings/new", (req, res) => {
  User.findOneAndUpdate(
    { email: req.body.email },
    {
      isRegisteredCaregiver: true,
      isMedicalEscort: req.body.isMedicalEscort,
      isBefriender: req.body.isBefriender,
      isNurse: req.body.isNurse,
      race: req.body.race,
      religion: req.body.religion,
      languages: req.body.languages,
      description: req.body.description
    }
  ).then(user => res.json(user));
});

router.get("/dashboard", (req, res) => {
  User.find({ isRegisteredCaregiver: true }).then(result => res.json(result));
});

router.post("/dashboard/search", (req, res) => {
  User.find({ $text: { $search: req.body.query } }).then(result =>
    res.json(result)
  );
});

module.exports = router;