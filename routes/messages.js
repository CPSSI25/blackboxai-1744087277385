const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize messages.json if not exists
const messagesPath = path.join(__dirname, '../data/messages.json');
if (!fs.existsSync(messagesPath)) {
    fs.writeFileSync(messagesPath, JSON.stringify({ messages: [] }, null, 2));
}

// Send message endpoint
router.post('/send', (req, res) => {
    const { senderId, receiverId, subject, content, threadId } = req.body;
    
    const newMessage = {
        id: uuidv4(),
        threadId: threadId || uuidv4(), // Create new thread if no threadId provided
        senderId,
        receiverId,
        subject,
        content,
        sentAt: new Date(),
        read: false
    };

    const messages = JSON.parse(fs.readFileSync(messagesPath));
    messages.messages.push(newMessage);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));

    res.json({ 
        success: true, 
        message: newMessage,
        isNewThread: !threadId
    });
});

// Get messages for user endpoint
router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    const messages = JSON.parse(fs.readFileSync(messagesPath));
    
    // Group messages by thread
    const threads = {};
    messages.messages
        .filter(m => m.senderId === userId || m.receiverId === userId)
        .forEach(m => {
            if (!threads[m.threadId]) {
                threads[m.threadId] = {
                    threadId: m.threadId,
                    subject: m.subject,
                    participants: [m.senderId, m.receiverId],
                    messages: [],
                    unread: 0,
                    lastMessage: m.sentAt
                };
            }
            threads[m.threadId].messages.push(m);
            if (!m.read && m.receiverId === userId) {
                threads[m.threadId].unread++;
            }
            if (m.sentAt > threads[m.threadId].lastMessage) {
                threads[m.threadId].lastMessage = m.sentAt;
            }
        });

    // Convert to array and sort by last message date
    const threadList = Object.values(threads).sort((a, b) => 
        new Date(b.lastMessage) - new Date(a.lastMessage));

    res.json({ 
        success: true, 
        threads: threadList 
    });
});

// Mark as read endpoint
router.post('/read/:messageId', (req, res) => {
    const { messageId } = req.params;
    
    const messages = JSON.parse(fs.readFileSync(messagesPath));
    const messageIndex = messages.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
        return res.status(404).json({ success: false, message: 'Message not found' });
    }

    messages.messages[messageIndex].read = true;
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));

    res.json({ 
        success: true, 
        message: messages.messages[messageIndex] 
    });
});

module.exports = router;