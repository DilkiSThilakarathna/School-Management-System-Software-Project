const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const fs= require('fs');
const path=require('path');
// const dirPath= path.join(__dirname + '/public','doc');
// console.log("dirPath",dirPath);

const cur_dir = process.cwd();
const dirPath= path.join(cur_dir + '/public','doc');
let uploadFile;

const mailgun = require('mailgun-js');
const multer = require("multer");
const {v4: uuidv4} = require("uuid");
const DOMAIN = process.env.DOMAIN_NAME;
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN });



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

// LOGIN
exports.getLogin = (req, res, next) => {
  res.render('Staff/login');
};

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;
  let errors = [];
  const sql1 = 'SELECT * FROM staff WHERE email = ?';
  const users = await queryParamPromise(sql1, [email]);
  if (
    users.length === 0 ||
    !(await bcrypt.compare(password, users[0].password))
  ) {
    errors.push({ msg: 'Email or Password is Incorrect' });
    res.status(401).render('Staff/login', { errors });
  } else {
    const token = jwt.sign({ id: users[0].st_id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.redirect('/staff/dashboard');
  }
};

exports.getDashboard = async (req, res, next) => {
  const sql1 = 'SELECT * FROM staff WHERE st_id = ?';
  const notices = await zeroParamPromise('SELECT * FROM notice');
  const user = req.user;
  const data = await queryParamPromise(sql1, [user]);
  res.render('Staff/dashboard', { user: data[0],notices:notices,
    page_name: 'overview' });
};

exports.getProfile = async (req, res, next) => {
  const sql1 = 'SELECT * FROM staff WHERE st_id = ?';
  const user = req.user;
  const data = await queryParamPromise(sql1, [user]);
  const userDOB = data[0].dob;
  const sql2 = 'SELECT d_name FROM department WHERE dept_id = ?';
  const deptData = await queryParamPromise(sql2, [data[0].dept_id]);
  const staffId = data[0].st_id;
  const sql3 =
    'SELECT cl.class_id, cl.section, cl.semester, cl.c_id, co.name FROM class AS cl, course AS co WHERE cl.st_id = ? AND co.c_id = cl.c_id';
  const classData = await queryParamPromise(sql3, [staffId]);
 console.log(classData);
  res.render('Staff/profile', {
    user: data[0],
    userDOB,
    deptData,
    classData,
    page_name: 'profile',
  });
};

exports.getTimeTable = async (req, res, next) => {
  const staffData = (
    await queryParamPromise('SELECT * FROM staff WHERE st_id = ?', [req.user])
  )[0];
  const timeTableData = await queryParamPromise(
    'select * from time_table where st_id = ? order by day, start_time',
    [req.user]
  );
  console.log(timeTableData);
  const startTimes = ['10:00', '11:00', '12:00', '13:00'];
  const endTimes = ['11:00', '12:00', '13:00', '14:00'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  res.render('Staff/timetable', {
    page_name: 'timetable',
    timeTableData,
    startTimes,
    staffData,
    endTimes,
    dayNames,
  });
};

exports.getMarkAttendance = async (req, res, next) => {
  const sql2 = 'SELECT s_name FROM student';
  const students = await queryParamPromise(sql2);

  res.render('Staff/selectClassAttendance', {
    students:students,
    page_name: 'selectClassAttendance',
  });
};

exports.postMarkAttendance = async (req, res, next) => {
  const user = req.body.studentName;
  const sql1 = 'SELECT s_id FROM student WHERE s_name = ?';
  const studentId = await queryParamPromise(sql1, [user]);
  const staffId = req.user;
  const sql2 = 'SELECT dept_id FROM staff WHERE st_id = ?';
  const dept_id = await queryParamPromise(sql2, [staffId]);
  const sql3 = 'SELECT c_id FROM course WHERE dept_id = ?';
  const c_id = await queryParamPromise(sql3, [dept_id[0].dept_id]);
  await queryParamPromise('insert into attendance set ?', {
    s_id: studentId[0].s_id,
    date: req.body.date,
    status: req.body.status == 'yes' ? 1 : 0,
    c_id:c_id[0].c_id,

  });
  req.flash('success_msg', ' student attendance added successfully');
  res.redirect('/staff/dashboard');
};

exports.getAssignmentMarks = async (req, res, next) => {
  const sql1 = 'SELECT * FROM course';
  const sql2 = 'SELECT s_name FROM student';
  const subjects = await queryParamPromise(sql1);
  const students = await queryParamPromise(sql2);
  res.render('Staff/studentMarks', {
    subjects:subjects,
    students:students,
    page_name: 'studentMarks',
  });
}

exports.postAssignmentMarks = async (req, res, next) => {
  const sql1 = 'SELECT * FROM course WHERE name = ?';
  const courseId = await queryParamPromise(sql1, [req.body.subjectName]);
  const sql2 = 'SELECT s_id FROM student WHERE s_name = ?';
  const sId = await queryParamPromise(sql2, [req.body.student]);
  console.log(sId[0]);
  await queryParamPromise('insert into marks set ?', {
    test_name: req.body.testName,
    test_id:req.body.tid,
    test_marks:req.body.test_mark,
    course_id:courseId[0].c_id,
    course_name:req.body.subjectName,
    s_id: sId[0].s_id,
  });
  req.flash('success_msg', ' added student marks successfully');
  res.redirect('/staff/dashboard');
}

exports.getStudentReport = async (req, res, next) => {
  const sql1 = 'SELECT * FROM staff WHERE st_id = ?';
  const user = req.user;
  const data = await queryParamPromise(sql1, [user]);

  const sql3 =
    'SELECT cl.class_id, cl.section, cl.semester, cl.c_id, co.name FROM class AS cl, course AS co WHERE st_id = ? AND co.c_id = cl.c_id ORDER BY cl.semester;';
  const classData = await queryParamPromise(sql3, [data[0].st_id]);

  res.render('Staff/selectClass', {
    user: data[0],
    classData,
    btnInfo: 'Students',
    page_name: 'stu-report',
  });
};

exports.selectClassReport = async (req, res, next) => {
  const sql1 = 'SELECT * FROM staff WHERE st_id = ?';
  const user = req.user;
  const data = await queryParamPromise(sql1, [user]);

  const sql3 =
    'SELECT cl.class_id, cl.section, cl.semester, cl.c_id, co.name FROM class AS cl, course AS co WHERE st_id = ? AND co.c_id = cl.c_id ORDER BY cl.semester;';
  const classData = await queryParamPromise(sql3, [data[0].st_id]);

  res.render('Staff/selectClassReport', {
    user: data[0],
    classData,
    btnInfo: 'Check Status',
    page_name: 'cls-report',
  });
};

exports.getClassReport = async (req, res, next) => {
  const courseId = req.params.id;
  const staffId = req.user;
  const section = req.query.section;
  const classData = await queryParamPromise(
    'SELECT * FROM class WHERE c_id = ? AND st_id = ? AND section = ?',
    [courseId, staffId, section]
  );
  const sql1 = 'SELECT * FROM staff WHERE st_id = ?';
  const user = req.user;
  const data = await queryParamPromise(sql1, [user]);
  res.render('Staff/getClassReport', {
    user: data[0],
    classData,
    page_name: 'cls-report',
  });
};

exports.getLogout = (req, res, next) => {
  res.cookie('jwt', '', { maxAge: 1 });
  req.flash('success_msg', 'You are logged out');
  res.redirect('/staff/login');
};




// FORGOT PASSWORD
exports.getForgotPassword = (req, res, next) => {
  res.render('Staff/forgotPassword');
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).render('Staff/forgotPassword');
  }

  let errors = [];

  const sql1 = 'SELECT * FROM staff WHERE email = ?';
  const results = await queryParamPromise(sql1, [email]);
  if (!results || results.length === 0) {
    errors.push({ msg: 'That email is not registered!' });
    return res.status(401).render('Staff/forgotPassword', {
      errors,
    });
  }

  const token = jwt.sign(
    { _id: results[0].st_id },
    process.env.RESET_PASSWORD_KEY,
    { expiresIn: '20m' }
  );

  const data = {
    from: 'school.management@mail.com',
    to: email,
    subject: 'Reset Password Link',
    html: `<h2>Please click on given link to reset your password</h2>
                <p><a href="${process.env.URL}/staff/resetpassword/${token}">Reset Password</a></p>
                <hr>
                <p><b>The link will expire in 20m!</b></p>
              `,
  };

  const sql2 = 'UPDATE staff SET resetLink = ? WHERE email = ?';
  db.query(sql2, [token, email], (err, success) => {
    if (err) {
      errors.push({ msg: 'Error In ResetLink' });
      res.render('Staff/forgotPassword', { errors });
    } else {
      mg.messages().send(data, (err, body) => {
        console.log(body);
        if (err) throw err;

        else {
          req.flash('success_msg', 'Reset Link Sent Successfully!');
          res.redirect('/staff/forgot-password');
        }
      });
    }
  });
};

