const express = require('express');
const router = express.Router();
const adminTokenHandler = require('../Middlewares/checkAdminToken');
const errorHandler = require('../Middlewares/errorMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../Models/UserSchema');
const Routine = require('../Models/RoutineSchema');

const createResponse = (ok, message, data) => {
    return {
        ok,
        message,
        data,
    };
}

// Create a new workout routine, need admin privileges
app.post('/routines', adminTokenHandler, async (req, res) => {
    try {
        const { name, details, lengthMinutes, exercises, imageURL } = req.body;
        const routine = new Routine({
            name,
            details,
            lengthMinutes,
            exercises,
            imageURL,
        });

        await routine.save();
        res.json(createResponse(true, 'Workout routine added successfully.', routine));
    } 
    catch (err) {
        res.json(createResponse(false, err.message));
    }
});

// Retrieve all existing routines in database
app.get('/routines', async (req, res) => {
    try {
        const routines = await Routine.find({});
        res.json(createResponse(true, 'All workout routines fetched successfully.', routines));
    }
    catch (err) {
        res.json(createResponse(false, err.message));
    }
});

// Retrieve a specific workout routine
app.get('/routines/:id', async (req, res) => {
    try {
        const routine = await Routine.findById(req.params.id);
        res.json(createResponse(true, 'Workout routine fetched successfully.', routine));
    }
    catch (err) {
        res.json(createResponse(false, err.message));
    }
});

// Update an existing workout routine
app.put('/workouts/:id', adminTokenHandler, async (req, res) => {
    try {
        const routine = await Routine.findById(req.params.id);
        const { name, details, lengthMinutes, exercises, imageURL } = req.body;
    
        routine.name = name;
        routine.details = details;
        routine.lengthMinutes = lengthMinutes;
        routine.exercises = exercises;
        routine.imageURL = imageURL;
    
        await routine.save();
        res.json(createResponse(true, 'Workout routine updated successfully.', routine));
    }
    catch (err) {
        res.json(createResponse(false, err.message));
    }
});

// Delete a workout routine
app.delete('/workouts/:id', adminTokenHandler, async (req, res) => {
    try {
        const routine = await Routine.findById(req.params.id);
        await routine.remove();
        res.json(createResponse(true, 'Workout routine deleted successfully.'));
    }
    catch (err) {
        res.json(createResponse(false, err.message));
    }
});

router.use(errorHandler);

module.exports = router;