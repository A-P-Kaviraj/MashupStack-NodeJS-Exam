const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const app = express();

// MongoDB connection setup
mongoose.connect("mongodb://0.0.0.0:27017/medical_store", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const User = require("./models/User");
const Medicine = require("./models/medicine");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "pug");
app.use(
  session({ secret: "your-secret-key", resave: true, saveUninitialized: true })
);
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/medicine",
    failureRedirect: "/login",
  })
);

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  const newUser = new User({ username: req.body.username });
  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      console.error(err);
      return res.render("signup");
    }
    passport.authenticate("local")(req, res, () => {
      res.redirect("/medicine");
    });
  });
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/");
  });
});

// Medicine routes

app.get("/medicine/search", isLoggedIn, async (req, res) => {
  const query = req.query.q; // Get the search query from the URL parameter
  try {
    const medicines = await Medicine.find(
      { $text: { $search: query }, user: req.user },
      { score: { $meta: "textScore" } } // Sort by text score
    ).sort({ score: { $meta: "textScore" } });
    res.render("medicine", { medicines });
  } catch (error) {
    console.error(error);
    res.redirect("/medicine");
  }
});

app.post("/medicine/add", isLoggedIn, async (req, res) => {
  const { name, brand } = req.body;
  const newMedicine = new Medicine({ name, brand, user: req.user });

  try {
    await newMedicine.save();
    res.redirect("/medicine");
  } catch (error) {
    // Handle errors
    console.error(error);
    res.redirect("/medicine");
  }
});

app.get("/medicine", isLoggedIn, async (req, res) => {
  const medicines = await Medicine.find({ user: req.user });
  res.render("medicine", { medicines });
});

app.get("/medicine/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine || medicine.user.toString() !== req.user._id.toString()) {
      // Handle case where medicine is not found or user is unauthorized
      res.redirect("/medicine");
      return;
    }
    res.render("editMedicine", { medicine });
  } catch (error) {
    // Handle errors
    console.error(error);
    res.redirect("/medicine");
  }
});

app.post("/medicine/edit/:id", isLoggedIn, async (req, res) => {
  const { name, brand } = req.body;
  await Medicine.findByIdAndUpdate(req.params.id, { name, brand });
  res.redirect("/medicine");
});

app.get("/medicine/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine || medicine.user.toString() !== req.user._id.toString()) {
      // Handle case where medicine is not found or user is unauthorized
      res.redirect("/medicine");
      return;
    }
    await Medicine.findByIdAndDelete(req.params.id);
    res.redirect("/medicine");
  } catch (error) {
    // Handle errors
    console.error(error);
    res.redirect("/medicine");
  }
});

// Middleware to check if a user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
