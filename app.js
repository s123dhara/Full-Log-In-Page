const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");

// Extra packages
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("connect-flash");
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')


// Database connectivity
const userModel = require("./db/conn");
const adminModel = require("./db/admin")
const postModel = require('./db/post');

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
app.use(cookieParser())

// Routes
app.get("/", (req, res) => {
  res.render("home");
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
  let { username ,email, password } = req.body;

  // Check if user is already in the database
  let checkUser = await userModel.findOne({ email: email });
  if (!checkUser) {
    let saltrounds = 10;
    let hashPassword = await bcrypt.hash(password, saltrounds);
    console.log(hashPassword);

    let user = await userModel.create({
      username : username,
      email: email,
      password: hashPassword,
    });
    console.log(user);
    res.redirect("/");
  } else {
    req.flash("error", "User Already Exists");
    res.redirect("/signup");
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
        let token = jwt.sign({email : email , userid : checkUser._id}, "secretkey")
        res.cookie("token", token)
    //   res.send("Authentic User");
    res.redirect('/profile')
    } else {
      req.flash("error", "Password does not match");
      res.redirect("/login");
    }
  }
});



app.get('/logout', async (req, res)=>{
    res.cookie("token", "")
    res.redirect('/')
})

app.get('/profile', isUserLoggedIn, async (req, res)=>{

    let user = await userModel.findOne({email : req.user.email}).populate("posts")
    console.log(user)

    res.render('profile', {user})
})



// POST MAKING 
app.post('/post/', isUserLoggedIn ,async (req, res)=>{

    let user = await userModel.findOne({email : req.user.email})

    let post = await postModel.create({
        user : user._id,
        content : req.body.content
    })

    //important to save
    user.posts.push(post._id)
    user.save();

    res.redirect('/profile')
})

app.get('/like/:id', isUserLoggedIn, async (req, res)=>{
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user");
        
        // if (!post) {
        //     res.redirect('/profile');
        // }

        const userId = req.user.userid;
        const likeIndex = post.likes.indexOf(userId);

        if (likeIndex === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.redirect('/profile');
    }
})
app.get('/edit/:id', isUserLoggedIn, async (req, res) => {
    // let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    // let user = await userModel.findOne({email : req.user.email})
    res.render('editpost')
})

// app.post('/update/:id', isUserLoggedIn, async (req, res)=>{

//     let post = await postModel.findOneAndUpdate({_id : req.params.id}, {content : req.body.content})
//     res.redirect('/profile')

// })

//admin read
app.get('/read', isAdmingLoggedIn, async (req, res)=>{

    let users = await userModel.find()

    console.log(users)
    res.render('read', {users} )
})


app.get('/edituser/:id', async(req, res)=>{

    let user = await userModel.findOne({_id : req.params.id})
    console.log("user details fetch "+user)

    res.render('edituser', {user})
})
app.get('/deleteuser/:id', async(req, res)=>{

    let user = await userModel.findOneAndDelete({_id : req.params.id})
    console.log("user details fetch "+user)

    res.redirect('/read')
})

app.post('/updateuser/:id' , async (req, res)=>{

    let {email, password} = req.body

    let saltrounds = 10;
    let hashPassword = await bcrypt.hash(password, saltrounds);

    let user = await userModel.findOneAndUpdate({_id : req.params.id}, {
        email : email,
        password : hashPassword
    })

    res.redirect('/read')

    

})




//admin access
app.get('/adminlogin', async (req , res)=>{
    const error = req.flash("error");
    console.log(error);
    res.render('admin', {error})
})

app.post('/adminlogin', async (req , res)=>{
    
    let admin = await adminModel.findOne({email : req.body.email})

     if (!admin) {
    req.flash("error", "Admin not found");
    res.redirect("/adminlogin");
    } else {
    let result = await bcrypt.compare(req.body.password, admin.password);
    if (result) {
        let token = jwt.sign({email : req.body.email, adminid : admin._id}, "secretkey")
        res.cookie("token", token)
            // res.send("You can log in")
        res.redirect('/read')
    } else {
      req.flash("error", "Password does not match");
      res.redirect("/adminlogin");
    }
    }
    
})

app.get('/adminlogout', async (req, res)=>{

    res.cookie("token", "")
    res.redirect('/')
})

function isAdmingLoggedIn(req, res, next){
    if(req.cookies.token === "") {
        res.redirect("/adminlogin");
    } else {
        try {
            let data = jwt.verify(req.cookies.token, "secretkey");
            console.log("data ",data)
            req.user = data; // Correctly assign the verified data to req.user
            // res.redirect('/profile')
            next();
        } catch (err) {
            res.redirect("/");
        }
    }
}
function isUserLoggedIn(req, res, next){
    if(req.cookies.token === "") {
        res.redirect("/login");
    } else {
        try {
            let data = jwt.verify(req.cookies.token, "secretkey");
            console.log("data ",data)
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
