const HTTP_STATUS = {
    OK: {
        "statusCode": 200,
        "message": "OK",
        "description": "The request has succeeded. The information returned with the response depends on the method used in the request."
    },
    CREATED: {
        "statusCode": 201,
        "message": "Created",
        "description": "The request has been fulfilled, resulting in the creation of a new resource."
    },
    NO_CONTENT: {
        "statusCode": 204,
        "message": "No Content",
        "description": "The server successfully processed the request, but is not returning any content."
    },
    BAD_REQUEST: {
        "statusCode": 400,
        "message": "Bad Request",
        "description": "The server cannot or will not process the request due to a client error (e.g., malformed request syntax, invalid request routing)."
    },
    UN_AUTHORIZED: {
        "statusCode": 401,
        "message": "Unauthorized",
        "description": "The request requires user authentication. The client must authenticate itself to get the requested response."
    },
    FORBIDDEN: {
        "statusCode": 403,
        "message": "Forbidden",
        "description": "The server understood the request, but refuses to authorize it."
    },
    NOT_FOUND: {
        "statusCode": 404,
        "message": "Not Found",
        "description": "The server cannot find the requested resource."
    },
    NOT_ALLOWED: {
        "statusCode": 405,
        "message": "Method Not Allowed",
        "description": "The request method is known by the server but is not supported by the target resource."
    },
    CONFLICT: {
        "statusCode": 409,
        "message": "Conflict",
        "description": "The request could not be completed due to a conflict with the current state of the resource."
    },
    INTERNAL_SERVER_ERROR: {
        "statusCode": 500,
        "message": "Internal Server Error",
        "description": "The server encountered an unexpected condition that prevented it from fulfilling the request."
    },
    BAD_GATEWAY: {
        "statusCode": 502,
        "message": "Bad Gateway",
        "description": "The server received an invalid response from the upstream server it accessed in attempting to fulfill the request."
    },
    SERVICE_UNAVAILABLE: {
        "statusCode": 503,
        "message": "Service Unavailable",
        "description": "The server is currently unable to handle the request due to temporary overload or maintenance."
    },
    GATEWAY_TIMEOUT: {
        "statusCode": 504,
        "message": "Gateway Timeout",
        "description": "The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server."
    }
};

module.exports = HTTP_STATUS; 