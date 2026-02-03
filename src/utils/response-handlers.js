const getErrorResponse = (error, message, req) => ({
    error,
    message: message || "An error occurred",
    timestamp: new Date().toISOString(),
    path: req?.originalUrl || "/"
});

export const setSuccess = (data, message, response) => {
    response.status(200).json({
        message: message || "Success",
        data: data
    });
};

export const setResourceCreated = (data, message, response) => {
    response.status(201).json({
        message: message || "Resource created successfully",
        data: data
    });
};

export const setResourceUpdated = (data, message, response) => {
    response.status(204).json({
        message: message || "Resource updated successfully",
        data: data
    });
};

export const setError = (error, response, req) => {
    console.log("Error: ", error);
    let statusCode = error.status || 500;
    response.status(statusCode).json(getErrorResponse("ServerError", error.message, req));
};

export const setBadRequest = (error, req, response) => {
    response.status(400).json(getErrorResponse("BadRequest", error.message || "Invalid input parameters", req));
};

export const setBadRequestValidation = (error, req, response) => {
    response.status(400).json(getErrorResponse("Validation Error", error.message || "Invalid input parameters", req));
};

export const setUnauthorized = (error, req, response) => {
    response.status(401).json(getErrorResponse("Unauthorized", error.message || "Authentication required", req));
};

export const setForbidden = (error, req, response) => {
    response.status(403).json(getErrorResponse("Forbidden", error.message || "Access to the resource is not allowed", req));
};

export const setInternalServerError = (error, req, response) => {
    response.status(500).json(getErrorResponse("ServerError", error.message || "Internal server error occurred", req));
};

export const setNotFound = (error, req, response) => {
    response.status(404).json(getErrorResponse("NotFound", error.message || "Resource not found", req));
};

export const setConflict = (error, req, response) => {
    response.status(409).json(getErrorResponse("Conflict", error.message || "Resource already exists", req));
};

export const setUnsupportedMediaType = (error, req, response) => {
    response.status(415).json(getErrorResponse("UnsupportedMediaType", error.message || "Content-Type must be application/json", req));
};