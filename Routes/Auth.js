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
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            // if a user with the inputted email/password cannot be found
            return res.status(400).json(createResponse(false, 'User with this email does not exist.'))
        }

        // must use bcrypt to compare passwords because password is encrypted in database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json(createResponse(false, 'Incorrect password.'))
        }

        // if a user with the inputted details exists, generate an auth token and refresh token
        const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '60m' }); // Auth token is used to access resources within the webpage
        const refreshToken = jwt.sign({ userId: user._id}, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '120m' }); // Refresh token used to generate new auth and refresh tokens once a user's initial session has been completed to continue using the site

        // saving tokens in the cookies
        res.cookie('authToken', authToken, { httpOnly: true });
        res.cookie('refreshToken', refreshToken, { httpOnly: true });
        res.status(200).json(createResponse(true, 'Successfully logged in.', {
            authToken, // If the cookies are not working, send the tokens directly to the frontend as well
            refreshToken
        }));
    }
    catch (err) {
        next(err);
    }
});

router.post('/sendotp', async (req, res, next) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000); // Generates a 6 digit one-time password number, not the most secure option for OTP generation

        const mailDetails = {
            from: 'cestunpere@gmail.com',
            to: email,
            subject: "OTP Verification",
            text: `Your OTP for verification is ${otp}`
        }

        // Use nodemailer transporter to send OTP email
        transporter.sendMail(mailDetails, async (err, info) => {
            if (err) {
                console.log(err);
                res.status(500).json(createResponse(false, err.message));
            } else {
                res.json(createResponse(true, 'OTP has been sent successfully', { otp }));
            }
        });
    }
    catch (err) {
        next(err);
    }
});

router.post('/checklogin', authTokenHandler, async (req, res, next) => {
    res.json({
        ok: true,
        message: 'User has been successfully authenticated.'
    });
});

router.post('/signout', authTokenHandler, async (req, res, next) => {
    try {
        res.clearCookie('authToken');
        res.clearCookie('refreshToken');
        res.status(200).json(createResponse(true, 'Successfully signed out.'));
    }
    catch (err) {
        next(err);
    }
});

router.use(errorHandler);

module.exports = router;