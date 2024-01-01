const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const paginate = require("express-paginate");
const app = express();

mongoose.connect("mongodb://0.0.0.0:27017/medical_store", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require("./models/User");
const Medicine = require("./models/medicine");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "pug");
app.use(
  session({ secret: "your-secret-key", resave: true, saveUninitialized: true })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(paginate.middleware(10, 50));

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.get("/medicine/search", isLoggedIn, async (req, res) => {
  const query = req.query.q;
  try {
    const medicines = await Medicine.find(
      { $text: { $search: query }, user: req.user },
      { score: { $meta: "textScore" } }
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
    console.error(error);
    res.redirect("/medicine");
  }
});

app.get("/medicine", isLoggedIn, async (req, res) => {
  try {
    const [medicines, itemCount] = await Promise.all([
      Medicine.find({ user: req.user })
        .sort({ createdAt: -1 })
        .skip(req.skip)
        .limit(req.query.limit)
        .lean()
        .exec(),
      Medicine.countDocuments({ user: req.user }),
    ]);

    const pageCount = Math.ceil(itemCount / req.query.limit);

    res.render("medicine", {
      medicines,
      pageCount,
      itemCount,
      pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
    });
  } catch (error) {
    console.error(error);
    res.redirect("/medicine");
  }
});

app.get("/medicine/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine || medicine.user.toString() !== req.user._id.toString()) {
      res.redirect("/medicine");
      return;
    }
    res.render("editMedicine", { medicine });
  } catch (error) {
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
      res.redirect("/medicine");
      return;
    }
    await Medicine.findByIdAndDelete(req.params.id);
    res.redirect("/medicine");
  } catch (error) {
    console.error(error);
    res.redirect("/medicine");
  }
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
