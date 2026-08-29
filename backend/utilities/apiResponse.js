class ApiResponse {
  constructor(statusCode, message, data = null, success = true) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success(statusCode = 200, message = "Success", data = null) {
    return new ApiResponse(statusCode, message, data, true);
  }

  static error(statusCode = 500, message = "Something went wrong", data = null) {
    return new ApiResponse(statusCode, message, data, false);
  }
}

export default ApiResponse;
