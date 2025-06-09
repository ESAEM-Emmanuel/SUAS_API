const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Utility class to handle API responses in a standardized way
 */
class ResponseHandler {
    /**
     * Send a success response
     * @param {Object} res - Express response object
     * @param {Object} data - Data to send in the response
     * @param {string} status - HTTP status code key from HTTP_STATUS
     */
    static success(res, data = null, status = 'OK') {
        const statusObj = HTTP_STATUS[status];
        const response = {
            success: true,
            status: statusObj.statusCode,
            message: statusObj.message
        };

        if (data) {
            response.result = data;
        }

        return res.status(statusObj.statusCode).json(response);
    }

    /**
     * Send an error response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {string} status - HTTP status code key from HTTP_STATUS
     * @param {Object} errors - Additional error details
     */
    static error(res, message = null, status = 'INTERNAL_SERVER_ERROR', errors = null) {
        const statusObj = HTTP_STATUS[status];
        const response = {
            success: false,
            status: statusObj.statusCode,
            message: message || statusObj.message
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusObj.statusCode).json(response);
    }

    /**
     * Send a no content response
     * @param {Object} res - Express response object
     */
    static noContent(res) {
        return res.status(HTTP_STATUS.NO_CONTENT.statusCode).send();
    }
}

module.exports = ResponseHandler; 