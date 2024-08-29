const Joi = require('joi');

const masterOfCeremonyCreateSerializer = Joi.object({
    eventId: Joi.string().required(),
    ownerId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
});

module.exports = masterOfCeremonyCreateSerializer;