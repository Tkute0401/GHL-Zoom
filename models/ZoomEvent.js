const mongoose = require('mongoose');

const ZoomEventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true
    },
    eventType: {
        type: String,
        required: true
    },
    processedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ZoomEvent', ZoomEventSchema);
