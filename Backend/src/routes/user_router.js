// נתיבים של משתמש

const router = require('express').Router();
const user_controller   = require('../controllers/user_controller');
const { verifyToken, optionalAuth } = require('../middlewares/authMiddleware');
const { upload } = require("../services/cloudinary_service");

router.post('/register',                      upload.single("image"), user_controller.register);
router.post('/login',                         user_controller.login);
router.post('/forgot-password',               user_controller.forgotPassword);
router.post('/reset-password',                user_controller.resetPassword);
router.put('/update-profile',                 upload.single("image"), verifyToken, user_controller.updateProfile);
router.get('/me',                             verifyToken, user_controller.getCurrentUser);
router.get('/search-users',                   verifyToken, user_controller.searchUsers);
router.delete('/delete-me',                   verifyToken, user_controller.deleteMyAccount);
router.get('/feed',                           verifyToken, user_controller.getPersonalFeed);
router.get('/:userId/user-posts',             optionalAuth, user_controller.getUserPosts);
router.post('/save-post/:id',                 verifyToken, user_controller.toggleSavePost);
router.get('/saved-posts',                    verifyToken, user_controller.getSavedPosts);
router.post('/send-friend-request/:id',       verifyToken, user_controller.sendFriendRequest);
router.post('/approve-friend-request/:id',    verifyToken, user_controller.acceptFriendRequest);
router.delete('/reject-friend-request/:id',   verifyToken, user_controller.declineFriendRequest);
router.post("/unfriend/:targetUserId",        verifyToken, user_controller.unfriendUser);
router.get('/pending-requests',               verifyToken, user_controller.getPendingRequests);
router.get('/my-groups',                      verifyToken, user_controller.getMyGroups);
router.get("/likes/:postId",                  verifyToken, user_controller.didUserLikePost);
router.get("/my-friends",                     verifyToken, user_controller.getMyFriends);

module.exports = router;