exports.getResetPassword = (req, res, next) => {
  const resetLinkStaff = req.params.id;
  res.render('Staff/resetPassword', { resetLinkStaff });
};

exports.resetPassword = (req, res, next) => {
  const { resetLinkStaff, password, confirmPass } = req.body;

  let errors = [];

  if (password !== confirmPass) {
    req.flash('error_msg', 'Passwords do not match!');
    res.redirect(`/staff/resetpassword/${resetLinkStaff}`);
  } else {
    if (resetLinkStaff) {
      jwt.verify(resetLinkStaff, process.env.RESET_PASSWORD_KEY, (err, data) => {
        if (err) {
          errors.push({ msg: 'Token Expired!' });
          res.render('Staff/resetPassword', { errors });
        } else {
          const sql1 = 'SELECT * FROM staff WHERE resetLink = ?';
          db.query(sql1, [resetLinkStaff], async (err, results) => {
            if (err || results.length === 0) {
              console.log("err",err);
              throw err;
            } else {
              let hashed = await bcrypt.hash(password, 8);
              console.log("result",hashed);
              const sql2 = 'UPDATE staff SET password = ? WHERE resetLink = ?';
              db.query(sql2, [hashed, resetLinkStaff], (errorData, retData) => {
                if (errorData) {
                  throw errorData;
                } else {
                  req.flash(
                    'success_msg',
                    'Password Changed Successfully! Login Now'
                  );
                  res.redirect('/staff/login');
                }
              });
            }
          });
        }
      });
    } else {
      errors.push({ msg: 'Authentication Error' });
      res.render('Staff/resetPassword', { errors });
    }
  }
};

