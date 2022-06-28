const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const mailgun = require('mailgun-js');

const fs = require('fs');
const path = require('path');
const {v4: uuidv4} = require("uuid");

const DOMAIN = process.env.DOMAIN_NAME;
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN });

let uploadFile;



const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  dateStrings: 'date',
  database: 'smsdbms',
});

// Database query promises
const zeroParamPromise = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      return resolve(results);
    });
  });
};

const queryParamPromise = (sql, queryParam) => {
  return new Promise((resolve, reject) => {
    db.query(sql, queryParam, (err, results) => {
      if (err) return reject(err);
      return resolve(results);
    });
  });
};


exports.getLogin = (req, res, next) => {
  res.render('Student/login');
};

exports.postLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;
    let errors = [];

    if (!email || !password) {
      errors.push({ msg: 'Please enter all fields' });
      return res.status(400).render('Student/login', { errors });
    }

    let sql5 = 'SELECT * FROM student WHERE email = ?';
    db.query(sql5, [email], async (err, results) => {
      if (
        results.length === 0 ||
        !(await bcrypt.compare(password, results[0].password))
      ) {
        errors.push({ msg: 'Email or Password is Incorrect' });
        res.status(401).render('Student/login', { errors });
      } else {
        const user = results[0];
        const token = jwt.sign({ id: user.s_id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE,
        });

        res.cookie('jwt', token, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.redirect('/student/dashboard');
      }
    });
  } catch (err) {
    throw err;
  }
};

exports.getDashboard =async (req, res, next) => {
  let sql6 = 'SELECT * FROM student WHERE s_id = ?';
  const notices = await zeroParamPromise('SELECT * FROM notice');
  db.query(sql6, [req.user], (err, result) => {
    if (err) throw err;
    res.render('Student/dashboard', {
      name: result[0].s_name,
      notices:notices,
      page_name: 'overview',
    });
  });
};

exports.getProfile = async (req, res, next) => {
  const sql = 'SELECT * FROM student WHERE s_id = ?';
  const sql2 =
    'SELECT d_name FROM department WHERE dept_id = (SELECT dept_id FROM student WHERE s_id = ?)';

  const profileData = await queryParamPromise(sql, [req.user]);
  const deptName = await queryParamPromise(sql2, [req.user]);

  const dobs = new Date(profileData[0].dob);
  const jd = new Date(profileData[0].joining_date);

  let dob =
    dobs.getDate() + '/' + (dobs.getMonth() + 1) + '/' + dobs.getFullYear();
  let jds = jd.getDate() + '/' + (jd.getMonth() + 1) + '/' + jd.getFullYear();

  return res.render('Student/profile', {
    data: profileData,
    page_name: 'profile',
    dname: deptName[0].d_name,
    dob,
    jds,
  });
};

exports.getSelectAttendance = async (req, res, next) => {

  const sql1 = 'SELECT s_name from student';
  const studentData = (await queryParamPromise(sql1));
  res.render('Student/selectAttendance', {
    page_name: 'attendance',
    studentData: studentData,
  });
};

const getAttendanceData = async (year, months, courseData, s_id) => {
  let monthDates = [];
  let isPresent = [];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'April',
    'May',
    'June',
    'July',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  for (month of months) {
    let dayNumber = 1;
    let date = new Date(year, month, dayNumber);
    let days = [];
    let outerStatus = [];
    while (date.getMonth() === month) {
      let status = [];
      const sqlDate =
        year +
        '-' +
        (month < 9 ? '0' + (month + 1) : month + 1) +
        '-' +
        (dayNumber <= 9 ? '0' + dayNumber : dayNumber);
      const sql3 =
        'SELECT status from attendance WHERE c_id = ? AND s_id = ? AND date = ?';
      for (course of courseData) {
        const attendanceData = (
          await queryParamPromise(sql3, [course.c_id, s_id, sqlDate])
        )[0];
        status.push(attendanceData);
      }
      outerStatus.push(status);
      const monthName = monthNames[month];
      days.push({ monthName, dayNumber });
      dayNumber++;
      date.setDate(date.getDate() + 1);
    }
    isPresent.push(outerStatus);
    monthDates.push(days);
  }
  return [monthDates, isPresent];
};

