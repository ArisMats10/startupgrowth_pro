import express from "express";
import { getUser,userLogin,userSignup,userLogout,deleteUser,updateProfile,updatePassword} from "../controllers/authControllers.js";
import { protectedRoute } from "../middleware/protectedRoutes.js";

const router = express.Router();

router.get('/getUser',protectedRoute,getUser)
router.post('/signup',userSignup)
router.post('/login',userLogin)
router.post('/logout',userLogout)
router.delete('/deleteUser',protectedRoute,deleteUser)
router.patch('/profile',protectedRoute,updateProfile)
router.patch('/password',protectedRoute,updatePassword)


export default router;