exports.postViewAssignment = async (req, res, next) => {
  console.log("postViewAssignment");
  fs.readdir(dirPath,(err,files)=>{
    files.forEach((item)=>{
      console.warn("file name is : ",item)
    });
  });
}
exports.getViewAssignment = async (req, res, next) => {
  const sql = 'SELECT * FROM file';
  const results = await queryParamPromise(sql);
  let fileNames = [];
  let subjectName = [];
  for (let i = 0; i < results.length; i++) {
    fileNames.push(results[i].name);
    subjectName.push(results[i].subject_name)
  }
  res.render('Staff/viewAssignment', {
    uploadFileNames: fileNames,
    page_name: 'viewAssignment',
    subjectName:subjectName,
  });
  fileNames = [];
  subjectName = [];
}

exports.getSpecificAssignment = async (req, res, next) => {
  const studentFileName = req.params.name;
  const sql1 = 'SELECT * FROM assignmentfile WHERE name = ?';
  const fileData = await queryParamPromise(sql1, [studentFileName]);

  res.render('Staff/viewSpecificAssignment', {
    fileData: fileData[0].description,
    page_name: 'viewSpecificAssignment',
  });

}
exports.getSpecificAssignmentFile = async (req, res, next) => {
  const studentFileName = req.params.name;
  const sql1 = 'SELECT * FROM assignment WHERE name = ?';
  const fileData = await queryParamPromise(sql1, [studentFileName]);
  console.log("fileData[0].description",fileData[0].description);

  res.render('Staff/viewSpecificAssignment', {
    fileData: fileData[0].description,
    page_name: 'viewSpecificAssignment',
  });

}
//upload assignments by teacher

