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
    }, function(error, response, body) {
    if(error) return console.error('Request failed:', error);
    else if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
    else console.log(body)
    });
});

router.post('/getcalorieintakebydate', authTokenHandler, async (req, res) => {

});

router.post('/getcalorieintakebylimit', authTokenHandler, async (req, res) => {

});

router.get('/getgoalcalorieintake', authTokenHandler, async (req, res) => {

});

router.delete('/deletecalorieintake', authTokenHandler, async (req, res) => {

});

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