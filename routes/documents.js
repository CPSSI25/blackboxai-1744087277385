const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Set up storage for uploaded documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Load documents data
const documentsPath = path.join(__dirname, '../data/documents.json');

// Upload document endpoint
router.post('/upload', upload.single('document'), (req, res) => {
    const newDocument = {
        id: Date.now(),
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        uploadedAt: new Date()
    };

    const documents = JSON.parse(fs.readFileSync(documentsPath));
    documents.documents.push(newDocument);
    fs.writeFileSync(documentsPath, JSON.stringify(documents, null, 2));

    res.json({ success: true, document: newDocument });
});

// Get all documents endpoint
router.get('/', (req, res) => {
    const documents = JSON.parse(fs.readFileSync(documentsPath));
    res.json({ success: true, documents: documents.documents });
});

module.exports = router;