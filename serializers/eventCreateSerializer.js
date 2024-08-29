const Joi = require('joi');

const eventCreateSerializer = Joi.object({
    categoryId:Joi.string().required(),
    name: Joi.string().required(),
    photo: Joi.string().required(),
    description:Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    ownerId:Joi.string().required(),
    isPublic: Joi.boolean().optional(),
});

module.exports = eventCreateSerializer;