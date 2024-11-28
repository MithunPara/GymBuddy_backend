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

router.post('/addwaterentry', authTokenHandler, async (req, res) => {
    const { date, amountInML } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !amountInML) {
        return res.status(400).json(createResponse(false, 'Please provide the date and amount of water.'));
    }

    user.water.push({
        date: new Date(date),
        amountInML,
    });

    await user.save();
    res.json(createResponse(true, 'Water entry added successfully.'));
});

router.get('/getwaterbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) { // if date not provided, get water entries for current date
        let date = new Date();
        user.water = filterEntriesbyDate(user.water, date);
        return res.json(createResponse(true, 'Water entries for today:', user.water));
    }

    user.water = filterEntriesbyDate(user.water, new Date(date));
    res.json(createResponse(true, 'Water entries for specified date:', user.water));
});

router.get('/getwaterbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All water entries:', user.water));
    } else {
        let date = new Date();
        let newDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        user.water = user.water.filter(entry => {
            return new Date(entry.date).getTime() >= newDate;
        });

        return res.json(createResponse(true, `Water entries for last ${limit} days:`, user.water));
    }
});

router.get('/getuserwatergoal', authTokenHandler, async (req, res) => {
    const waterGoal = 3000; // goal water amount provided in mL
    res.json(createResponse(true, "User's current water goal:", { waterGoal }));
});

router.delete('/deletewaterentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide a date.'));
    }

    user.water = user.water.filter(entry => {
        return entry.date !== date;
    });

    await user.save();
    res.json(createResponse(true, 'Water entry deleted successfully.'));
});

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