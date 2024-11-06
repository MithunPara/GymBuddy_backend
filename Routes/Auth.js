const express = require('express');
const router = express.Router();
const User = require('../Models/UserSchema');
const errorHandler = require('../Middlewares/errorMiddleware');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// used to send OTP to other users, this user below acts as company email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cestunpere@gmail.com',
        pass: 'reaekwlditjbnhee',
    }
});

router.get('/test', async (req, res) => {
    res.json({
        message: 'Auth API is working'
    });
});

const createResponse = (ok, message, data) => {
    return {
        ok,
        message,
        data,
    };
}

router.post('/register', async (req, res, next) => {
    // Call the error middleware if the request cannot be handled successfully
    try {
        const { name, email, password, weight, height, gender, dob, goal, activityLevel } = req.body;
        const user = await User.findOne({ email: email }); // Query the database to check if the user already exists

        if (user) {
            // issue an error message if a user with the inputted email has been found
            return res.status(409).json(createResponse(false, 'User with this email already exists.'));
        }

        const newUser = new User({
            name,
            password,
            email,
            weight: [
                {
                    weight: weight,
                    // add a unit field for weight
                    date: Date.now(),
                }
            ],
            height: [
                {
                    height: height,
                    date: Date.now(),
                }
            ],
            gender, 
            dob,
            goal,
            activityLevel
        });
        await newUser.save(); // save the new user to database
        res.status(201).json(createResponse(true, 'User has registered successfully.')); // issue message once the new user has been successfully saved
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {}
    catch (err) {
        next(err);
    }
});
router.post('/sendotp', async (req, res, next) => {
    try {}
    catch (err) {
        next(err);
    }
});
router.post('/checklogin', async (req, res, next) => {
    try {}
    catch (err) {
        next(err);
    }
});
router.use(errorHandler);

module.exports = router;