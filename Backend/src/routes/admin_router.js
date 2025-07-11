// נתיבים של אדמין

const router = require('express').Router();
const adminController = require('../controllers/admin_controller');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

router.get('/users',                    verifyToken, verifyAdmin, adminController.getAllUsers);
router.delete('/users/:id',             verifyToken, verifyAdmin, adminController.deleteUser);
router.get('/all-groups',               verifyToken, verifyAdmin, adminController.getAllGroups);
router.delete('/delete-group/:groupId', verifyToken, verifyAdmin, adminController.deleteGroupByAdmin);
router.get("/graph-stats",              verifyToken, verifyAdmin, adminController.getGraphStats);

module.exports = router;