exports.postSelectAttendance = async (req, res, next) => {
  const { name,semester ,year} = req.body;
  const sql1 = 'SELECT * FROM student WHERE s_name = ?';
  const studentData = (await queryParamPromise(sql1, name))[0];
  const sql2 = 'SELECT * from course WHERE dept_id = ? AND semester = ?';
  const courseData = await queryParamPromise(sql2, [
    studentData.dept_id,
    semester,
  ]);
  var monthDates, isPresent;
  if (semester % 2 === 1) {
    [monthDates, isPresent] = await getAttendanceData(
      parseInt(year),
      [0, 1, 2, 3],
      courseData,
      req.user
    );
  } else {
    [monthDates, isPresent] = await getAttendanceData(
      parseInt(year),
      [7, 8, 9, 10],
      courseData,
      req.user
    );
  }
  res.render('Student/attendance', {
    page_name: 'attendance',
    curSemester: semester,
    studentData,
    courseData,
    monthDates,
    isPresent,
  });
};

exports.getStudent = async (req, res, next) => {
  const results = await zeroParamPromise('SELECT s_id,s_name from student');
  const results1 = await zeroParamPromise('SELECT c_id,name from course');
  const results2 = await zeroParamPromise('SELECT class_id,section,semester from class');
  const results3 = await zeroParamPromise('SELECT dept_id,d_name from department');

  let students = [];
  let courses =[];
  let classes =[];
  let departments=[];
  for (let i = 0; i < results.length; ++i) {
    students.push(results[i].s_name);
  }
  for (let i = 0; i < results1.length; ++i) {
    courses.push(results1[i].name);
  }
  for (let i = 0; i < results2.length; ++i) {
    classes.push(results2[i].semester);
  }
  for (let i = 0; i < results3.length; ++i) {
    departments.push(results3[i].dept_id);
  }

  console.log(students);
  res.render('student/select_student_timetable', {
    page_name: 'timetable',
    students: students,
    courses:courses,
    classes:classes,
    departments:departments
  });
};

exports.getTimeTable = async (req, res, next) => {
  console.log("timetable");
  const {student, course, semester, department} = req.body;
  const sql1 = 'SELECT * FROM student WHERE s_name = ?';
  const studentData = (await queryParamPromise(sql1, student))[0];
  console.log(studentData);
  const days = (
      await queryParamPromise(
          'select datediff(current_date(), ?) as diff',
          studentData.joining_date
      )
  )[0].diff;
  //const sem = Math.floor(days / 182) + 1;
  let coursesData = await queryParamPromise(
      'select c_id from course where dept_id = ? and semester = ?',
      [department, semester]
  );
  for (let i = 0; i < coursesData.length; ++i) {
    coursesData[i] = coursesData[i].c_id;
  }
  console.log(coursesData);
  let timeTableData = await queryParamPromise(
      'select * from time_table where c_id in (?) and section = ? order by day, start_time',
      [coursesData, studentData.section]
  );
  console.log(timeTableData);
  const classesData = await queryParamPromise(
      'select c_id, st_id from class where c_id in (?) and section = ?',
      [coursesData, studentData.section]
  );
  for (let classData of classesData) {
    const staffName = (
        await queryParamPromise('select st_name from staff where st_id = ?', [
          classData.st_id,
        ])
    )[0].st_name;
    const courseName = (
        await queryParamPromise('select name from course where c_id = ?', [
          classData.c_id,
        ])
    )[0].name;
    classData.staffName = staffName;
    classData.courseName = courseName;
  }
  const startTimes = ['10:00:00', '11:00:00', '12:00:00', '13:00:00'];
  const endTimes = ['11:00:00', '12:00:00', '13:00:00', '14:00:00'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  res.render('student/timetable', {
    page_name: 'timetable',
    studentData,
    semester,
    timeTableData,
    startTimes,
    endTimes,
    dayNames,
    classesData,
  });
};

exports.getLogout = (req, res, next) => {
  res.cookie('jwt', '', { maxAge: 1 });
  req.flash('success_msg', 'You are logged out');
  res.redirect('/student/login');
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    // Uploads is the Upload_folder_name
    cb(null, "public/doc")
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    uploadFile = file.originalname;
  }
});

const maxSize = 1 * 1000 * 1000 * 1000;

