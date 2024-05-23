const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");

// Extra packages
const multer = require('multer');
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("connect-flash");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const crypto = require('crypto')

// Database connectivity
const userModel = require("./db/conn");
const adminModel = require("./db/admin");
const postModel = require("./db/post");
const uploadModel = require('./db/upload')

// Middleware setup
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
app.use(cookieParser());


// form data upload with image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12,(err, bytes)=>{
      const fn = bytes.toString("hex") + path.extname(file.originalname)
      cb(null, fn)
    })
  }
})
const upload = multer({storage: storage})


// Routes
app.get("/", (req, res) => {
  let isLoggedIn = false;
  if (req.cookies.token) {
    try {
      let data = jwt.verify(req.cookies.token, "secretkey");
      isLoggedIn = true;
    } catch (err) {
      // Invalid token, consider user as not logged in
    }
  }
  res.render("home", { isLoggedIn });
});

app.get("/login", (req, res) => {
  const error = req.flash("error");
  console.log(error);
  res.render("login", { error });
});

app.get("/signup", (req, res) => {
  const error = req.flash("error");
  console.log(error);
  res.render("signup", { error });
});

app.post("/signup", async (req, res) => {
  let { username, email, password } = req.body;

  // Check if user is already in the database
  let checkUser = await userModel.findOne({ email: email });
  if (!checkUser) {
    let saltrounds = 10;
    let hashPassword = await bcrypt.hash(password, saltrounds);
    console.log(hashPassword);

    let user = await userModel.create({
      username: username,
      email: email,
      password: hashPassword,
    });
    console.log(user);
    let userId = user._id;
    res.redirect(`/upload/${userId}`)
  } else {
    req.flash("error", "User Already Exists");
    res.redirect("/signup");
  }
});

app.get('/upload/:id', async (req, res)=>{
  
  // let user = await userModel.findOne({_id : req.body._id})
  // console.log(user)
  console.log(req.params.id)
  let  userId = req.params.id
  res.render('upload' ,{userId} )
})

app.post('/upload/:id', upload.fields([{ name: 'profile' }, { name : 'signature' }]), async (req, res) => {
  try {
    let uploadImages = await uploadModel.create({
      user: req.params.id,
      profile: req.files.profile[0].filename,
      signature: req.files.signature[0].filename
    });

    // console.log(uploadImages)
    let user = await userModel.findOne({_id : req.params.id})
    user.upload = uploadImages._id
    await user.save()
    // res.send(user)
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  let checkUser = await userModel.findOne({ email: email });
  if (!checkUser) {
    req.flash("error", "User not found");
    res.redirect("/login");
  } else {
    let result = await bcrypt.compare(password, checkUser.password);
    if (result) {
      let token = jwt.sign(
        { email: email, userid: checkUser._id },
        "secretkey"
      );
      res.cookie("token", token);
      //   res.send("Authentic User");
      res.redirect("/profile");
    } else {
      req.flash("error", "Password does not match");
      res.redirect("/login");
    }
  }
});

app.get("/forget", async (req, res) => {
  const error = req.flash("error");
  res.render("forget", { error });
});

app.post("/forget", async (req, res) => {
  let user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error", "User Does not Exist");
    return res.redirect("/forget");
  }
  // Redirect to the recover route with the user ID in the URL
  res.redirect(`/recover/${user._id.toString()}`);
});

app.get("/recover/:userId", async (req, res) => {
  const userId = req.params.userId;
  let user = await userModel.findOne({ _id: userId });
  // console.log(user)
  // Pass the userId to the recover view
  res.render("recover", { user });
});

app.post("/updatepassword/:id", async (req, res) => {
  let hashedPassword = await bcrypt.hash(req.body.password, 10);

  let user = await userModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      password: hashedPassword,
    }
  );

  res.redirect("/login");
});

app.get("/logout", async (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});

app.get("/profile", isUserLoggedIn, async (req, res) => {
  try {
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("posts");
    // let post = await postModel.findOne({user : req.user.userid})
    console.log(user);
    res.render("profile", { user });
  } catch {
    res.redirect("/login");
  }
});

