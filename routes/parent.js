const express = require('express');
const controller = require('../controllers/parent');
const { requireAuth, forwardAuth } = require('../middlewares/parentAuth');

const router = express.Router();

// get login page
router.get('/login', forwardAuth, controller.getLogin);
router.post('/login', controller.postLogin);

router.get('/dashboard', requireAuth, controller.getDashboard);
router.get('/profile', requireAuth, controller.getProfile);

router.get('/selectAttendance', requireAuth, controller.getSelectAttendance);
router.post('/selectAttendance', requireAuth, controller.postSelectAttendance);

router.get('/select_student_timetable', requireAuth, controller.getStudent);
router.post('/timetable', requireAuth, controller.getTimeTable);

router.get('/marks', requireAuth, controller.getMarksDetails);
router.post('/view-marks', requireAuth, controller.viewMarks);

router.get('/logout', requireAuth, controller.getLogout);

// 1.5 FORGET PASSWORD
router.get('/forgot-password', forwardAuth, controller.getForgotPassword);
router.put('/forgot-password', controller.forgotPassword);

// 1.6 RESET PASSWORD
router.get('/resetpassword/:id', forwardAuth, controller.getResetPassword);
router.put('/resetpassword', controller.resetPassword);

router.get('/donate', requireAuth, controller.getDonate);
router.post('/donate', requireAuth, controller.postDonate);
router.get('/viewDonateHistory', requireAuth, controller.getDonateHistory);

router.get('/pay-student-fees', requireAuth, controller.getStudentDetails);
router.post('/pay-student-fees', requireAuth, controller.postStudentFees);
module.exports = router;
