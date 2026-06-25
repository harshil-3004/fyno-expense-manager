const router = require('express').Router();
const { register, login, getProfile, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../validators/auth.validator');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