// POST MAKING
app.post("/post/", isUserLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });

  let post = await postModel.create({
    user: user._id,
    content: req.body.content,
  });

  //important to save
  user.posts.push(post._id);
  user.save();

  res.redirect("/profile");
});

app.get("/like/:id", isUserLoggedIn, async (req, res) => {
  console.log("req.body : ", req.user);
  let post = await postModel.findOne({ _id: req.params.id });

  let idx = post.likes.indexOf(req.user.userid);
  if (idx === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(idx, 1);
  }
  await post.save();
  res.redirect("/profile");
  // let result = post.likes.indexOf(req.user.userid)
  // console.log(result)
});
app.get("/edit/:id", isUserLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id });
  // let user = await userModel.findOne({email : req.user.email})
  res.render("editpost", { post });
});

app.post("/update/:id", isUserLoggedIn, async (req, res) => {
  let { content } = req.body;
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      content: content,
    }
  );
  res.redirect("/profile");
});

app.get("/delete/:id", isUserLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndDelete({ _id: req.params.id });
  let user = await userModel.findOne({ _id: req.user.userid });

  let postidindex = user.posts.indexOf(req.params.id);
  // console.log("post index ",postidindex)

  let temp = user.posts.splice(postidindex, 1);
  // console.log('temp------------------------> ',temp)

  await user.save();

  res.redirect("/profile");
});

//admin read

app.get("/read", async (req, res) => {
  try {
    // First, find the users
    let users = await userModel.find().populate("upload");
    res.render("read", { users });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/edituser/:id", async (req, res) => {
  let user = await userModel.findOne({ _id: req.params.id });
  console.log("user details fetch " + user);

  res.render("edituser", { user });
});
app.get("/deleteuser/:id", async (req, res) => {
  let user = await userModel.findOne({ _id: req.params.id }).populate("posts");

  user.posts.forEach(async (postid) => {
    let post = await postModel.findOneAndDelete({ _id: postid });
  });

  await user.deleteOne();
  // console.log("user details fetch "+user)

  res.redirect("/read");
});

app.post("/updateuser/:id", async (req, res) => {
  let { email, password } = req.body;

  let saltrounds = 10;
  let hashPassword = await bcrypt.hash(password, saltrounds);

  let user = await userModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      email: email,
      password: hashPassword,
    }
  );

  res.redirect("/read");
});

//admin access
app.get("/adminlogin", async (req, res) => {
  const error = req.flash("error");
  console.log(error);
  res.render("admin", { error });
});

app.post("/adminlogin", async (req, res) => {
  let admin = await adminModel.findOne({ email: req.body.email });

  if (!admin) {
    req.flash("error", "Admin not found");
    res.redirect("/adminlogin");
  } else {
    let result = await bcrypt.compare(req.body.password, admin.password);
    if (result) {
      let token = jwt.sign(
        { email: req.body.email, adminid: admin._id },
        "secretkey1"
      );
      res.cookie("token", token);
      // res.send("You can log in")
      res.redirect("/read");
    } else {
      req.flash("error", "Password does not match");
      res.redirect("/adminlogin");
    }
  }
});

app.get("/adminlogout", async (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});

function isAdmingLoggedIn(req, res, next) {
  if (req.cookies.token === "") {
    res.redirect("/adminlogin");
  } else {
    try {
      let data = jwt.verify(req.cookies.token, "secretkey1");
      console.log("data ", data);
      req.user = data; // Correctly assign the verified data to req.user
      // res.redirect('/profile')
      next();
    } catch (err) {
      res.redirect("/");
    }
  }
}
function isUserLoggedIn(req, res, next) {
  if (req.cookies.token === "") {
    res.redirect("/login");
  } else {
    try {
      let data = jwt.verify(req.cookies.token, "secretkey");
      console.log("data ", data);
      req.user = data; // Correctly assign the verified data to req.user
      // res.redirect('/profile')
      next();
    } catch (err) {
      res.redirect("/");
    }
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
