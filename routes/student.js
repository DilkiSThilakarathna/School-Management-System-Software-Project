const express = require('express');
const controller = require('../controllers/student');
const { requireAuth, forwardAuth } = require('../middlewares/studentAuth');
const {assignmentView, generatePdf}  = require('../controllers/student');

const router = express.Router();

// get login page
router.get('/login', forwardAuth, controller.getLogin);
router.post('/login', controller.postLogin);

router.get('/dashboard', requireAuth, controller.getDashboard);
router.get('/profile', requireAuth, controller.getProfile);

router.get('/selectAttendance', requireAuth, controller.getSelectAttendance);
router.post('/selectAttendance', requireAuth, controller.postSelectAttendance);

router.get('/timetable', requireAuth, controller.getTimeTable);

router.get('/logout', requireAuth, controller.getLogout);

// 1.5 FORGET PASSWORD
router.get('/forgot-password', forwardAuth, controller.getForgotPassword);
router.put('/forgot-password', controller.forgotPassword);

// 1.6 RESET PASSWORD
router.get('/resetpassword/:id', forwardAuth, controller.getResetPassword);
router.put('/resetpassword', controller.resetPassword);

//upload assignment
router.get('/uploadAssignment', requireAuth, controller.getAssignmentUpload);
router.post('/uploadAssignment', requireAuth, controller.postAssignmentUpload);

//view assignments

router.get('/viewAssignment', requireAuth, controller.viewAssignment);

router.get('/viewSpecificAssignment/:name', requireAuth, controller.getSpecificAssignment);
router.get('/viewTodoAssignment/:name', requireAuth, controller.getTodoAssignment);

router.get('/editSpecificAssignment/:id', requireAuth, controller.getEditSpecificAssignment);
router.post('/editSpecificAssignment', requireAuth, controller.putEditSpecificAssignment);

//view Assignment marks
router.get('/viewMarks', requireAuth, controller.getAssignmentMarks);
router.post('/viewMarks', requireAuth, controller.postAssignmentMarks);

router.get('/select_student_timetable', requireAuth, controller.getStudent);
router.post('/timetable', requireAuth, controller.getTimeTable);

router.get('/viewQuiz', requireAuth, controller.viewQuiz);
router.get('/viewSpecificQuiz/:id', requireAuth, controller.getSpecificQuiz);

router.post('/viewSpecificQuiz', requireAuth, controller.postViewSpecificQuiz);
module.exports = router;
