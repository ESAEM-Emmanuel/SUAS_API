// const Joi = require('joi');

// const permissionCreateSerializer = Joi.object({
//     name: Joi.string().required(),
  
// });

// module.exports = permissionCreateSerializer;

const Joi = require('joi');

const permissionCreateSerializer = Joi.object({
    name: Joi.string().required(),
});

module.exports = permissionCreateSerializer;