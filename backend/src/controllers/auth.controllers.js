import User from "../models/user.models.js";
import asyncHandler from "../../utilities/asyncHandler.js";
import ApiError from "../../utilities/apiError.js";
import ApiResponse from "../../utilities/apiResponse.js";

const tokenGenerator = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = "user" } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(201).json(
    ApiResponse.success(201, "User registered successfully", {
      user: createdUser,
    })
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Invalid email or password");
  }

  const isPasswordValid = await user.checkPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await tokenGenerator(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  // secure:true unconditionally would mark these cookies Secure even over
  // plain http://localhost in dev — Postman doesn't care, but a real browser
  // can (and in some cases will) silently refuse to store them, breaking
  // every cookie-dependent request afterward. Match the pattern already used
  // for the _performance cookie elsewhere in this codebase.
  const cookieOptions = {
  httpOnly: true,
  secure: true,        // Required for HTTPS (Render & Vercel)
  sameSite: 'none',    // MUST be 'none' for cross-domain cookies
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.status(200).json(
    ApiResponse.success(200, "User logged in successfully", {
      user: loggedInUser,
      accessToken,
      refreshToken,
    })
  );
});

const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  return res.status(200).json(
    ApiResponse.success(200, "Current user fetched successfully", {
      user: req.user,
    })
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request");
  }

  req.user.refreshToken = "";
  await req.user.save({ validateBeforeSave: false });

 const cookieOptions = {
  httpOnly: true,
  secure: true,        // Required for HTTPS (Render & Vercel)
  sameSite: 'none',    // MUST be 'none' for cross-domain cookies
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json(
    ApiResponse.success(200, "User logged out successfully", null)
  );
});

export { registerUser, login, getMe, logoutUser };
