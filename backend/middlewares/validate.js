/**
 * Generic Zod validation middleware.
 * Validates req.body, req.params, and req.query against a Zod schema.
 *
 * Usage: validate(myZodSchema)
 */

const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));

        return next(new AppError('Validation failed.', 400, errors));
    }

    // Replace req data with parsed (coerced/defaults/trimmed) values
    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) req.query = result.data.query;

    return next();
};

module.exports = validate;
