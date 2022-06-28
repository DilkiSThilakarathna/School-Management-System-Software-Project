const express = require('express');
const controller = require('../controllers/staff');
const { requireAuth, forwardAuth } = require('../middlewares/staffAuth');

const router = express.Router();

// login page
router.get('/login', forwardAuth, controller.getLogin);
router.post('/login', controller.postLogin);

router.get('/dashboard', requireAuth, controller.getDashboard);
router.get('/profile', requireAuth, controller.getProfile);
router.get('/logout', requireAuth, controller.getLogout);

router.get('/selectClassAttendance', requireAuth, controller.getMarkAttendance);
router.post('/selectClassAttendance', requireAuth, controller.postMarkAttendance);

router.get('/studentMarks', requireAuth, controller.getAssignmentMarks);
router.post('/studentMarks', requireAuth, controller.postAssignmentMarks);

router.get('/timetable', requireAuth, controller.getTimeTable);

// router.post('/attendance', requireAuth, controller.markAttendance);

router.get('/student-report', requireAuth, controller.getStudentReport);

router.get('/class-report', requireAuth, controller.selectClassReport);
router.get('/class-report/class/:id', requireAuth, controller.getClassReport);

// 1.5 FORGET PASSWORD
router.get('/forgot-password', forwardAuth, controller.getForgotPassword);
router.put('/forgot-password', controller.forgotPassword);

// 1.6 RESET PASSWORD
router.get('/resetpassword/:id', forwardAuth, controller.getResetPassword);
router.put('/resetpassword', controller.resetPassword);

//Upload Assignment
router.get('/viewAssignment', requireAuth, controller.getViewAssignment);
router.post('/viewAssignment', requireAuth, controller.postViewAssignment);

//view submited assignment
router.get('/viewSpecificAssignment/:name', requireAuth, controller.getSpecificAssignment);
router.get('/viewSpecificAssignment/:name', requireAuth, controller.getSpecificAssignmentFile);

// see the assignments by teacher
router.post('/assignmentsByTeacher', requireAuth, controller.postAssignmentUploadByTeacher);
router.get('/assignmentsByTeacher', requireAuth, controller.getAssignmentUploadByTeacher);

// 4.2 Add notice
router.get('/addNotice', requireAuth, controller.getAddNotice);
router.post('/addNotice', requireAuth,  controller.postAddNotice);

router.get('/quiz', requireAuth, controller.getQuiz);
router.post('/quiz', requireAuth, controller.postQuizDetails);


router.get('/createQuiz', requireAuth, controller.getCreateQuiz);
router.post('/createQuiz', requireAuth, controller.postCreateQuiz);

module.exports = router;