const upload = multer({
  storage: storage,
  limits: {fileSize: maxSize},
  fileFilter: function (req, file, cb) {

    // Set the filetypes, it is optional
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);

    const extname = filetypes.test(path.extname(
        file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    return cb("Error: File upload only supports the "
        + "following filetypes - " + filetypes,null);
  }

// SMS is the name of file attribute
}).single("myFile");


exports.postAssignmentUpload = async (req, res, next) => {
  if (req.method == "POST") {
    // create an incoming form object
    upload(req,res,async function (err) {

      if (err) {

        // ERROR occured (here it can be occured due
        // to uploading image of size greater than
        // 1MB or uploading different file type)
        console.log(err);
        req.flash('error_msg','Error');
        res.redirect('/Student/uploadAssignment');
      } else {

        // SUCCESS, image successfully uploaded
        const user = req.user;
        const sql3 = 'INSERT INTO file SET ?';
        await queryParamPromise(sql3, {
          id: uuidv4(),
          name: uploadFile,
          description: '/doc/' + uploadFile,
          subject_name:req.body.subjectName,
          s_id: user
        });
        req.flash('success_msg', 'Your File uploaded in to SMS');
        res.redirect('/Student/uploadAssignment');
      }
    });
  }
};

exports.getEditSpecificAssignment = async (req, res, next) => {
  const fileId = req.params.id;
  const sql = 'SELECT name FROM course';
  const results = await zeroParamPromise(sql);
  res.cookie("id",fileId);
    res.render('Student/editSpecificAssignment', {
      subjectNames:results,
      page_name: 'editSpecificAssignment',
    });
}

exports.putEditSpecificAssignment = async (req, res, next) => {
  if (req.method == "POST") {
    // create an incoming form object
    upload(req,res,async function (err) {

      if (err) {

        // ERROR occured (here it can be occured due
        // to uploading image of size greater than
        // 1MB or uploading different file type)
        console.log(err);
        req.flash('error_msg','Error');
        res.redirect('/staff/assignmentsByTeacher');
      } else {

        // SUCCESS, image successfully uploaded
        // SUCCESS, image successfully uploaded
        const subjectName =  req.body
        const user = req.user;
        const fileId = req.cookies.id;
        const path = '/doc/' + uploadFile;
        const sql2 = 'update file set name=?, description=?, subject_name=? where id=?';
        await queryParamPromise(sql2, [uploadFile,path,subjectName.subjectName,fileId]);
        req.flash('success_msg', 'Your File resubmitted in to SMS');
        res.clearCookie("id");
        res.redirect('/Student/uploadAssignment');
      }
    });
  }

};

exports.getAssignmentUpload = async (req, res, next) => {
  const sql = 'SELECT name FROM course';
  const results = await zeroParamPromise(sql);
  const user = req.user;
  const sql1 = 'SELECT * FROM file WHERE s_id = ?';
  const fileData = await queryParamPromise(sql1, [user]);
  let fileNames = [];
  let fileId = [];
  for (let i = 0; i < fileData.length; i++) {
    fileNames.push(fileData[i].name);
    fileId.push(fileData[i].id);
  }
  if(req.method == "GET"){
    res.render('Student/uploadAssignment', {
      subjectNames:results,
      page_name: 'uploadAssignment',
      uploadFilePath: '/doc/'+ uploadFile,
      uploadedFile: fileNames,
      uploadFileId:fileId,
    });
    fileNames = [];
    fileId = [];
  }
}

exports.viewAssignment = async (req, res, next) => {
  const sql1 = 'SELECT name FROM assignmentfile';
  const results = await queryParamPromise(sql1);
  let assignmentFileNames = [];
  for (let i = 0; i < results.length; i++) {
    assignmentFileNames.push(results[i].name);
  }
  res.render('Student/viewAssignment', {
    uploadFileNames: assignmentFileNames,
    page_name: 'viewAssignment'
  });
  assignmentFileNames = [];
}

exports.getSpecificAssignment = async (req, res, next) => {
  const sql = 'SELECT name FROM course';
  const results = await zeroParamPromise(sql);
  const studentFileName = req.params.name;
  const sql1 = 'SELECT * FROM file WHERE name = ?';
  const fileData = await queryParamPromise(sql1, [studentFileName]);

  res.render('Student/viewSpecificAssignment', {
    fileData: fileData[0].description,
    page_name: 'viewSpecificAssignment' ,
    subjectNames:results,
  });

}

exports.getTodoAssignment = async (req, res, next) => {
  const sql = 'SELECT name FROM course';
  const results = await zeroParamPromise(sql);
  const studentFileName = req.params.name;
  const sql1 = 'SELECT * FROM assignmentfile WHERE name = ?';
  const fileData = await queryParamPromise(sql1, [studentFileName]);

  res.render('Student/viewSpecificAssignment', {
    fileData: fileData[0].description,
    page_name: 'viewSpecificAssignment' ,
    subjectNames:results,
  });

}

exports.getAssignmentMarks = async (req, res, next) => {
  const sql1 = 'SELECT * FROM marks';
  const marksData = (await queryParamPromise(sql1));
  res.render('Student/viewMarks', {
    page_name: 'viewMarks',
    marksData: marksData,
  });
}

exports.postAssignmentMarks = async (req, res, next) => {
  const {test_name, course_name} = req.body;
  const sql3 = 'select * from marks where test_name = ? and course_name in (?)';
  const selectedMarksData = await queryParamPromise(sql3, [test_name, course_name]);
  res.render('Student/viewSelectedMarks', {
    page_name: 'viewSelectedMarks',
    selectedMarksData: selectedMarksData,
  });

}


// FORGOT PASSWORD
exports.getForgotPassword = (req, res, next) => {
  res.render('Student/forgotPassword');
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).render('Student/forgotPassword');
  }

  let errors = [];

  const sql1 = 'SELECT * FROM student WHERE email = ?';
  const results = await queryParamPromise(sql1, [email]);
  if (!results || results.length === 0) {
    errors.push({ msg: 'That email is not registered!' });
    return res.status(401).render('Student/forgotPassword', {
      errors,
    });
  }

  const token = jwt.sign(
    { _id: results[0].s_id },
    process.env.RESET_PASSWORD_KEY,
    { expiresIn: '20m' }
  );

  console.log(token);
  const data = {
    from: 'school.management@gmail.com',
    to: email,
    subject: 'Reset Password Link',
    html: `<h2>Please click on given link to reset your password</h2>
                <p><a href="${process.env.URL}/student/resetpassword/${token}">Reset Password</a></p>
                <hr>
                <p><b>The link will expire in 20m!</b></p>
              `,
  };

  console.log("data",data);
  const sql2 = 'UPDATE student SET resetLink = ? WHERE email = ?';
  db.query(sql2, [token, email], (err, success) => {
    if (err) {
      errors.push({ msg: 'Error In ResetLink' });
      res.render('Student/forgotPassword', { errors });
    } else {
      mg.messages().send(data, (err, body) => {
        if (err) throw err;
        else {
          console.log("body",body);
          req.flash('success_msg', 'Reset Link Sent Successfully!');
          res.redirect('/student/forgot-password');
        }
      });
    }
  });
};

