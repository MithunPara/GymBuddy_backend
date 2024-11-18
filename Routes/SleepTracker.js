const express = require('express');
const router = express.Router();
const authTokenHandler = require('../Middlewares/checkAuthToken');
const errorHandler = require('../Middlewares/errorMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../Models/UserSchema');

const createResponse = (ok, message, data) => {
    return {
        ok,
        message,
        data,
    };
}

router.post('/addsleepentry', authTokenHandler, async (req, res) => {
    const { date, hoursSlept } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !hoursSlept) {
        res.status(400).json(createResponse(false, 'Please provide the date and number of hours slept.'));
    }

    user.sleep.push({
        date: new Date(date),
        hoursSlept,
    });

    await user.save();
    res.json(createResponse(true, 'Sleep entry added successfully.'));
});