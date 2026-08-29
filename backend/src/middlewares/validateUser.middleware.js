import { validationResult } from "express-validator";
import ApiError  from "../../utilities/apiError.js";

const validateUser = (req,res,next)=>{
    const errors = validationResult(req)

    if(errors.isEmpty()){
        return next()
    }

    let filterError =[];
    errors.array().map((err)=>{
        filterError.push({[err.path] : err.msg})
    })
    throw new ApiError(422,"received data not valid",filterError)
}
export {validateUser}