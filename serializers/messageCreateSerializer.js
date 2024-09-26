const Joi = require('joi');

const messageCreateSerializer = Joi.object({
    workshopId: Joi.string().required(),
    content: Joi.string().required(),
    urlFile: Joi.string().optional(),
    messageType: Joi.string().required(),
    tag: Joi.string().optional(),
    participantId: Joi.string().required(),
});

module.exports = messageCreateSerializer;