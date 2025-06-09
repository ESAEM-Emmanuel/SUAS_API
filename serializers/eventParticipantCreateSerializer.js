const Joi = require('joi');

const eventParticipantCreateSerializer = Joi.object({
    eventId: Joi.string().required(),
    ownerId: Joi.string().required(),
    eventParticipantRoleId: Joi.string().required(),
    // isOnlineParticipation: Joi.boolean().required(),
});

module.exports = eventParticipantCreateSerializer;