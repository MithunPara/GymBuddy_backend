const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp'); // use for decreasing image size
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage(); // temporary storage for images
const upload = multer({ storage });

// image is first sent to multer and then multer returns a response
router.post('/uploadimage', upload.single('myimage'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ ok: false, error: 'Image file not provided.' });
    }

    sharp(file.buffer)
        .resize({ width: 800 })
        .toBuffer(async (err, data, info) => {
            if (err) {
                console.error('Image processing error:', err);
                return res.status(500).json({ ok: false, error: 'Image processing error.' });
            }

            cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (err, result) => {
                if (err) {
                    console.error('Cloudinary Image Uploading Error:', err);
                    return res.status(500).json({ ok: false, error: 'Error uploading image to Cloudinary.' });
                }
                res.json({ ok: true, imageUrl: result.url, message: 'Image uploaded successfully.' });
            }).end(data);
        });
});

module.exports = router;
