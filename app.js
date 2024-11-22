const express = require('express');
const userModel = require('./models/user.model');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const app = express();
require('./config/db.config'); 
app.set('view engine', 'ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())


app.get('/', (req, res) => {
    res.render('welcome')
});

app.get('/profile', isLoggedIn ,(req, res) => {
    res.render('profile')
})
  
app.get('/register', (req, res) => {
    res.render('register');
})

app.post('/register', (req, res) => {
    const {username, password, email} = req.body;
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
    res.render('login');
})

app.post('/login' , async (req, res) => {
    const {username, password}  = req.body;
    let user = await userModel.findOne({username});
    if(!user) return res.send("invalid username or password")

    bcrypt.compare(password, user.password, (err, result) => {
        if(result){
            let token = jwt.sign({username}, "secret"); //don't repeat this extremely unsafe
            res.cookie("token", token);
            res.redirect('/profile');
        }
        else {
            return res.send("invalid username or password");
        }
    })
})


app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect('/login');
})

function isLoggedIn(req, res, next) {
    if(!req.cookies.token)return res.redirect('/login');
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
