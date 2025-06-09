const Joi = require('joi');

const workshopCreateSerializer = Joi.object({
    eventId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    ownerId: Joi.string().required(),
    photo: Joi.string().required(),
    program: Joi.string().optional(),
    room: Joi.string().required(),
    numberOfPlaces: Joi.number().integer().min(1).required(),
    isOnlineWorkshop: Joi.boolean().required(),
    price: Joi.number().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
        .messages({
            'date.greater': 'endDate must be after startDate'
        }),
    isPublic: Joi.boolean().default(false)
});

module.exports = workshopCreateSerializer;