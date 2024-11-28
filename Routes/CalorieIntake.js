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

router.get('/searchfood', authTokenHandler, async (req, res) => {
    const { query } = req.body;

    // Function to fetch data based on data type, ensures that we can obtain an even split of branded/SR legacy food options in the output
    const fetchDataType = async (dataType, pageSize) => {
        const options = {
            url: 'https://api.nal.usda.gov/fdc/v1/foods/search',
            qs: {
                api_key: process.env.USDA_API_KEY,
                query: query,
                dataType: [dataType],
                pageSize: pageSize
            },
            headers: {
                'Content-Type': 'application/json'
            }
        }
        
        return new Promise((resolve, reject) => {
            request.get(options, (error, response, body) => {
                if (error) return reject(error);
                if(response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${body}`);
                try {
                    const data = JSON.parse(body);
                    resolve(data.foods || []);
                } catch (err) {
                    reject(`Failed to parse JSON: ${err}`);
                }
            });
        });
    }

    try {
        // Separate API calls for branded/SR Legacy food items to obtain an even output
        const brandedFoodPromise = fetchDataType('Branded', 15);
        const srLegacyFoodPromise = fetchDataType('SR Legacy', 15);

        const [brandedFoods, srLegacyFoods] = await Promise.all([brandedFoodPromise, srLegacyFoodPromise]);

        const combinedFoods = [...brandedFoods, ...srLegacyFoods];

        const searchKeywords = query.toLowerCase().split(' '); // retrieve all the keywords from the search result

        // Prioritize foods that contain all of the keywords provided in the search query
        const exactResults = combinedFoods.filter(food => {
            return searchKeywords.every(keyword => food.description.toLowerCase().includes(keyword));
        });

        // if there are not enough foods that contain all keywords, add some food options that contain some of the keywords
        let otherResults = [];
        if (exactResults.length < 20) {
            otherResults = combinedFoods.filter(food => {
                return searchKeywords.some(keyword => food.description.toLowerCase().includes(keyword) && !exactResults.includes(food));
            });
        }

        const finalResults = [...exactResults, ...otherResults];

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Add in limit logic below if I want to standardize amount of items received on each query.
        // Ex. as of now, it can output 15 branded items and 2 SR Legacy items if there are not enough SR Legacy items,
        // which totals to 17 items, instead of retrieving extra branded items to provide 30 food options in the query for example
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        // // split the final results into branded food options and SR Legacy food options
        // const brandedFoods = finalResults.filter(food => food.dataType === 'Branded');
        // const srLegacyFoods = finalResults.filter(food => food.dataType === 'SR Legacy');
        // let limit = 10; // retrieve up to 10 food options from Branded and SR Legacy foods

        // let srLegacyLimit = 0;
        // let brandedLimit = 0;
        // if (brandedFoods.length < limit) {
        //     // if there are less than 10 branded food options, fill the remaining 20 output options with SR Legacy food options
        //     srLegacyLimit = Math.min(srLegacyFoods.length, 20 - brandedFoods.length);
        //     brandedLimit = brandedFoods.length;
        // } else if (srLegacyFoods.length < limit) {
        //     // if there are less than 10 SR Legacy food options, fill the remaining 20 output options with Branded food options
        //     brandedLimit = Math.min(brandedFoods.length, 20 - srLegacyFoods.length);
        //     srLegacyLimit = srLegacyFoods.length;
        // } else {
        //     // if there are 10 or more SR Legacy and Branded food options, output 10 SR Legacy and Branded food options
        //     srLegacyLimit = limit;
        //     brandedLimit = limit;
        // }

        // const outputFoods = [...brandedFoods.slice(0, brandedLimit), ...srLegacyFoods.slice(0, srLegacyLimit)];

        const foodList = finalResults.map(food => {
            return {
                fdcId: food.fdcId,
                description: food.description,
                ingredients: food.ingredients,
                dataType: food.dataType
            }
        });

        res.json(createResponse(true, 'List of matching food items retrieved successfully.', foodList));
    } catch (err) {
        console.error('Error:', error);
        res.status(400).json(createResponse(false, 'Failed to retrieve food items.', error));
    }
});

router.get('/getnutrients', authTokenHandler, async (req, res) => {
    const { fdcId } = req.body;

    const options = {
        url: `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`,
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
            ].some(keyword => {
                if (nutrient.nutrient && nutrient.nutrient.name) {
                    return nutrient.nutrient.name.includes(keyword);
                }
                return false;
            }
            )
            );

            res.json(createResponse(true, 'Macronutrients for food item retrieved successfully.', nutrients));
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

    const options = {
        url: `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`,
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

router.get('/getcalorieintakebydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if (!date) {
        let date = new Date(); // If there is no inputted date, check today's date
        user.calorieIntake = filterEntriesbyDate(user.calorieIntake, date);
        return res.json(createResponse(true, 'Calorie intake for today:', user.calorieIntake));
    }

    user.calorieIntake = filterEntriesbyDate(user.calorieIntake, new Date(date));
    res.json(createResponse(true, 'Calorie intake for specified date:', user.calorieIntake));
});

router.get('/getcalorieintakebylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if(!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All calorie intake entries:', user.calorieIntake));
    } else {
        let date = new Date();
        let newDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        user.calorieIntake = user.calorieIntake.filter(entry => {
            return new Date(entry.date).getTime() >= newDate;
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
    let age = new Date().getFullYear() - new Date(user.dob).getFullYear();
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