const successResponse = (res, message, data) => {
  return res.status(200).json({
    message,
    data,
  });
};

const successCreatedResponse = (res, message, data) => {
  return res.status(201).json({
    message,
    data,
  });
};

const errorResponse = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  successCreatedResponse,
};
