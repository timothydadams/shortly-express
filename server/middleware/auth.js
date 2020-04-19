const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //check for session cookie
  Promise.resolve(req.cookies.shortlyid)
    .then((hash) => {
      //if !exists-> make a new session
      if (!hash) {
        //make a session
        throw hash;
      }
      //attempt load session from db
      return models.Sessions.get({hash});
    })
    .tap((session) => {
      // if !exists->make a new session
      if (!session) {
        //make a session
        throw session;
      }
    })
    .catch(()=>{
      //make a session
      return models.Sessions.create()
        .then(results => {
          return models.Sessions.get({id: results.insertId});
        })
        .tap(session => {
          res.cookie('shortlyid', session.hash);
        })
    })
    .then((session) => {
      req.session = session;
      next();
    });

  //check for session cookie
  //if !exists -> make a new session
  // attempt load session from db
  // if !exist-> make a new session
  //otherwise set session on req object
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

