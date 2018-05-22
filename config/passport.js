const passport = require('passport');
const request = require('request');
const refresh = require('passport-oauth2-refresh');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Sign in with Google.
 * in order to get a refreshToken for continuous access, we request
 * the accessType: offline
 * If the User is already created, we log him in via the Google api,
 * otherwise, the user is created
 */

var googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true,
    accessType: 'offline'
}, (req, accessToken, refreshToken, profile, done) => {
    if (req.user) {
        User.findOne({ google: profile.id }, (err, existingUser) => {
            if (err) { return done(err); }
            if (existingUser) {
                req.flash('errors', { msg: 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
                done(err);
            } else {
                User.findById(req.user.id, (err, user) => {
                    if (err) { return done(err); }
                    user.google = profile.id;
                    user.accessToken=accessToken;
                    user.refreshToken=refreshToken;
                    user.profile.name = user.profile.name || profile.displayName;
                    user.profile.gender = user.profile.gender || profile._json.gender;
                    user.profile.picture = user.profile.picture || profile._json.image.url;
                    user.save((err) => {
                        req.flash('info', { msg: 'Google account has been linked.' });
                        done(err, user);
                    });
                });
            }
        });
    } else {
        //create a new User
        User.findOne({ google: profile.id }, (err, existingUser) => {
            if (err) { return done(err); }
            if (existingUser) {
                return done(null, existingUser);
            }
            User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
                if (err) { return done(err); }
                if (existingEmailUser) {
                    req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
                    done(err);
                } else {
                    const user = new User();
                    user.email = profile.emails[0].value;
                    user.google = profile.id;
                    user.accessToken=accessToken;
                    user.refreshToken=refreshToken;
                    user.profile.name = profile.displayName;
                    user.profile.gender = profile._json.gender;
                    user.profile.picture = profile._json.image.url;
                    user.save((err) => {
                        done(err, user);
                    });
                }
            });
        });
    }
});


passport.use(googleStrategy);
refresh.use(googleStrategy);

/*
  Refresh the access token using the refresh token that was
  stored in the user due to accesType: offline
 */
exports.refreshAccessToken = (id, callback) =>{
    User.findById(id, (err, user) => {
        if (err) { return done(err); }
        refresh.requestNewAccessToken('google', user.refreshToken, function(err, accessToken) {
            if (err) {console.error(err);}
            user.accessToken=accessToken;
            //user.refreshToken=refreshToken;
            user.save((err) => {
                console.error(err);
            });
            return callback(accessToken);
        });
    });
};




/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};
