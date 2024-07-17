const Joi = require('joi');

const participantCreateSerializer = Joi.object({
    workshopId: Joi.string().required(),
    content: Joi.string().required(),
    messageType: Joi.string().required(),
    participantId: Joi.string().required(),
});

module.exports = participantCreateSerializer;