// נתיבים של קבוצה

const router = require('express').Router();
const groupController = require('../controllers/group_controller');
const { verifyToken } = require('../middlewares/authMiddleware');
const { upload } = require("../services/cloudinary_service");

router.post('/create-group',                            upload.single("image"), verifyToken, groupController.createGroup);
router.put('/:groupId/update-group',                    upload.single("image"), verifyToken, groupController.updateGroup);
router.delete('/:groupId/delete-group',                 verifyToken, groupController.deleteGroup);
router.post('/:groupId/join-request',                   verifyToken, groupController.requestToJoinGroup); // בקשת הצטרפות לקבוצה פרטית
router.post('/:groupId/approve-join-request/:userId',   verifyToken, groupController.approveJoinRequest);
router.delete('/:groupId/reject-join-request/:userId',  verifyToken, groupController.rejectJoinRequest);
router.post('/:groupId/join',                           verifyToken, groupController.joinPublicGroup); // הצטרפות לקבוצה ציבורית
router.post('/:groupId/leave',                          verifyToken, groupController.leaveGroup);
router.get('/:groupId/pending-requests',                verifyToken, groupController.getPendingRequests);
router.get('/:groupId/me',                              groupController.getGroupDetails);
router.get('/:groupId/members',                         groupController.getGroupMembers);
router.get('/:groupId/posts',                           verifyToken, groupController.getGroupPosts);
router.get('/search-groups',                            verifyToken, groupController.searchGroups);

module.exports = router;
