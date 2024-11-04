const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: { // all emails must be unique
        type: String,
        required: true,
        unique: true,
    },
    weight: [ // array of weights to track weight changes over time
        {
            weight: {
                type: Number,
                required: true,
            },
            date: {
                type: Date,
                required: true,
            },
        }
    ],
    height: [
        {
            height: {
                type: Number,
                required: true,
            },
            date: {
                type: Date,
                required: true,
            },
        }
    ],
    gender: {
        type: String,
        required: true,
    },
    dob: {
        type: String,
        required: true,
    },
    goal: {
        type: String,
        required: true,
    },
    calorieIntake: [ 
        {
             item: {
                type: String,
                required: true,
             },
             date: {
                type: Date,
                required: true,
             },
             amount: {
                type: Number,
                required: true,
             },
             amountType: {
                type: String,
                required: true,
             },
             intake: {
                type: Number,
                required: true,
             },
        }
    ],
    activityLevel: {
        type: String,
        required: true,
    },
    sleep: [
        {
            date: {
                type: Date,
                required: true,
            },
            hoursSlept: {
                type: Number,
                required: true,
            },
        }
    ],
    steps: [
        {
            date: {
                type: Date,
                required: true,
            },
            steps: {
                type: Number,
                required: true,
            },
        }
    ],
    workouts: [
        {
            date: {
                type: Date,
                required: true,
            },
            exercise: {
                type: String,
                required: true,
            },
            workoutLengthMinutes: {
                type: Number,
                required: true,
            },
        }
    ],
}, {timestamps: true});

userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;