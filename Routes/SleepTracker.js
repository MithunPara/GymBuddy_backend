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

router.get('/getsleepbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) { // if no date is provided, give sleep entries for current date
        let date = new Date();
        user.sleep = filterEntriesbyDate(user.sleep, date);

        return res.json(createResponse(true, 'Sleep entries for today:', user.sleep));
    }

    user.sleep = filterEntriesbyDate(user.sleep, new Date(date));
    res.json(createResponse(true, 'Sleep entries for specified date:', user.sleep));
});

router.get('/getsleepbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All sleep entries:', user.sleep));
    } else {
        let date = new Date();
        let newDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        user.sleep = user.sleep.filter(entry => {
            return new Date(entry.date).getTime() >= newDate;
        });

        return res.json(createResponse(true, `Sleep entries for last ${limit} days:`, user.sleep));
    }
});

router.get('/getusersleepgoal', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
 
    let sleepTarget = 7;

    res.json(createResponse(true, "User's current sleep information:", { sleepTarget })); 
});

router.delete('/deletesleepentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide a date.'));
    }

    user.sleep = user.sleep.filter(entry => {
        return entry.date !== date;
    });

    await user.save();
    res.json(true, 'Sleep entry deleted successfully.');
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