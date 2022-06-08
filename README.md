# SMS_BACKEND


## Product Features and User Classifications

There are several types of end users for the CMS. They are broadly divided as Students, Staff and the Administrator. Each of these classes have their own set of features

- **ADMIN** who can view and edit the details of any students/staff. Can add/edit departments, courses, classes and time-tables.
- **STAFF** who can view students details, add/update assignments, marks and attendance of a particular student.   They can see the time-table of a particular class also.
- **STUDENT** who can update profile/ add solution to assignments and see marks/attendance.

## Setting up Project

* Open Terminal and execute
    `npm install`
* Create following env variables (in order to connect to database and use JWT) :
  * DB_HOST
  * DB_USER
  * DB_PASS
  * PORT
  * JWT_SECRET
  * JWT_EXPIRE
  * SESSION_SECRET
* For setting up mail-gun Go to official doc of mail-gun. Sign up and replace your credentials here.
  * URL
  * RESET_PASSWORD_KEY
  * DOMAIN_NAME
  * MAILGUN_API_KEY
* Create the database using following query in mysql : `CREATE DATABASE databasename;`
* Create tables using the sql script file in `databse/cms.sql`;
* To seed data in the database run to file in `seed` folder
* To start the application execute `npm start`

