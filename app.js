const express = require('express');
const app = express();
const userModel = require('./models/user.model');
const postModel = require('./models/post.model');
const commentModel = require('./models/comment.model');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const flash = require('connect-flash');
const expressSession = require('express-session');



require('./config/db.config'); 
app.set('view engine', 'ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(flash());
app.use(expressSession({
    resave:false,
    saveUninitialized : false,
    secret : "skjdfsiyfgsnf8"
}))


app.get('/', redirectToFeed ,(req, res) => {
    res.render('welcome')
});

app.get('/profile', isLoggedIn ,(req, res) => {
    res.render('profile')
})
   
app.get('/register', (req, res) => {
    res.render('register', {error : req.flash("error")[0]});
})

app.post('/register', async (req, res) => {
    const {username, password} = req.body;

    let user = await userModel.findOne({username});
    if(user) {
        // data
        req.flash("error", "account already exists, please login.")
        return res.redirect('/register');
    }
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            await userModel.create({
                username,
                password : hash
            })
        })
        let token = jwt.sign({username}, "secret") // don't do this extremely unsafe for representational purpose only.
        res.cookie("token", token);
        res.redirect('/profile')
    })
})

app.get('/login', (req, res) => {
    res.render('login', {error : req.flash("error")[0]});
})
 
app.post('/login' , async (req, res) => {
    const {username, password}  = req.body;
    let user = await userModel.findOne({username});
    if(!user) {
        req.flash("error", "username or password is invalid");
        return res.redirect('/login');
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if(result){
            let token = jwt.sign({username}, "secret"); //don't repeat this extremely unsafe
            res.cookie("token", token);
            res.redirect('/profile');
        }
        else {
            req.flash("error", "username or password is incorrect.")
            return res.redirect("/login");
        }
    })
}) 


app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect('/login');
})

app.get('/feed', isLoggedIn ,async (req, res) => {
    let tweets = await postModel.find();
    const loggedInUser = await userModel.findOne({username : req.user.username});
    res.render("feed", { tweets, id : loggedInUser._id });
})

app.get('/createpost', isLoggedIn , (req, res) => {
    res.render('createpost');
})

app.post('/createpost' , isLoggedIn , async (req, res) => {
    const { tweet } = req.body;
    const newTweet = await postModel.create({
        tweet,
        username : req.user.username
    })
    const loggedInUser = await userModel.findOne({username: req.user.username});
    loggedInUser.tweets.push(newTweet._id);
    loggedInUser.save();
    res.redirect('/feed');
})

app.get('/like-tweet/:id', isLoggedIn, async (req, res) => {
    const tweet = await postModel.findById(req.params.id);
    const user = await userModel.findOne({username : req.user.username});
    if(tweet.likes.includes(user._id)) {
        tweet.likes.splice(tweet.likes.indexOf(user._id), 1);
    }
    else {
        tweet.likes.push(user._id); 
    }
    await tweet.save();
    res.redirect('/feed');
}) 


app.post('/comment/:id', isLoggedIn , async (req, res) => {
    const loggedInUser = await userModel.findOne({username: req.user.username});
    console.log(req.body.comment);
    const newComment = await commentModel.create({
        user : loggedInUser._id,
        data : req.body.comment,
        tweet : req.params.id
    })

    const tweet = await postModel.findById(req.params.id);
    tweet.comment.push(newComment._id);
    tweet.save();
    res.redirect('/feed')
})



function isLoggedIn(req, res, next) {
    if(!req.cookies.token){
        req.flash("error", "you must be loggedin.");
        return res.redirect('/login');
    }
    jwt.verify(req.cookies.token, "secret", (err, decoded) => { // don't write secret here, unsafe
        if(err) {
            res.cookie("token", "");
            return res.redirect('/login');
        }else {
            req.user = decoded;
            next();
        }
    })
}

function redirectToFeed(req, res, next) {
    if(req.cookies.token) {
        jwt.verify(req.cookies.token, 'secret', (err, decoded) => {
            if(err) {
                req.cookie('token', "");
                return next();
            }
            else {
                return res.redirect('/feed');
            }
        })
    }
    else {
        return next();
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