const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    // Uploads is the Upload_folder_name
    cb(null, "public/assignment")
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


exports.postAssignmentUploadByTeacher = async (req, res , next) => {
  if (req.method == "POST") {
    // create an incoming form object
    upload(req,res,async function (err) {

      if (err) {

        // ERROR occured (here it can be occured due
        // to uploading image of size greater than
        // 1MB or uploading different file type)
        // alert("please add corrected tyoe"
        console.log(err);
       req.flash('error_msg','Error');
       res.redirect('/staff/assignmentsByTeacher');
      } else {

        // SUCCESS, image successfully uploaded
        const user = req.user;
        const sql4 = 'INSERT INTO assignmentfile SET ?';
        await queryParamPromise(sql4, {
          id: uuidv4(),
          name: uploadFile,
          description: '/assignment/' + uploadFile,
          st_id: user
        });
        req.flash('success_msg', 'Your Assignment uploaded');
        res.redirect('/Staff/dashboard');
      }
    });
  }
};

exports.getAssignmentUploadByTeacher = async (req, res, next) => {
  const user = req.user;
  const sql1 = 'SELECT * FROM assignmentfile WHERE st_id = ?';
  const fileData = await queryParamPromise(sql1, [user]);
  let fileNames = [];
  let fileId = [];
  for (let i = 0; i < fileData.length; i++) {
    fileNames.push(fileData[i].name);
    fileId.push(fileData[i].id);
  }
  res.render('Staff/assignmentsByTeacher', {
    page_name: 'assignmentsByTeacher',
    uploadFilePath: '/assignment/'+ uploadFile,
    uploadedFile: fileNames,
    uploadFileId:fileId,
  });
};


// 6.3 Add Notice
exports.getAddNotice = async (req, res, next) => {
  res.render('Staff/addNotice', {
    page_name: 'notices',
  });
};
exports.postAddNotice = async (req, res, next) => {
  let {title, description} = req.body;
  let currentDate = new Date().toJSON().slice(0, 10);
  const sql ='SELECT st_name from staff WHERE st_id=?';
  const user = (await queryParamPromise(sql, [req.user]))[0];
  console.log(user);
  const sql2 = 'INSERT INTO notice SET ?';
  await queryParamPromise(sql2, {
    n_id:uuidv4(),
    title:title,
    description:description,
    added_by:user.st_name,
    added_date:currentDate,
  });
  req.flash('success_msg', 'Notice added successfully');
  return res.redirect('/staff/dashboard');
};


exports.getQuiz = async (req, res, next) => {
  const sql = 'SELECT name FROM course';
  const results = await queryParamPromise(sql);
  res.render('staff/quiz', {
    subjectList: results,
    page_name:'quiz',
  });
}

exports.postQuizDetails = async (req, res, next) => {
  const numberOfQuestions = req.body.noQuiz;
  const quiz_id = Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  await queryParamPromise('insert into quizdetails set ?', {
    quiz_id:quiz_id,
    quiz_name: req.body.testName,
    subjectName:req.body.subjectName,
    numberOfQuestions:req.body.noQuiz,
    createdBy:req.user,
  });
  res.cookie("quiz_id",quiz_id);
  res.render('staff/createQuiz', {
    quiz_id:quiz_id,
    numberOfQuestions: numberOfQuestions,
    page_name:'createQuiz',
  });
}

exports.getCreateQuiz = async (req, res, next) => {
  console.log(req);
}

exports.postCreateQuiz = async (req, res, next) => {
  let questions;
  for (let i = 0; i < req.body.question.length; i++) {
    await queryParamPromise('insert into quizcreate set ?', {
      quiz_id:req.cookies.quiz_id,
      questions: req.body.question[i],
      createdBy:req.user,
    });
  }
  req.flash('success_msg', ' Quiz Created successfully');
  res.redirect('/staff/dashboard');
}
