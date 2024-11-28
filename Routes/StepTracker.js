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

router.post('/addstepentry', authTokenHandler, async (req, res) => {
    const { date, steps } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date || !steps) {
        res.status(400).json(createResponse(false, 'Please provide the date and step count.'));
    }

    user.steps.push({
        date: new Date(date),
        steps,
    });

    await user.save();
    res.json(createResponse(true, 'Step entry added successfully.'));
});

router.get('/getstepsbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) { // if date not inputted, assume today's date
        let date = new Date();
        user.steps = filterEntriesbyDate(user.steps, date);
        return res.json(createResponse(true, 'Step entries for today:', user.steps));
    }

    user.steps = filterEntriesbyDate(user.steps, new Date(date));
    res.json(createResponse(true, 'Step entries for specified date:', user.steps));
});

router.get('/getstepsbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide a limit.'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All step entries:', user.steps));
    } else {
        let date = new Date();
        let newDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();

        user.steps = user.steps.filter(entry => {
            return new Date(entry.date).getTime() >= newDate;
        });

        return res.json(createResponse(true, `Step entries for last ${limit} days:`, user.steps));
    }
});

router.get('/getuserstepsgoal', authTokenHandler, async (req, res) => {
     const userId = req.userId;
     const user = await User.findById({ _id: userId });

     let stepGoal = 0;

     if (user.goal == 'weightLoss') {
        stepGoal = 10000;
     } else if (user.goal == 'weightGain') {
        stepGoal = 5000;
     } else {
        stepGoal = 7500;
     }

     res.json(createResponse(true, 'Recommended daily steps:', { stepGoal }));
});

router.delete('/deletestepentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide a date.'));
    }

    user.steps = user.steps.filter(entry => {
        return entry.date !== date;
    });
    
    await user.save();
    res.json(createResponse(true, 'Step entry deleted successfully.'));
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