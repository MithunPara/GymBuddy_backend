const express = require('express');
const router = express.Router();
const authTokenHandler = require('../Middlewares/checkAuthToken');
const errorHandler = require('../Middlewares/errorMiddleware');
const request = require('request'); // Used to call external APIs
const jwt = require('jsonwebtoken');
const User = require('../Models/UserSchema');
require('dotenv').config();

const createResponse = (ok, message, data) => {
    return {
        ok,
        message,
        data,
    };
}

router.get('/test', authTokenHandler, async (req, res) => {
    res.json(createResponse(true, 'Test API is working for calorie intake reports.'));
});

router.post('/addcalorieintake', authTokenHandler, async (req, res) => {
    const { item, date, amount, amountType } = req.body;

    if (!item || !date || !amount || !amountType) {
        return res.status(401).json(createResponse(false, 'Please provide all the details.'));
    }

    let amountInGrams = 0;
    // Fix these conversions after, mL and L don't directly convert to grams based on liquid type
    if (amountType === 'g' || amountType === 'ml') {
        amountInGrams = amount;
    }
    else if (amountType === 'kg' || amountType === 'l') {
        amountInGrams = amount * 1000;
    }
    else {
        res.status(400).json(createResponse(false, 'Invalid amount type.'));
    }

    var query = item;
    request.get({
    url: 'https://api.api-ninjas.com/v1/nutrition?query=' + query,
    headers: {
        'X-Api-Key': process.env.NUTRITION_API_KEY,
    },
    }, async function(error, response, body) {
    if(error) return console.error('Request failed:', error);
    else if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
    else {
        body = JSON.parse(body);
        // Amount of calories per gram of the food item * number of grams eaten
        let calorieIntake = (body[0].calories / body[0].serving_size_g) * parseFloat(amountInGrams);
        const userId = req.userId;
        const user = await User.findById({ _id: userId });
        // update the logged in user's calorie intake
        user.calorieIntake.push({
            item,
            date: new Date(date),
            amount,
            amountType,
            calorieIntake: parseFloat(calorieIntake)
        });

        await user.save();
        res.json(createResponse(true, 'Calorie intake updated successfully.'));
    }
    });
});

router.post('/getcalorieintakebydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if (!date) {
        let date = new Date(); // If there is no inputted date, check today's date
        user.calorieIntake = filterEntriesbyDate(user.calorieIntake, date);
        return res.json(createResponse(true, 'Calorie intake for today:', user.calorieIntake));
    }

    user.calorieIntake = filterEntriesbyDate(user.calorieIntake, date);
    res.json(createResponse(true, 'Calorie intake for specified date:', user.calorieIntake));
});

router.post('/getcalorieintakebylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if(!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'Calorie intake:', user.calorieIntake));
    } else {
        let date = new Date();
        date.setDate(date.getDate() - parseInt(limit));
        user.calorieIntake = filterEntriesbyDate(user.calorieIntake, date);
        return res.json(createResponse(true, `Calorie intake for last ${limit} days:`, user.calorieIntake));
    }
});

router.get('/getgoalcalorieintake', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    let intakeTarget = 0;
    let heightInCm = parseFloat(user.height[user.height.length - 1].height);
    let weightInKg = parseFloat(user.weight[user.weight.length - 1].weight);
    let age = new Date().getFullYear - new Date(user.dob).getFullYear();
    let BMR = 0; // Basal metabolism rate, number of calories burned at rest/just from your body performing life-sustaining functions
    let gender = user.gender;

    if (gender == 'male') {
        BMR = 88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age);
    } else if (gender == 'female') {
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age);
    } else {
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age);
    }

    if (user.goal == 'weightLoss') {
        intakeTarget = BMR - 500;
    } else if (user.goal == 'weightGain') {
        intakeTarget = BMR + 500;
    } else {
        intakeTarget = BMR;
    }

    res.json(createResponse(true, 'Recommended calorie intake:', {intakeTarget}));
});

router.delete('/deletecalorieintake', authTokenHandler, async (req, res) => {
    const { item, date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId});
    if (!item || !date) {
        return res.status(400).json(createResponse(false, 'Please provide all the details.'));
    }

    user.calorieIntake = user.calorieIntake.filter(entry => {
        return entry.date != date && entry.item != item;
    });

    await user.save();
    res.json(createResponse(true, 'Calorie intake deleted successfully.'));
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