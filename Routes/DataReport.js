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

router.get('/getreport', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });


    let userWeight = user.weight[user.weight.length - 1].weight;
    let userHeight = user.height[user.height.length - 1].height;

    // Get tracked values for today's date

    let date = new Date();

    let calorieIntake = 0;
    user.calorieIntake.forEach(entry => {
        if (entry.date.getDate() === date.getDate() && entry.date.getMonth() === date.getMonth() && entry.date.getFullYear() === date.getFullYear()) {
            calorieIntake += entry.intake;
        }
    });

    let totalSleep = 0;
    user.sleep.forEach(entry => {
        if (entry.date.getDate() === date.getDate() && entry.date.getMonth() === date.getMonth() && entry.date.getFullYear() === date.getFullYear()) {
            totalSleep += entry.hoursSlept; 
        }
    });

    let totalWater = 0;
    user.water.forEach(entry => {
        if (entry.date.getDate() === date.getDate() && entry.date.getMonth() === date.getMonth() && entry.date.getFullYear() === date.getFullYear()) {
            totalWater += entry.amountInML; 
        }
    });

    let totalSteps = 0;
    user.steps.forEach(entry => {
        if (entry.date.getDate() === date.getDate() && entry.date.getMonth() === date.getMonth() && entry.date.getFullYear() === date.getFullYear()) {
            totalSteps += entry.steps; 
        }
    });

    // Get number of workouts completed in the past week
    let weeklyWorkouts = 0;
    user.workouts.forEach(entry => {
        if (entry.date.getDate() >= date.getDate() - 7 && entry.date.getMonth() === date.getMonth() && entry.date.getFullYear() === date.getFullYear()) {
            weeklyWorkouts += 1;
        }
    });

    // Goal calorie intake

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

    // Get goal weight

    let minBMI = 18.5;
    let maxBMI = 24.9;
    let minWeight = minBMI * ((user.height[user.height.length - 1].height / 100) ** 2);
    let maxWeight = maxBMI * ((user.height[user.height.length - 1].height / 100) ** 2);
    let goalWeightRange = `Healthy weight range for your height: ${minWeight.toFixed(1)} kg - ${maxWeight.toFixed(1)} kg.`;

    // Get workout goal
    let workoutGoal = 4;

    // Get steps goal
    let stepGoal = 0;

    if (user.goal == 'weightLoss') {
       stepGoal = 10000;
    } else if (user.goal == 'weightGain') {
       stepGoal = 5000;
    } else {
       stepGoal = 7500;
    }

    // Get sleep goal
    let sleepGoal = 7;

    // Get water goal
    let waterGoal = 3000;

    let response = [
        {
            name: 'Calorie Intake',
            value: calorieIntake,
            goal: intakeTarget,
            unit: 'cal',
        },
        {
            name: 'Sleep',
            value: totalSleep,
            goal: sleepGoal,
            unit: 'hrs',
        },
        {
            name: 'Steps',
            value: totalSteps,
            goal: stepGoal,
            unit: 'steps',
        },
        {
            name: 'Water',
            value: totalWater,
            goal: waterGoal,
            unit: 'mL',
        },
        {
            name: 'Workouts',
            value: weeklyWorkouts,
            goal: workoutGoal,
            unit: 'days',
        },
        {
            name: 'Weight',
            value: userWeight,
            goal: goalWeightRange,
            unit: 'kg',
        },
        {
            name: 'Height',
            value: userHeight,
            goal: '',
            value: 'cm',
        },
    ]

    res.json(createResponse(true, 'Full report', response));
});

module.exports = router;