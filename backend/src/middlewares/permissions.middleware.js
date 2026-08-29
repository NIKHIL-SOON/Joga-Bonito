import ApiError from "../../utilities/apiError.js";
import asyncHandler from "../../utilities/asyncHandler.js";

const authorizeRoles = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to access this route");
    }

    next();
  });
};

export default authorizeRoles;