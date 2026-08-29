import { body } from "express-validator";
import { AvailableUserRole } from "../../utilities/constants.js";
const validator = ()=>{
    return [
        body("email")
        .trim()
        .notEmpty()
        .withMessage("No email found")
        .isEmail()
        .withMessage("the email entered is not a valid email"),
        body("username")
        .trim()
        .notEmpty()
        .withMessage("username is required")
        .isLowercase()
        .withMessage("name should be in lowercase")
        .isLength({min : 3})
        .withMessage("too short")




    ];
}

const userLoginValidator = ()=>{
    return [
        body("email")
        .optional()
        .isEmail()
        .withMessage("email is invalid"),
        body("password")
        .notEmpty()
        .withMessage("password is required")
    ]
}

