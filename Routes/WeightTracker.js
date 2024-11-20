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

router.post('/addweightentry', authTokenHandler, async (req, res) => {
    const { date, weightInLbs } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !weightInLbs) {
        return res.status(400).json(createResponse(false, 'Please provide the date and weight.'));
    }

    user.weight.push({
        date: new Date(date),
        weight: weightInLbs,
    });

    await user.save();
    res.json(createResponse(true, 'Weight entry added successfully.'));
});

router.get('/getweightbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) { // if date not provided, get weight entry for current date
        let date = new Date();
        user.weight = filterEntriesbyDate(user.weight, date);
        return res.json(createResponse(true, 'Weight entry for today:', user.weight));
    }

    user.weight = filterEntriesbyDate(user.weight, new Date(date));
    res.json(createResponse(true, 'Weight entries for specified date:', user.weight));
});

router.get('/getweightbylimit', authTokenHandler, async (req, res) => {

});

router.get('/getuserweightgoal', authTokenHandler, async (req, res) => {
    
});

router.delete('/deleteweightentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide a date.'));
    }

    user.weight = user.weight.filter(entry => {
        return entry.date !== date;
    });

    await user.save();
    res.json(createResponse(true, 'Weight entry deleted successfully.'));
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