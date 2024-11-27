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

router.post('/searchfood', authTokenHandler, async (req, res) => {
    const { query } = req.body;

    const options = {
        url: 'https://api.nal.usda.gov/fdc/v1/foods/search',
        qs: {
            api_key: process.env.USDA_API_KEY,
            query: query
        },
        headers: {
            'Content-Type': 'application/json'
        }
    }

    request.get(options, async function (error, response, body) {
        if (error) return console.error('Request failed:', error);
        else if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
        else {
            const data = JSON.parse(body);
            const foodList = data.foods.map(food => {
                return {
                    fdcId: food.fdcId,
                    description: food.description,
                    ingredients: food.ingredients
                }
            });

            res.json(createResponse(true, 'List of matching food items retrieved successfully.', foodList));
        }
    });
});

router.post('/getnutrients', authTokenHandler, async (req, res) => {
    const { fdcId } = req.body;

    const options = {
        url: `https://api.nal.usda.gov/fdc/v1/foods/${fdcId}`,
        qs: {
            api_key: process.env.USDA_API_KEY,
        },
        headers: {
            'Content-Type': 'application/json'
        }
    }

    request.get(options, async function (error, response, body) {
        if (error) return console.error('Request failed:', error);
        else if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
        else {
            const data = JSON.parse(body);
            const nutrients = data.foodNutrients.filter(nutrient => [
                'Energy', 'Protein', 'Total lipid (fat)', 'Carbohydrate, by difference'
            ].some(keyword => 
                nutrient.nutrient.name.includes(keyword)
            )
            );

            res.json(createResponse, 'Macronutrients for food item retrieved successfully.', nutrients)
        }
    });
});

router.post('/addcalorieintake', authTokenHandler, async (req, res) => {
    const { item, date, amount, amountType, fdcId } = req.body;

    if (!item || !date || !amount || !amountType || !fdcId) {
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

    // const options = {
    //     url: `https://api.nal.usda.gov/fdc/v1/foods/${fdcId}`,
    //     qs: {
    //         api_key: process.env.USDA_API_KEY,
    //     },
    //     headers: {
    //         'Content-Type': 'application/json'
    //     }
    // }

    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${encodeURIComponent(process.env.USDA_API_KEY)}`;

    const options = {
        url: url,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    request.get(options, async function (error, response, body) {
        if (error) return console.error('Request failed:', error);
        else if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
        else {
            const data = JSON.parse(body);

            const calorieNutrient = data.foodNutrients.find(nutrient => {
                if (nutrient.nutrient && nutrient.nutrient.name && nutrient.nutrient.unitName) {
                    return nutrient.nutrient.name.includes('Energy') && nutrient.nutrient.unitName === 'kcal';
                }
                return false;
            });

            if (!calorieNutrient || isNaN(calorieNutrient.amount)) {
                return console.error('Invalid API response:', data);
            }

            // Amount of calories per gram of the food item * number of grams eaten
            let calorieIntake = (calorieNutrient.amount / 100) * parseFloat(amountInGrams);
            const userId = req.userId;
            const user = await User.findById({ _id: userId });
            // update the logged in user's calorie intake
            user.calorieIntake.push({
                item,
                date: new Date(date),
                amount,
                amountType,
                intake: parseFloat(calorieIntake)
            });
    
            await user.save();
            res.json(createResponse(true, 'Calorie intake added successfully.'));
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
        date.setDate(date.getDate() - parseInt(limit)).getTime();

        user.calorieIntake = user.calorieIntake.filter(entry => {
            return new Date(entry.date).getTime() >= date;
        });
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