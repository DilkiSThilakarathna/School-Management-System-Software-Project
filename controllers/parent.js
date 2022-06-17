const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const mailgun = require('mailgun-js');
const ejs = require("ejs");
const path = require("path");
const pdf = require("html-pdf");
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

exports.getLogin = (req, res, next) => {
    res.render('Parent/login');
};

exports.postLogin = (req, res, next) => {
    try {
        const { email, password } = req.body;
        let errors = [];

        if (!email || !password) {
            errors.push({ msg: 'Please enter all fields' });
            return res.status(400).render('Parent/login', { errors });
        }

        let sql5 = 'SELECT * FROM parent WHERE email = ?';
        db.query(sql5, [email], async (err, results) => {
            if (
                results.length === 0 ||
                !(await bcrypt.compare(password, results[0].password))
            ) {
                errors.push({ msg: 'Email or Password is Incorrect' });
                res.status(401).render('Parent/login', { errors });
            } else {
                const user = results[0];
                const token = jwt.sign({ id: user.p_id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRE,
                });

                res.cookie('jwt', token, {
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000,
                });
                res.redirect('/parent/dashboard');
            }
        });
    } catch (err) {
        throw err;
    }
};

exports.getDashboard = (req, res, next) => {
    let sql6 = 'SELECT * FROM parent WHERE p_id = ?';
    db.query(sql6, [req.user], (err, result) => {
        if (err) throw err;
        res.render('Parent/dashboard', {
            name: result[0].p_name,
            page_name: 'overview',
        });
    });
};

exports.getProfile = async (req, res, next) => {
    const sql = 'SELECT * FROM parent WHERE p_id = ?';
    const sql2 =
        'SELECT s_name FROM student WHERE parent_id = ?';

    const profileData = await queryParamPromise(sql, [req.user]);
    const studentNames = await queryParamPromise(sql2, profileData[0].p_id);

    const dobs = new Date(profileData[0].dob);
    console.log(studentNames);
    let dob =
        dobs.getDate() + '/' + (dobs.getMonth() + 1) + '/' + dobs.getFullYear();

    return res.render('Parent/profile', {
        data: profileData,
        page_name: 'profile',
        students: studentNames
    });
};

exports.getSelectAttendance = async (req, res, next) => {
    res.render('Parent/selectAttendance', {
        page_name: 'attendance',
        curYear: 2021,
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
    const { year, semester } = req.body;
    const sql1 = 'SELECT * FROM student WHERE s_id = ?';
    const studentData = (await queryParamPromise(sql1, [req.user]))[0];
    const sql2 = 'SELECT * from course WHERE dept_id = ? AND semester = ?';
    const courseData = await queryParamPromise(sql2, [
        studentData.dept_id,
        semester,
    ]);
    var monthDates, isPresent;
    if (semester % 2 === 0) {
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
    res.render('Parent/attendance', {
        page_name: 'attendance',
        curSemester: semester,
        studentData,
        courseData,
        monthDates,
        isPresent,
    });
};

// 4.2 View Marks

exports.getMarksDetails = async (req, res, next) => {
    const results = await zeroParamPromise('SELECT s_id,s_name from student');
    let students = [];
    for (let i = 0; i < results.length; ++i) {
        students.push(results[i].s_name);
    }
    console.log(students);
    res.render('Parent/marks', {
        page_name: 'marks',
        students: students,
    });
};

exports.viewMarks = async (req, res, next) => {
    console.log(req.body);
    let {student} = req.body;
    console.log(student);
    const sql1 = 'SELECT s_id  from student where s_name= ?';
    const studentData = (await queryParamPromise(sql1, [student]))[0];
    console.log(studentData.s_id);
    const sql2 = 'SELECT test_marks, (SELECT name from course where c_id=course_id)as subject ,(SELECT c_type from course where c_id=course_id)as subject_type from marks where s_id = ?';
    const results = (await queryParamPromise(sql2, [studentData.s_id]));

    let st_marks =[];
    for(const result of results ){
        st_marks.push(result);
    }
    console.log(st_marks);
    //res.redirect('/parent/view-marks');
    res.render('Parent/view-marks', {
        page_name: 'marks',
        marks:st_marks,
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
    res.render('Parent/select_student_timetable', {
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
    const startTimes = ['10:00', '11:00', '12:00', '13:00'];
    const endTimes = ['11:00', '12:00', '13:00', '14:00'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    res.render('Parent/timetable', {
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
    res.redirect('/parent/login');
};

// FORGOT PASSWORD
exports.getForgotPassword = (req, res, next) => {
    res.render('Parent/forgotPassword');
};

exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).render('Parent/forgotPassword');
    }

    let errors = [];

    const sql1 = 'SELECT * FROM parent WHERE email = ?';
    const results = await queryParamPromise(sql1, [email]);
    if (!results || results.length === 0) {
        errors.push({ msg: 'That email is not registered!' });
        return res.status(401).render('Parent/forgotPassword', {
            errors,
        });
    }

    const token = jwt.sign(
        { _id: results[0].p_id },
        process.env.RESET_PASSWORD_KEY,
        { expiresIn: '20m' }
    );

    console.log(token);
    const data = {
        from: 'pulsarasandeepa123@mail.com',
        to: email,
        subject: 'Reset Password Link',
        html: `<h2>Please click on given link to reset your password</h2>
                <p><a href="${process.env.URL}/parent/resetpassword/${token}">Reset Password</a></p>
                <hr>
                <p><b>The link will expire in 20m!</b></p>
              `,
    };

    console.log("data",data);
    const sql2 = 'UPDATE parent SET res' +
        'etLink = ? WHERE email = ?';
    db.query(sql2, [token, email], (err, success) => {
        if (err) {
            errors.push({ msg: 'Error In ResetLink' });
            res.render('Parent/forgotPassword', { errors });
        } else {
            mg.messages().send(data, (err, body) => {
                if (err) throw err;
                else {
                    console.log("body",body);
                    req.flash('success_msg', 'Reset Link Sent Successfully!');
                    res.redirect('/parent/forgot-password');
                }
            });
        }
    });
};

exports.getResetPassword = (req, res, next) => {
    const resetLink = req.params.id;
    res.render('Parent/resetPassword', { resetLink });
};

exports.resetPassword = (req, res, next) => {
    const { resetLink, password, confirmPass } = req.body;

    let errors = [];

    if (password !== confirmPass) {
        req.flash('error_msg', 'Passwords do not match!');
        res.redirect(`/parent/resetpassword/${resetLink}`);
    } else {
        if (resetLink) {
            jwt.verify(resetLink, process.env.RESET_PASSWORD_KEY, (err, data) => {
                if (err) {
                    errors.push({ msg: 'Token Expired!' });
                    res.render('Parent/resetPassword', { errors });
                } else {
                    console.log("data",resetLink);
                    const sql1 = 'SELECT * FROM parent WHERE resetLink = ?';
                    db.query(sql1, [resetLink], async (err, results) => {
                        if (err || results.length === 0) {
                            throw err;
                        } else {
                            let hashed = await bcrypt.hash(password, 8);

                            const sql2 =
                                'UPDATE parent SET password = ? WHERE resetLink = ?';
                            db.query(sql2, [hashed, resetLink], (errorData, retData) => {
                                if (errorData) {
                                    throw errorData;
                                } else {
                                    req.flash(
                                        'success_msg',
                                        'Password Changed Successfully! Login Now'
                                    );
                                    res.redirect('/parent/login');
                                }
                            });
                        }
                    });
                }
            });
        } else {
            errors.push({ msg: 'Authentication Error' });
            res.render('Parent/resetPassword', { errors });
        }
    }
};
