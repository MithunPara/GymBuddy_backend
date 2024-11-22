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

router.post('/addworkoutentry', authTokenHandler, async (req, res) => {
    const { date, exercise, lengthMinutes } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !exercise || !lengthMinutes) {
        res.status(400).json(createResponse(false, 'Please provide all details.'));
    }

    user.workouts.push({
        date: new Date(date),
        exercise,
        lengthMinutes,
    });

    await user.save()
    res.json(createResponse(true, 'Workout entry added successfully.'));
});

router.get('/getworkoutsbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) { // if date is not provided, give current date's workout entries
        let date = new Date();
        user.workouts = filterEntriesbyDate(user.workouts, date);
        return res.json(createResponse(true, 'Workout entries for today:', user.workouts));
    }

    user.workouts = filterEntriesbyDate(user.workouts, new Date(date));
    res.json(createResponse(true, 'Workout entries for specified date:', user.workouts));
});

router.get('/getworkoutsbylimit', authTokenHandler, async (req, res) => {

});

router.get('/getuserworkouts', authTokenHandler, async (req, res) => {

});

router.delete('/deleteworkoutentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    
    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide a date.'));
    }

    user.workouts = user.workouts.filter(entry => {
        return entry.date !== date;
    })
    await user.save();
    res.json(createResponse(true, 'Workout entry deleted successfully.'));
})

router.use(errorHandler);

const filterEntriesbyDate = (entries, targetDate) => {
    return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}

module.exports = router;