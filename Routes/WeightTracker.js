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
    const { date, weightInKg } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !weightInKg) {
        return res.status(400).json(createResponse(false, 'Please provide the date and weight.'));
    }

    user.weight.push({
        date: new Date(date),
        weight: weightInKg,
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
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All weight entries:', user.weight));
    } else {
        let date = new Date();
        let newDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        user.weight = user.weight.filter(entry => {
            return new Date(entry.date).getTime() >= newDate;
        });

        return res.json(createResponse(true, `Weight entries for last ${limit} days:`, user.weight));
    }
});

router.get('/getuserweightgoal', authTokenHandler, async (req, res) => {
    // Currently using BMI range to set weight goal, may not be the most accurate approach as
    // it can vary based on person's body fat, activity levels, whether they are a lifter, etc. 

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    const minBMI = 18.5;
    const maxBMI = 24.9;
    // assumes that height is inputted in cm
    // Calculation: BMI * (height in m)^2 
    const minWeight = minBMI * ((user.height[user.height.length - 1].height / 100) ** 2);
    const maxWeight = maxBMI * ((user.height[user.height.length - 1].height / 100) ** 2);

    const currentWeight = user.weight.length > 0 ? user.weight[user.weight.length - 1].weight : null;
    const goalWeightRange = `Healthy weight range for your height: ${minWeight.toFixed(1)} kg - ${maxWeight.toFixed(1)} kg.`;

    res.json(createResponse(true, 'Goal weight range for user:', { currentWeight, goalWeightRange }));
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