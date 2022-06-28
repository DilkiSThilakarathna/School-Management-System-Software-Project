use smsdbms;

CREATE TABLE IF NOT EXISTS `admin`(
	`admin_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    PRIMARY KEY(`admin_id`)
);

CREATE TABLE IF NOT EXISTS `course` (
	`c_id` VARCHAR(100) NOT NULL UNIQUE,
	`semester` INT NOT NULL,
	`name` VARCHAR(255) NOT NULL,
	`c_type` VARCHAR(255) NOT NULL,
	`credits` INT NOT NULL,
	`dept_id` VARCHAR(255) NOT NULL,
	PRIMARY KEY (`c_id`)
);

CREATE TABLE IF NOT EXISTS `student` (
	`s_id` VARCHAR(36) NOT NULL,
	`s_name` VARCHAR(255) NOT NULL,
	`gender` VARCHAR(6) NOT NULL,
	`dob` DATE NOT NULL,
	`email` VARCHAR(255) NOT NULL UNIQUE,
	`s_address` VARCHAR(255) NOT NULL,
	`contact` VARCHAR(12) NOT NULL,
	`password` VARCHAR(255) NOT NULL,
	`section` INT NOT NULL,
	`joining_date` DATE DEFAULT(CURRENT_DATE),
	`dept_id` VARCHAR(255),
	`parent_id` VARCHAR(255),
	PRIMARY KEY (`s_id`)
);

CREATE TABLE IF NOT EXISTS `staff` (
	`st_id` VARCHAR(36) NOT NULL,
	`st_name` VARCHAR(255) NOT NULL,
	`gender` VARCHAR(6) NOT NULL,
	`dob` DATE NOT NULL,
	`email` VARCHAR(255) NOT NULL UNIQUE,
	`st_address` VARCHAR(255) NOT NULL,
	`contact` VARCHAR(12) NOT NULL,
	`dept_id` VARCHAR(255) NOT NULL,
	`password` VARCHAR(255) NOT NULL,
	PRIMARY KEY (`st_id`)
);

CREATE TABLE IF NOT EXISTS `parent` (
    `p_id` VARCHAR(36) NOT NULL,
    `p_name` VARCHAR(255) NOT NULL,
    `gender` VARCHAR(6) NOT NULL,
    `dob` DATE NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `p_address` VARCHAR(255) NOT NULL,
    `contact` VARCHAR(12) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`p_id`)
);

CREATE TABLE IF NOT EXISTS `department` (
	`dept_id` VARCHAR(255) NOT NULL UNIQUE,
	`d_name` VARCHAR(255) NOT NULL UNIQUE,
	PRIMARY KEY (`dept_id`)
);

CREATE TABLE IF NOT EXISTS `fee` (
	`fee_id` INT NOT NULL AUTO_INCREMENT UNIQUE,
	`fee_type` VARCHAR(255) NOT NULL,
	`reciept_no` BINARY NOT NULL ,
	`date` DATE NOT NULL UNIQUE,
	`s_id` VARCHAR(36) NOT NULL,
	PRIMARY KEY (`fee_id`)
);

CREATE TABLE IF NOT EXISTS `class` (
	`class_id` INT NOT NULL AUTO_INCREMENT UNIQUE,
	`section` INT NOT NULL,
	`semester` INT NOT NULL,
	`year` DATE DEFAULT(CURRENT_DATE),
	`c_id` VARCHAR(100),
	`st_id` VARCHAR(36) NOT NULL,
	PRIMARY KEY (`class_id`)
);

CREATE TABLE IF NOT EXISTS `assignment` (
	`asg_id` INT NOT NULL AUTO_INCREMENT,
	`day` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`deadline` DATETIME NOT NULL,
	`class_id` INT NOT NULL,
	PRIMARY KEY (`asg_id`)
);
DROP TABLE `attendance`;
CREATE TABLE IF NOT EXISTS `attendance` (
	`s_id` VARCHAR(36) NOT NULL,
	`date` DATE NOT NULL,
	`status` BOOLEAN DEFAULT NULL,
    `c_id` VARCHAR(36),
	PRIMARY KEY (`s_id`,`date`)
);
DROP TABLE `marks`;
CREATE TABLE IF NOT EXISTS `marks` (
    `test_name` VARCHAR(45) NULL,
	`test_id` INT NOT NULL AUTO_INCREMENT,
	`test_marks` VARCHAR(30),
	`course_id` VARCHAR(45),
	`course_name` VARCHAR(36) NOT NULL,
	`s_id` VARCHAR(36) NOT NULL,
	PRIMARY KEY (`test_id`)
);

CREATE TABLE IF NOT EXISTS `assignment_submission` (
	`s_id` VARCHAR(36) NOT NULL,
	`asg_id` INT NOT NULL,
	PRIMARY KEY (`s_id`,`asg_id`)
);

CREATE TABLE IF NOT EXISTS `time_table` (
	`c_id` VARCHAR(100),
	`st_id` VARCHAR(36) NOT NULL,
	`section` INT NOT NULL,
	`day` INT NOT NULL,
	`start_time` TIME NOT NULL,
	`end_time` TIME NOT NULL,
	PRIMARY KEY (`c_id`,`section`,`day`)
);

DROP TABLE `file`;
CREATE TABLE `file` (
                        `id` varchar(45) NOT NULL,
                        `name` varchar(255) NOT NULL,
                        `description` text NOT NULL,
                        `subject_name` varchar(45),
                        `s_id` varchar(45)
);
DROP TABLE `assignmentfile`;
create table `assignmentfile`
(
    `id`        varchar(45)  not null,
    `name`        varchar(255) not null,
    `description` text         not null,
    `st_id`       varchar(45)  null
);

DROP TABLE `notice`;
CREATE TABLE IF NOT EXISTS `notice`(
            `n_id` VARCHAR(36) NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `description` text NOT NULL,
            `added_by` VARCHAR(255),
            `added_date` DATE
);
DROP TABLE `payment`;
CREATE TABLE IF NOT EXISTS `payment`(
                                       `payment_id` VARCHAR(36) NOT NULL,
                                       `email` VARCHAR(255) NOT NULL,
                                       `name` VARCHAR(255) NOT NULL,
                                       `payment_date` DATE,
                                       `amount` double NOT NULL,
                                       `year` VARCHAR(10),
                                        `s_name`  VARCHAR(255),
                                        `s_id` VARCHAR(255),
                                        PRIMARY KEY (`payment_id`)
);

create table quizcreate
(
    quiz_id   varchar(45)  null,
    questions text         null,
    createdBy varchar(100) null
);
create table quizdetails
(
    quiz_id           varchar(100) not null
        primary key,
    quiz_name         varchar(55)  null,
    subjectName       varchar(100) null,
    numberOfQuestions int          null,
    createdBy         varchar(45)  null
);

create table answer
(
    quiz_id    varchar(50) null,
    answers    text        null,
    answeredBy varchar(200) null
);


ALTER TABLE `course` ADD CONSTRAINT `course_fk0` FOREIGN KEY (`dept_id`) REFERENCES `department`(`dept_id`) on update cascade on delete restrict;

ALTER TABLE `student` ADD CONSTRAINT `student_fk0` FOREIGN KEY (`dept_id`) REFERENCES `department`(`dept_id`) on update cascade on delete restrict;

ALTER TABLE `student` ADD CONSTRAINT `student_fk1` FOREIGN KEY (`parent_id`) REFERENCES `parent`(`p_id`) on update cascade on delete restrict;

ALTER TABLE `staff` ADD CONSTRAINT `staff_fk0` FOREIGN KEY (`dept_id`) REFERENCES `department`(`dept_id`) on update cascade on delete restrict;

ALTER TABLE `fee` ADD CONSTRAINT `fee_fk0` FOREIGN KEY (`s_id`) REFERENCES `student`(`s_id`) on update cascade on delete restrict;

ALTER TABLE `attendance` ADD CONSTRAINT `attendance_fk0` FOREIGN KEY (`s_id`) REFERENCES `student`(`s_id`) on update cascade on delete restrict;

ALTER TABLE `class` ADD CONSTRAINT `class_fk0` FOREIGN KEY (`c_id`) REFERENCES `course`(`c_id`) on update cascade on delete restrict;

ALTER TABLE `class` ADD CONSTRAINT `class_fk1` FOREIGN KEY (`st_id`) REFERENCES `staff`(`st_id`) on update cascade on delete restrict;

ALTER TABLE `assignment` ADD CONSTRAINT `assignment_fk0` FOREIGN KEY (`class_id`) REFERENCES `class`(`class_id`) on update cascade on delete restrict;

ALTER TABLE `assignment_submission` ADD CONSTRAINT `assignment_submission_fk0` FOREIGN KEY (`s_id`) REFERENCES `student`(`s_id`) on update cascade on delete restrict;

ALTER TABLE `assignment_submission` ADD CONSTRAINT `assignment_submission_fk1` FOREIGN KEY (`asg_id`) REFERENCES `assignment`(`asg_id`) on update cascade on delete restrict;

ALTER TABLE `time_table` ADD CONSTRAINT `time_table_fk0` FOREIGN KEY (`c_id`) REFERENCES `course`(`c_id`) on update cascade on delete restrict;

ALTER TABLE `time_table` ADD CONSTRAINT `time_table_fk1` FOREIGN KEY (`st_id`) REFERENCES `staff`(`st_id`) on update cascade on delete restrict;

ALTER TABLE `marks` ADD CONSTRAINT `marks_fk0` FOREIGN KEY (`course_id`) REFERENCES `course`(`c_id`) on update cascade on delete restrict;

ALTER TABLE `marks` ADD CONSTRAINT `marks_fk1` FOREIGN KEY (`s_id`) REFERENCES `student`(`s_id`) on update cascade on delete restrict;

ALTER TABLE `payment` ADD CONSTRAINT `payment_fk1` FOREIGN KEY (`s_id`) REFERENCES `student`(`s_id`) on update cascade on delete restrict;

ALTER TABLE `attendance` ADD CONSTRAINT `attendance_fk1` FOREIGN KEY (`c_id`) REFERENCES `course`(`c_id`) on update cascade on delete restrict;

alter table admin
add resetLink varchar(255) default '';

alter table student
add resetLink varchar(255) default '';

alter table staff
add resetLink varchar(255) default '';

alter table parent
add resetLink varchar(255) default '';
