const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const PORT = 8000;

const authRoutes = require('./Routes/Auth');
const adminRoutes = require('./Routes/Admin');
const calorieIntakeRoutes = require('./Routes/CalorieIntake');
const imageUploadRoutes = require('./Routes/ImageUpload')
const sleepTrackerRoutes = require('./Routes/SleepTracker');
const stepTrackerRoutes = require('./Routes/StepTracker');
const waterTrackerRoutes = require('./Routes/WaterTracker');
const weightTrackerRoutes = require('./Routes/WeightTracker');
const workoutRoutineRoutes = require('./Routes/WorkoutRoutines');
const workoutTrackerRoutes = require('./Routes/WorkoutTracker');

require('dotenv').config();
require('./db');

app.use(bodyParser.json()); // parse JSON format data if needed
const allowedOrigins = ['http://localhost:3000']; // only these URLs can access backend


// CORS used to verify frontend URLs trying to access backend
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

// Used to store all information related to cookies
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/calorieintake', calorieIntakeRoutes);
app.use('/imageupload', imageUploadRoutes);
app.use('/sleeptracker', sleepTrackerRoutes);
app.use('/steptracker', stepTrackerRoutes);
app.use('/watertracker', waterTrackerRoutes);
app.use('/weighttracker', weightTrackerRoutes);
app.use('/workoutroutines', workoutRoutineRoutes);
app.use('/workouttracker', workoutTrackerRoutes);

// When app starts, issue this message
app.get('/', (req, res) => {
    res.json({ 
        message: 'API is working' 
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
