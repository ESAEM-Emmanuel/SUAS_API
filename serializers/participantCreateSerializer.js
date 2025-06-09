const Joi = require('joi');

const participantCreateSerializer = Joi.object({
    workshopId: Joi.string().required(),
    name: Joi.string().required(),
    firstName: Joi.string().required(),
    companyName: Joi.string().required(),
    businessSector: Joi.string().required(),
    functionC: Joi.string().required(),
    positionInCompany: Joi.string().required(),
    description: Joi.string().required(),
    photo: Joi.string().optional(),
    participantRoleId: Joi.string().required(),
    ownerId: Joi.string().required(),
    isOnlineParticipation: Joi.boolean().default(false),
});

module.exports = participantCreateSerializer;