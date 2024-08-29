const Joi = require('joi');

const workshopCreateSerializer = Joi.object({
    eventId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    ownerId: Joi.string().required(),
    photo: Joi.string().required(),
    room: Joi.string().required(),
    numberOfPlaces: Joi.number().integer().required(),
    isOnlineWorkshop: Joi.boolean().required(),
    price: Joi.number().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    isPublic: Joi.boolean().optional(),
});

module.exports = workshopCreateSerializer;