const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Configure storage for teacher documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/teacher-docs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Load applications data
const applicationsPath = path.join(__dirname, '../data/applications.json');

// Teacher application endpoint
router.post('/apply', upload.array('documents', 5), (req, res) => {
    const { 
        fullName, 
        email, 
        phone,
        qualification, 
        university, 
        graduationYear,
        maritalStatus, 
        dependents,
        currentStatus,
        fileNumber,
        yearsOfTeaching,
        churchAffiliation
    } = req.body;

    // Basic validation
    if (!fullName || !email || !qualification) {
        return res.status(400).json({ 
            success: false, 
            message: 'Required fields are missing' 
        });
    }

    // Create application object
    const newApplication = {
        id: uuidv4(),
        personalInfo: {
            fullName,
            email,
            phone,
            maritalStatus,
            dependents: parseInt(dependents) || 0,
            churchAffiliation
        },
        qualificationInfo: {
            qualification,
            university,
            graduationYear: parseInt(graduationYear),
            isNewGraduate: currentStatus === 'new',
            isServingTeacher: currentStatus === 'serving',
            isRetired: currentStatus === 'retired',
            fileNumber: currentStatus === 'serving' ? fileNumber : null,
            yearsOfTeaching: currentStatus === 'serving' ? parseInt(yearsOfTeaching) : 0
        },
        documents: req.files?.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: `/teacher-docs/${file.filename}`
        })) || [],
        applicationDate: new Date(),
        status: 'pending',
        screeningResult: null
    };

    // Automatic screening
    newApplication.screeningResult = screenApplication(newApplication);

    // Save application
    const applications = JSON.parse(fs.readFileSync(applicationsPath));
    applications.applications.push(newApplication);
    fs.writeFileSync(applicationsPath, JSON.stringify(applications, null, 2));

    res.json({ 
        success: true, 
        application: newApplication,
        message: newApplication.screeningResult.approved ? 
            'Application received and pre-approved!' : 
            'Application received pending review'
    });
});

// Screening criteria function
function screenApplication(application) {
    const { qualificationInfo, personalInfo } = application;
    const reasons = [];
    let approved = true;

    // Check qualifications
    if (!qualificationInfo.qualification.toLowerCase().includes('degree')) {
        reasons.push('Must have university degree');
        approved = false;
    }

    // Check graduation year (1995 graduates)
    if (qualificationInfo.graduationYear !== 1995) {
        reasons.push('Only 1995 graduates are currently being considered');
        approved = false;
    }

    // Check church affiliation
    if (!personalInfo.churchAffiliation) {
        reasons.push('Must be a practicing Christian');
        approved = false;
    }

    // Check serving teachers
    if (qualificationInfo.isServingTeacher && qualificationInfo.yearsOfTeaching < 5) {
        reasons.push('Serving teachers must have at least 5 years experience');
        approved = false;
    }

    return { approved, reasons };
}

// Get all applications endpoint
router.get('/applications', (req, res) => {
    const applications = JSON.parse(fs.readFileSync(applicationsPath));
    res.json({ success: true, applications: applications.applications });
});

module.exports = router;