exports.getResetPassword = (req, res, next) => {
  const resetLink = req.params.id;
  res.render('Student/resetPassword', { resetLink });
};

exports.resetPassword = (req, res, next) => {
  const { resetLink, password, confirmPass } = req.body;

  let errors = [];

  if (password !== confirmPass) {
    req.flash('error_msg', 'Passwords do not match!');
    res.redirect(`/student/resetpassword/${resetLink}`);
  } else {
    if (resetLink) {
      jwt.verify(resetLink, process.env.RESET_PASSWORD_KEY, (err, data) => {
        if (err) {
          errors.push({ msg: 'Token Expired!' });
          res.render('Student/resetPassword', { errors });
        } else {
          console.log("data",resetLink);
          const sql1 = 'SELECT * FROM student WHERE resetLink = ?';
          db.query(sql1, [resetLink], async (err, results) => {
            if (err || results.length === 0) {
              throw err;
            } else {
              let hashed = await bcrypt.hash(password, 8);

              const sql2 =
                'UPDATE student SET password = ? WHERE resetLink = ?';
              db.query(sql2, [hashed, resetLink], (errorData, retData) => {
                if (errorData) {
                  throw errorData;
                } else {
                  req.flash(
                    'success_msg',
                    'Password Changed Successfully! Login Now'
                  );
                  res.redirect('/student/login');
                }
              });
            }
          });
        }
      });
    } else {
      errors.push({ msg: 'Authentication Error' });
      res.render('Student/resetPassword', { errors });
    }
  }
};

exports.viewQuiz = async (req, res, next) => {
  const sql1 = 'SELECT * FROM quizDetails';
  const results = await queryParamPromise(sql1);
  res.render('Student/viewQuiz', {
    quizDetails: results,
    page_name: 'viewQuiz'
  });
}

exports.getSpecificQuiz = async (req, res, next) => {
  const quiz_id = req.params.id;
  const sql1 = 'SELECT * FROM quizcreate WHERE quiz_id = ?';
  let quizData = await queryParamPromise(sql1, [quiz_id]);
  const sql2 = 'SELECT numberOfQuestions FROM quizdetails WHERE quiz_id = ?';
  const numberOfQuestions = await queryParamPromise(sql2, [quiz_id]);

  res.render('Student/viewSpecificQuiz', {
    questions: quizData,
    page_name: 'viewSpecificQuiz' ,
    numberOfQuestions:numberOfQuestions[0].numberOfQuestions,
  });

}

exports.postViewSpecificQuiz = async (req, res, next) => {
  for (let i = 0; i < req.body.answer.length; i++) {
    await queryParamPromise('insert into answer set ?', {
      quiz_id: req.cookies.quiz_id,
      answers: req.body.answer[i],
      answeredBy: req.user,
    });
  }
  req.flash('success_msg', ' Answered successfully');
  res.redirect('/student/dashboard');
}
