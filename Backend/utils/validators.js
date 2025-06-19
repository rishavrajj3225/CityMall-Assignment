const Joi = require("joi");

// Example schema: Create Disaster
const createDisasterSchema = Joi.object({
  title: Joi.string().min(3).required(),
  location_name: Joi.string().allow("", null),
  description: Joi.string().min(10).required(),
  tags: Joi.array().items(Joi.string()),
});

// Example schema: Report submission
const createReportSchema = Joi.object({
  disaster_id: Joi.string().uuid().required(),
  content: Joi.string().min(10).required(),
  image_url: Joi.string().uri().optional(),
});

// Validation helper
const validate = (schema, payload) => {
  const { error, value } = schema.validate(payload);
  if (error) {
    const err = new Error(error.details[0].message);
    err.name = "ValidationError";
    throw err;
  }
  return value;
};

module.exports = {
  validate,
  createDisasterSchema,
  createReportSchema,
};
