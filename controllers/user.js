const bluebird = require('bluebird');
const crypto = bluebird.promisifyAll(require('crypto'));
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const Album = require('../models/Album');

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout();
    res.redirect('/');
};


/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    res.render('account/profile', {
        title: 'Account Management'
    });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    req.assert('email', 'Please enter a valid email address.').isEmail();
    req.sanitize('email').normalizeEmail({gmail_remove_dots: false});

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.email = req.body.email || '';
        user.profile.name = req.body.name || '';
        user.profile.gender = req.body.gender || '';
        user.profile.location = req.body.location || '';
        user.profile.website = req.body.website || '';
        user.save((err) => {
            if (err) {
                if (err.code === 11000) {
                    req.flash('errors', {msg: 'The email address you have entered is already associated with an account.'});
                    return res.redirect('/account');
                }
                return next(err);
            }
            req.flash('success', {msg: 'Profile information has been updated.'});
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/delete
 * Delete user account and all associated albums
 */
exports.postDeleteAccount = (req, res, next) => {
    User.remove({_id: req.user.id}, (err) => {
        if (err) {
            return next(err);
        }

        Album.remove({ownerMail: req.user.email}, (err) => {
            if (err) {
                return next(err);
            }
            req.logout();
            req.flash('info', {msg: 'Your account has been deleted.'});
            res.redirect('/');
        });
    });
};

