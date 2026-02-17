const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    ghlContactId: {
        type: String,
        required: true
    },
    zoomRegistrantId: String,
    firstName: String,
    lastName: String,
    phone: String,
    locationId: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on save
ContactSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Contact', ContactSchema);
