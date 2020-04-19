const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
var router = require('express').Router();

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


app.get('/', (req, res) => {
  res.render('index');
});

app.get('/create', (req, res) => {
  res.render('index');
});

app.get('/links', (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
//ROUTER gives us separation of concerns for url endpoints (not needed here in this sprint)
    //provides clean file structure

//user must sign up (user posts req with username and pw)
//server receveives req and hashes pw before storing in DB
//user then logs in with username/pw (post req to server)
//server looks up username in db, hashes pw and compares it to stored value in DB
    //sends 401 if they don't match

//create a token that uniquely id's the user session
  //store session token in the db
  //attach to a response cookie to be returned to the client (set expiration dtg to limit the session)

app.post('/signup', (req, res, next) => {
  //set variables here for req.body
  var username = req.body.username;
  var password = req.body.password;

  //check for user
  models.Users.get({username})
    .then( user => {
      //if exists, redirect to signup
      if (user) {
        //redirect to /signup
        throw user;
      }
      //create a user
      models.Users.create({username, password});
    })
    .then(results=>{
      //upgrade session / associate with user
      return req.Sessions.update({hash: req.session.hash}, {userId: results.insertId});
    })
    .then(user=>{
      res.redirect('/');
    })
    .catch((user)=>{
      res.redirect('/signup');
    })
    //if exists, redirect to /signup
  //create a user
  //upgrade session / associate with user
  //redirect user to / route


  /* OUR ATTEMPT
  models.Users.create(req.body)
  // .then(res.redirect('/signup'))
  .then(input => {
    res.redirect(200, '/');
  })

  .error(error => {
      res.redirect('/signup');
  })
  .catch(link => {
    res.status(200).send(link);
  })
*/
});


// app.get('/signup', (req, res) => {
//   //send req to somewhere (models)
//   res.render('signup');
// });

app.post('/login', (req, res, next) => {
  models.Users.login(req.body)
  .then(input => {
    //if they are found in the db, compare the values
    res.redirect('/');
  })
  .error(error => {
    res.redirect('/login');
  })

  // .catch(link => {
  //   res.status(200).send(link);
  // })
});


app.get('/login', (req, res) => {
  //send req to somewhere (models)
  res.render('login');
});


// app.post('/signup', (req, res) => { //signup should create an account
//   //how & where to we pass information

// });

// app.post('/login', (req, res) => { //login to the middleware auth file
//   //stuff
// });
/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });

    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;