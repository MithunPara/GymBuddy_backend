const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const routineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    details: {
        type: String,
        required: true,
    },
    lengthMinutes: {
        type: Number,
        required: true,
    },
    exercises: [
        {
            name: {
                type: String,
                required: true,
            },
            details: {
                type: String,
                required: true,
            },
            sets: {
                type: Number,
                required: true,
            },
            reps: {
                type: Number,
                required: true,
            },
            imageURL: {
                type: String,
                required: true,
            },
        }
    ],
    imageURL: {
        type: String,
        required: true,
    },
}, {timestamps: true});

const Routine = mongoose.model('Routine', routineSchema);
module.exports = Routine;