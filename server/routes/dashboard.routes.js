const router = require('express').Router();
const { getSummary, submitReflection, getReflection } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getSummary);
router.post('/reflection', submitReflection);
router.get('/reflection', getReflection);

module.exports = router;
