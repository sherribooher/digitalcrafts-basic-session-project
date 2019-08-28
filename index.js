var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var db = require('./models');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
// initialize connect-session-sequelize
var SequelizeStore = require('connect-session-sequelize')(session.Store);

// connect sequelize session to sequelize db
var myStore = new SequelizeStore({
  db: db.sequelize
});

var app = express();

app.use(cookieParser());

// set the store to myStore where we connect the db details
app.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: true,
  store: myStore
}));

myStore.sync();

// Middleware 
app.use(bodyParser.urlencoded({
  extended: false
}));

// write app middleware to check if user session has user_id set: if it does, continue, otherwise
// redirect to login page
app.use(function (req, res, next) {
  if (req.session.user_id !== undefined) {
    next();
  } else if (req.path === "/login") { // let user through if they are trying to get directly to the login page
    next();
  } else {
    res.redirect("/login");
  }
});

app.set('view engine', 'ejs');
app.set('views', 'app/views')

app.get("/first", function (req, res, next) {
  var param = req.query.param;
  req.session.param = param;
  res.send("OK");
});

app.get("/second", function (req, res, next) {
  var param = req.session.param;
  res.send(param);
  console.log(param);
});

app.get("/signup", function (req, res, next) {
  // just return the signup form
  res.render('signup');
});

app.get("/signOut", function (req, res, next) {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/login", function (req, res, next) {
  res.render('login', { error_message: '' }); // use ejs "locals" (variables) for displaying any error messages
});

// use middleware body-parser for posting form info to db
app.post("/signup", function (req, res, next) {
  // check to make sure the user isn't already signed up
  // if they are, just redirect them to the welcome page
  if (req.session.user_id !== undefined) {
    res.redirect("/welcome");
    return;
  }
  // get email and password from the POST request
  var email = req.body.email;
  var password = req.body.password;
  // hash the password before saving into db
  bcrypt.hash(password, 10, function (err, hash) {
    db.user.create({ email: email, password_hash: hash }).then(function (user) {
      req.session.user_id = user.id; // set the session userID to the signed up user_id attribute
      res.redirect("/welcome"); // send the user to the "welcome" route
    });
  });
});

app.post("/login", function (req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  // make sure there is a user account for the login
  db.user.findOne({ where: { email: email } }).then(function (user) {
    if (user.id === undefined) {
      res.render("/login", { error_message: 'No user found' });
    } else {
      // compare password for login
      bcrypt.compare(password, user.password_hash, function (err, matched) {
        if (matched) {
          //set user id in the session and redirect to welcome
          req.session.user_id = user.id;
          res.redirect("/welcome");
        } else {
          //no match - render login form again
          res.render("login", { error_message: 'Wrong password' });
        }
      });
    }
    res.send("OK");
  })
});

app.get("/welcome", function (req, res, next) {
  // grab user id from the session
  var user_id = req.session.user_id;
  // query the user model from db and use a callback to accept the user and set email and user_id
  db.user.findByPk(user_id).then(function (user) {
    var email = user.email;
    res.render('welcome', {
      email: email,
      user_id: user_id
    });
  });
});

app.listen(3000, function () {
  console.log("Listening on port 3000...");
});