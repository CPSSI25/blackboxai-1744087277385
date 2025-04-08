const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

// Load applications and leave data
const applicationsPath = path.join(__dirname, '../data/applications.json');
const leavesPath = path.join(__dirname, '../data/leaves.json');

// Initialize leaves.json if not exists
if (!fs.existsSync(leavesPath)) {
    fs.writeFileSync(leavesPath, JSON.stringify({ leaves: [] }, null, 2));
}

// Generate leave application endpoint
router.post('/generate', (req, res) => {
    const { teacherId, startDate, endDate, reason } = req.body;
    
    // Validate teacher exists
    const applications = JSON.parse(fs.readFileSync(applicationsPath));
    const teacher = applications.applications.find(app => app.id === teacherId);
    
    if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Create leave record
    const newLeave = {
        id: uuidv4(),
        teacherId,
        teacherName: teacher.personalInfo.fullName,
        fileNumber: teacher.qualificationInfo.fileNumber,
        startDate,
        endDate,
        reason,
        status: 'pending',
        generatedDate: new Date(),
        pdfPath: ''
    };

    // Generate PDF
    const pdfFileName = `leave-${newLeave.id}.pdf`;
    const pdfPath = path.join(__dirname, '../public/leave-forms', pdfFileName);
    
    // Create directory if not exists
    if (!fs.existsSync(path.dirname(pdfPath))) {
        fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    }

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // PDF Content
    doc.fontSize(16).text('CENTRAL PROVINCE EDUCATION BOARD', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('BIANNUAL LEAVE APPLICATION FORM', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Teacher Name: ${teacher.personalInfo.fullName}`);
    doc.text(`File Number: ${teacher.qualificationInfo.fileNumber || 'N/A'}`);
    doc.text(`School: ${teacher.school || 'To be assigned'}`);
    doc.moveDown();

    doc.text(`Leave Period: ${startDate} to ${endDate}`);
    doc.text(`Reason: ${reason}`);
    doc.moveDown(2);

    doc.text('_________________________          _________________________');
    doc.text('Teacher Signature                          Date');
    doc.moveDown(2);

    doc.text('Recommended by School Inspector:');
    doc.moveDown();
    doc.text('_________________________          _________________________');
    doc.text('Inspector Signature                         Date');
    doc.moveDown(2);

    doc.text('Approved by PEB:');
    doc.moveDown();
    doc.text('_________________________          _________________________');
    doc.text('PEB Chairman Signature                  Date');

    doc.end();

    // Save leave record
    newLeave.pdfPath = `/leave-forms/${pdfFileName}`;
    const leaves = JSON.parse(fs.readFileSync(leavesPath));
    leaves.leaves.push(newLeave);
    fs.writeFileSync(leavesPath, JSON.stringify(leaves, null, 2));

    res.json({ 
        success: true, 
        leave: newLeave,
        message: 'Leave application generated successfully' 
    });
});

// Approve leave endpoint (for inspectors)
router.post('/approve/:id', (req, res) => {
    const { id } = req.params;
    const { approved } = req.body;
    
    const leaves = JSON.parse(fs.readFileSync(leavesPath));
    const leaveIndex = leaves.leaves.findIndex(l => l.id === id);
    
    if (leaveIndex === -1) {
        return res.status(404).json({ success: false, message: 'Leave application not found' });
    }

    leaves.leaves[leaveIndex].status = approved ? 'approved' : 'rejected';
    leaves.leaves[leaveIndex].processedDate = new Date();
    fs.writeFileSync(leavesPath, JSON.stringify(leaves, null, 2));

    res.json({ 
        success: true, 
        leave: leaves.leaves[leaveIndex],
        message: `Leave application ${approved ? 'approved' : 'rejected'}`
    });
});

// Get all leaves endpoint
router.get('/', (req, res) => {
    const leaves = JSON.parse(fs.readFileSync(leavesPath));
    res.json({ success: true, leaves: leaves.leaves });
});

module.exports = router;