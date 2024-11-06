const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const PORT = 8000;


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

// When app starts, issue this message
app.get('/', (req, res) => {
    res.json({ 
        message: 'API is working' 
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
