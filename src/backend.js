/**
 * @summary Tries to register a new username. If username or
 * email is busy, register will not be successful and function
 * will return false
 * @param {String} username username of the new user
 * @param {String} password password of the new user
 * @param {String} email email of the new user
 * @param {Database} db database to register user in
 * @returns {Boolean} true if register was successful, false if not
 */
function clientRegister(username, password, email, db) {
  //Checks that the mail consists of (symbols)@(symbols).(symbols)
  //where symbols are a-z or A-Z or 0-9 (+ some extra symbols)
  let mailRegex = new RegExp(
    /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
  );
  if (!username || !password || !email || !db) return false;
  if (username === "root") return false; //TODO: return something else and emit to user
  if (!mailRegex.test(email)) return false;

  const checkUser = db.prepare(
    "SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ?"
  );
  var user = checkUser.get(username, email);

  if (user) return false; //If username or email is busy, return false

  const addUser = db.prepare(
    "INSERT INTO users (username, password, email, score, balance) VALUES (?, ?, ?, ?, ?)"
  ); //resetcode not generated yet
  addUser.run(username, password, email, 0, 50);

  return true;
}

/**
 * @summary logs in a user
 * @param {Database} db database to check user/password against
 * @param {{ID: String, username: String}} users array of all users
 * @param {String} id socket id
 * @returns {String}
 */
function clientLogin(username, password, db, users, id) {
  if (!username || !password || !db || !users || !id) return "invalid";
  if (
    username === "root" &&
    password ===
      "ccca83f860c9ed05f25765c3dbeb6bf5bf3ff69d01e9f74e2da4789e26bff2b8"
  )
    return "root";
    const index = users.findIndex((user) => user.username === username);
    if (users[index]?.username === username) return "loggedInAlready";

  const checkUser = db.prepare(
    "SELECT * FROM users WHERE username = ? COLLATE NOCASE AND password = ?"
  );
  var user = checkUser.get(username, password);
  if (user) {
    users.push({ ID: id, username: username, balance: user.balance });
    return "validUserDetails";
  }
  return "invalidUserDetails";
}

/**
 * @summary logs out a user given a socket id
 * @param {String} id socket id
 * @returns {Boolean} true if client was found, false if not
 */
function clientLogout(id, users) {
  if (!id || !users) return false;
  /* We could use the getUser() function here but we need 
the index for removing the user from the array */
const index = users.findIndex((user) => user.ID === id);
if(index === -1) return false;
users.splice(index, 1);
return true;
}

/**
 * @summary Adds a new question along with it's answers to
 * the database.
 * @param {String} question The question to add
 * @param {[String, String, String, String]} answers An array
 * of strings representing each answer
 * @param {Integer} weekNumber id of the quiz
 * @param {Database} db database to add question to
 * @returns {Boolean} true if input is correct, false if not
 */
function addQuestionNews(question, answers, db, weekNumber) {
  if (
    !question ||
    !answers ||
    answers.includes(undefined) ||
    !weekNumber ||
    !db
  )
    return false;
  if (answers.length !== 3) return false;
  if (typeof weekNumber !== "number" || weekNumber > 52 || weekNumber < 1)
    return false;

  const checkQuestion = db.prepare(
    "SELECT * FROM questions WHERE question = ?"
  );
  var questionExists = checkQuestion.get(question);

  if (questionExists) return false;

  const checkAmount = db.prepare(
    "SELECT * FROM questions WHERE weekNumber = ?"
  );
  amount = checkAmount.all(weekNumber);

  //If amount is undefined, the ? will make sure the whole statement is undefined
  //instead of trying to access length from an undefined value
  if (amount?.length === 10) return false;

  const addQuestion = db.prepare(
    "INSERT INTO questions (question, wrong1, wrong2, correct, weekNumber) VALUES (?, ?, ?, ?, ?)"
  );
  addQuestion.run(question, answers[0], answers[1], answers[2], weekNumber);

  return true;
}

/**
 * @summary Looks up a question in the database and returns
 * the question with it's answers
 * @param {String} question The question to find
 * @param {Database} db database to look up in
 * @returns {{  question: String,
 *              wrong1: String,
 *              wrong2: String,
 *              wrong3: String,
 *              correct: String }}
 */
function getQuestionNews(question, db, weekNumber) {
  if (!question || !db) return undefined;
  const getAnswer = db.prepare(
    "SELECT * FROM questions WHERE question = ? AND weekNumber = ?"
  );

  //This will return undefined if get() does not find any row, which means we don't have to check it manually
  return getAnswer.get(question, weekNumber);
}

/**
 * @summary gets all questions with a given weekNumber
 * @param {Database} db database to look up in
 * @param {Integer} weekNumber the week number of the quiz
 * @returns {[
 *           { question: String,
 *              wrong1: String,
 *              wrong2: String,
 *              correct: String,
 *              weekNumber: Integer
 *              }
 *           , {...}, {...}, ... ]}
 */
function getQuestionsNews(db, weekNumber) {
  if (!weekNumber || !db) return undefined;
  if (weekNumber > 52 || weekNumber < 1) return undefined;

  const getAnswer = db.prepare("SELECT * FROM questions WHERE weekNumber = ?");
  getAnswers = getAnswer.all(weekNumber);

  if (getAnswers.length === 0) return undefined;

  return getAnswers;
}

/**
 * @summary Resets all questions for a given week number
 * @param {Database} db database to reset in
 * @param {Integer} weekNumber number of the week
 * @returns {Boolean} true if questions could be reset,
 * false if not
 */
function resetQuestionsNews(db, weekNumber) {
  if (!weekNumber || !db) return false;

  var deleteQuestions = db.prepare(
    "DELETE FROM questions WHERE weekNumber = ?"
  );
  deleteQuestions.run(weekNumber);
  return true;
}

/**
 * @summary Checks in the database if the question is in the
 * database and if the answer matches the correct one
 * @param {String} question The question to check
 * @param {String} answer The answer to check
 * @param {Database} db database to check in
 * @returns {Boolean} true if answer is correct, false if not
 */
function checkAnswerNews(question, answer, db) {
  if (!question || !answer || !db) return false;

  const checkAnswer = db.prepare(
    "SELECT * FROM questions WHERE question = ? AND correct = ?"
  );
  var correct = checkAnswer.get(question, answer);
  return correct;
}

/**
 * @summary Adds a new question along with it's answers to
 * the database.
 * @param {String} question The question to add
 * @param {[String, String, String, String]} answers An array
 * of strings representing each answer
 * @param {Integer} weekNumber id of the quiz
 * @param {Database} db database to add question to
 * @returns {Boolean} true if input is correct, false if not
 */
function addQuestionArticle(question, answers, db, weekNumber) {
  if (
    !question ||
    !answers ||
    answers.includes(undefined) ||
    !weekNumber ||
    !db
  )
    return false;
  if (answers.length !== 4) return false;
  if (typeof weekNumber !== "number" || weekNumber > 52 || weekNumber < 1)
    return false;
  const checkQuestion = db.prepare(
    "SELECT * FROM questionsArticle WHERE question = ?"
  );
  var questionExists = checkQuestion.get(question);

  if (questionExists) return false;
  const checkAmount = db.prepare(
    "SELECT * FROM questionsArticle WHERE weekNumber = ?"
  );
  amount = checkAmount.all(weekNumber);

  //If amount is undefined, the ? will make sure the whole statement is undefined
  //instead of trying to access length from an undefined value
  if (amount?.length === 10) return false;

  const addQuestion = db.prepare(
    "INSERT INTO questionsArticle (question, wrong1, wrong2, wrong3, correct, weekNumber) VALUES (?, ?, ?, ?, ?, ?)"
  );
  addQuestion.run(
    question,
    answers[0],
    answers[1],
    answers[2],
    answers[3],
    weekNumber
  );

  return true;
}

/**
 * @summary gets all questions with a given weekNumber
 * @param {Database} db database to look up in
 * @param {Integer} weekNumber the week number of the quiz
 * @returns {[
 *           { question: String,
 *              wrong1: String,
 *              wrong2: String,
 *              correct: String,
 *              weekNumber: Integer
 *              }
 *           , {...}, {...}, ... ]}
 */
function getQuestionsArticle(db, weekNumber) {
  if (!weekNumber || !db) return undefined;
  if (weekNumber > 52 || weekNumber < 1) return undefined;

  const getAnswer = db.prepare(
    "SELECT * FROM questionsArticle WHERE weekNumber = ?"
  );
  getAnswers = getAnswer.all(weekNumber);

  if (getAnswers?.length === 0) return undefined;

  return getAnswers;
}

/**
 * @summary Resets all questions for a given week number
 * @param {Database} db database to reset in
 * @param {Integer} weekNumber number of the week
 * @returns {Boolean} true if questions could be reset,
 * false if not
 */
function resetQuestionsArticle(db, weekNumber) {
  if (!weekNumber || !db) return false;

  var deleteQuestions = db.prepare(
    "DELETE FROM questionsArticle WHERE weekNumber = ?"
  );
  deleteQuestions.run(weekNumber);
  return true;
}

/**
 * @summary Checks in the database if the question is in the
 * database and if the answer matches the correct one
 * @param {String} question The question to check
 * @param {String} answer The answer to check
 * @param {Database} db database to check in
 * @returns {Boolean} true if answer is correct, false if not
 */
function checkAnswerArticle(question, answer, db) {
  if (!question || !answer || !db) return false;

  const checkAnswer = db.prepare(
    "SELECT * FROM questionsArticle WHERE question = ? AND correct = ?"
  );
  var correct = checkAnswer.get(question, answer);
  return correct;
}

/**
 * @summary Adds a coupon to the database
 * @param {String} name name of the coupon
 * @param {Integer} price price of the coupon
 * @param {Database} db database to add coupon to
 * @returns {Boolean} true if coupon was successfully
 * added, false if not
 */
function addCoupon(name, price, db) {
  if (!name || !price || !db) return false;

  const checkCoupon = db.prepare("SELECT * FROM coupons WHERE name = ?");
  var couponExists = checkCoupon.get(name);

  if (couponExists) return false;

  const addCoupon = db.prepare(
    "INSERT INTO coupons (name, price) VALUES (?, ?)"
  );
  addCoupon.run(name, price);

  return true;
}

/**
 * @summary Gets all coupons from the database
 * @param {Database} db database to get coupon from
 * @returns {Coupon}
 */
function getCoupons(db) {
  if (!db) return undefined;
  const getCoupons = db.prepare("SELECT * FROM coupons");

  return getCoupons.all();
}

/**
 * @summary Deletes all coupons
 * @param {Database} db database to delete coupons from
 */
function resetCoupons(db) {
  if (!db) return false;

  var deleteCoupons = db.prepare("DELETE FROM coupons");
  deleteCoupons.run();
  return true;
}

/**
 * @summary Adds an article to the database
 * @param {String} name name of the article
 * @param {String} link link to article
 * @param {Database} db database to add article to
 * @returns {Article} true if article was successfully
 * added, false if not
 */
function addArticle(name, link, weekNumber, db) {
  if (!name || !link || !weekNumber || !db) return false;

  const checkArticle = db.prepare("SELECT * FROM articles WHERE name = ? AND weekNumber = ?");
  var articleExists = checkArticle.get(name, weekNumber);

  if (articleExists) return false;

  const addArticle = db.prepare(
    "INSERT INTO articles (name, link, weekNumber) VALUES (?, ?, ?)"
  );
  addArticle.run(name, link, weekNumber);

  return true;
}

/**
 * @summary Gets an article from the database given an article name
 * @param {String} name name of article to get
 * @param {Database} db database to get article from
 * @returns
 */
function getArticle(name, db) {
  if (!name || !db) return undefined;
  const getArticle = db.prepare("SELECT * FROM articles WHERE name = ?");

  return getArticle.get(name);
}

/**
 * @summary Gets all articles given a weekNumber
 * @param {Integer} weekNumber number of the week to get articles from
 * @param {Database} db database to get articles from
 * @returns
 */
 function getArticles(weekNumber, db) {
  if (!weekNumber || !db) return undefined;
  const getArticle = db.prepare("SELECT * FROM articles WHERE weekNumber = ?");

  return getArticle.all(weekNumber);
}

/**
 * @summary Deletes all articles for a given week
 * @param {Database} db database to get articles from
 * @param {Integer} weekNumber number of the week to reset
 */
function resetArticles(db, weekNumber) {
  if (!db || !weekNumber) return false;

  var deleteArticles = db.prepare("DELETE FROM articles WHERE weekNumber = ?");
  deleteArticles.run(weekNumber);
  return true;
}

/**
 * Sends an email from TheRealDeal.reset@gmail.com to the
 * specified email
 * @param {String} code code to send
 * @param {String} email email to send to
 * @param {Object} nodemailer node to send email from
 * @throws error if mail is not existent
 */
function sendMail(code, email, nodemailer) {
  if (!code || !email || !nodemailer) return;

  var transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: "TheRealDeal.reset@gmail.com",
      pass: "Brf5mBLxAw5LZg2h",
    },
  });

  var mailOptions = {
    from: "TheRealDeal.reset@gmail.com",
    to: email,
    subject: "Password Reset",
    text: `Hello!\n\nWe wanted to let you know that your password in the Real Deal has been reset.\nHere is your reset code: ${code}\nIf you did not perform this action, please reset your password in the Real Deal application.`,
  };
  console.log(mailOptions)
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log(info);
  });
}

/**
 * Generates a pseudo-random string of letters
 * @param {String} length length of the string
 * @returns {String} pseudo-random string or undefined if
 * length is 0
 */
function generateCode(length) {
  if (length == 0) return undefined;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    //Might give non integer value, so we floor the value
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

/**
 * @summary Inserts a resetcode in the database for a user
 * given an email
 * @param {String} code resetcode to insert
 * @param {String} email email of the user
 * @param {Database} db database to add code to
 */
function insertCode(code, email, db) {
  if (!code || !email || !db) return;

  const insertCode = db.prepare(
    `UPDATE users SET resetcode = ? WHERE email = ?`
  );
  insertCode.run(code, email);
}

/**
 * @summary Checks if a resetcode matches a given email in
 * the database
 * @param {String} code resetcode to test
 * @param {String} email email to test the code with
 * @param {Database} db database to check code against
 * @returns {Boolean} true if code matches, false if not
 */
function checkCode(code, email, db) {
  if (!code || !email || !db) return false;

  const checkCode = db.prepare(
    `SELECT * FROM users WHERE resetcode = ? AND email = ?`
  );
  var user = checkCode.get(code, email);
  return(user !== undefined);
}

/**
 * @summary Updates the password for a user with a given email
 * @param {String} password password of the user
 * @param {String} email email of the user
 * @param {Database} db database to update password in
 * @return {Boolean} true if password, email and database is valied, false
 * if not
 */
function updatePassword(password, email, db) {
  if (!password || !email || !db) return false;

  const updatePassword = db.prepare(
    `UPDATE users SET password = ? WHERE email = ?`
  );
  updatePassword.run(password, email);

  return true;
}

/**
 * @summary Checks if an email exists in the database
 * @param {String} email email to check
 * @param {Database} db database to check mail against
 * @returns {Boolean} true if email exists, false if not
 */
function checkMail(email, db) {
  if (!email || !db) return false;

  const checkMail = db.prepare(`SELECT * FROM users WHERE email = ?`);
  var mail = checkMail.get(email);
  return mail !== undefined;
}

/**
 * @summary calculates number of seconds
 * between a given date and now
 * @param {Date} date to compare with
 * @returns {Number} seconds between now and date
 */
function calculateTimeToDateSeconds(date) {
  var now = new Date();
  var timeToDate = date.getTime() / 1000 - now.getTime() / 1000;
  return timeToDate;
}

/**
 * @summary Converts seconds to days, hours, minutes and
 * seconds
 * @param {String} counter seconds to convert to string
 * @returns {String} "stringified" seconds
 */
function stringifySeconds(counter) {
  var day = 86400; //A day in seconds
  var hour = 3600; //An hour in seconds
  var minute = 60; //A minute in seconds
  // Figure out better solution for calculating this.
  days = Math.floor(counter / day);
  hours = Math.floor((counter % day) / hour);
  if (days > 1) return days + " days " + hours + " hours";
  minutes = Math.floor(((counter % day) % hour) / minute);
  seconds = Math.floor(((counter % day) % hour) % minute);
  return (
    (hours < 10 ? "0" + hours : hours) +
    ":" +
    (minutes < 10 ? "0" + minutes : minutes) +
    ":" +
    (seconds < 10 ? "0" + seconds : seconds)
  );
}

/**
 * @summary Gets the username for a given socket id
 * @param {String} id id of the socket
 * @param {{ID: String, username: String}} users array of all users
 * @returns {String} username for the given socket id or undefined
 * if it can't find the user
 */
function getUser(id, users) {
  if (!id || !users) return undefined;

  const index = users.findIndex((user) => user.ID === id)
  return users[index]?.username;
}

function getBalance(id, users, db) {
  const username = getUser(id, users);

  if (!username) return undefined;

  const getBalance = db.prepare("SELECT balance FROM users WHERE username = ?");
  const balance = getBalance.get(username).balance;
  return balance;
}

function changeBalance(id, users, price, db) {
  const currentBalance = getBalance(id, users, db);

  if (currentBalance === undefined || currentBalance - price < 0)
    return undefined;
  const username = getUser(id, users);
  const newBalance = currentBalance - price;

  const dbBalance = db.prepare(
    `UPDATE users SET balance = ? WHERE username = ?`
  );
  dbBalance.run(newBalance, username);
  return newBalance;
}

/**
 * @function
 * @summary gets the top 5 players from the database
 * @param {Database} db the database
 * @returns {Array} an array of 5 users and their score
 */
function getTopPlayersNewsQ(db) {
  const users = db
    .prepare(`SELECT username, score FROM users ORDER BY score DESC LIMIT 5`)
    .all();
  return users;
}
/**
 * @function
 * @summary gets the top 5 players from the database
 * @param {Database} db the database
 * @returns {Array} an array of 5 users and their score
 */
function getTopPlayersArtQ(db) {
  const users = db
    .prepare(
      `SELECT username, scoreArticle FROM users ORDER BY scoreArticle DESC LIMIT 5`
    )
    .all();
  return users;
}

/**
 *
 * @param {{id: String, sharedKey: Integer}} clients an array of connected
 * sockets and information about them
 * @param {String} encryptedPassword password to decrypt
 * @param {String} id id of socket
 * @returns {String} decrypted password
 */
function decryptPassword(clients, encryptedPassword, id) {
  if (!clients || !encryptedPassword || !id) return undefined;
  var CryptoJS = require("crypto-js");
  var sharedKey;
  const index = clients.findIndex((client) => client.id === id);
  sharedKey = clients[index].key;
  if (!sharedKey) return undefined;
  //decrypt the password using the key
  var decryptedPassword = CryptoJS.AES.decrypt(
    encryptedPassword,
    sharedKey.toString()
  ).toString(CryptoJS.enc.Utf8);

  return decryptedPassword;
}

/**
 * @summary returns a random prime between 5000-10000
 * @returns {Integer} prime number
 */
function randomPrime() {
  const fs = require("fs");
  var primeArray = fs
    .readFileSync("misc/prime-numbers.txt", "utf-8")
    .split("\n");
  var random = Math.floor(Math.random() * primeArray.length);
  return parseInt(primeArray[random]);
}

/**
 * @summary Gets user with registered email
 * @param {String} email email of the user
 * @param {Database} db database to get user from
 * @returns {String} the username if found, undefined if not
 */
function getUserByEmail(email, db) {
  if (!email) return undefined;
  const user = db
    .prepare(`SELECT username FROM users WHERE email = ?`)
    .get(email).username;
  return user;
}

/**
 * @summary Fetches the score from a user from the database
 * @param {String} username the user we want to get score from
 * @param {Database} db the database
 * @returns {Number} the score of the user
 */
function getScore(username, db) {
  if (!username) return;
  const checkScore = db.prepare("SELECT score from users WHERE username = ?");
  var score = checkScore.get(username);
  if (!score || !score.scoreArticle) return 0;
  return parseInt(score.score);
}
/**
 * @summary Updates the score of a user in the database
 * @param {String} username the user we want to get score from
 * @param {Number} newScore the updated score
 * @param {database} db the database
 */
function updateScore(username, newScore, db) {
  if (!username) return;
  const updateScore = db.prepare(
    "UPDATE users SET score = ? WHERE username = ?"
  );
  updateScore.run(newScore, username);
}

/**
 * @summary Fetches the score from a user from the database
 * @param {String} username the user we want to get score from
 * @param {Database} db the database
 * @returns {Number} the score of the user
 */
function getScoreArticle(username, db) {
  if (!username) return;
  const checkScore = db.prepare(
    "SELECT scoreArticle from users WHERE username = ?"
  );
  var score = checkScore.get(username);
  if (!score || !score.scoreArticle) return 0;
  return parseInt(score.scoreArticle);
}
/**
 * @summary Updates the score of a user in the database
 * @param {String} username the user we want to get score from
 * @param {Number} newScore the updated score
 * @param {database} db the database
 */
function updateScoreArticle(username, newScore, db) {
  if (!username) return;
  const updateScore = db.prepare(
    "UPDATE users SET scoreArticle = ? WHERE username = ?"
  );
  updateScore.run(newScore, username);
}

exports.clientLogin = clientLogin;
exports.clientRegister = clientRegister;
exports.clientLogout = clientLogout;
exports.addQuestionNews = addQuestionNews;
exports.getQuestionNews = getQuestionNews;
exports.getQuestionsNews = getQuestionsNews;
exports.resetQuestionsNews = resetQuestionsNews;
exports.checkAnswerNews = checkAnswerNews;
exports.addQuestionArticle = addQuestionArticle;
exports.getQuestionsArticle = getQuestionsArticle;
exports.resetQuestionsArticle = resetQuestionsArticle;
exports.checkAnswerArticle = checkAnswerArticle;
exports.addCoupon = addCoupon;
exports.getCoupons = getCoupons;
exports.resetCoupons = resetCoupons;
exports.addArticle = addArticle;
exports.getArticle = getArticle;
exports.getArticles = getArticles;
exports.resetArticles = resetArticles;
exports.sendMail = sendMail;
exports.checkMail = checkMail;
exports.insertCode = insertCode;
exports.checkCode = checkCode;
exports.updatePassword = updatePassword;
exports.generateCode = generateCode;
exports.calculateTimeToDateSeconds = calculateTimeToDateSeconds;
exports.stringifySeconds = stringifySeconds;
exports.getUser = getUser;
exports.getBalance = getBalance;
exports.changeBalance = changeBalance;
exports.decryptPassword = decryptPassword;
exports.randomPrime = randomPrime;
exports.getUserByEmail = getUserByEmail;
exports.updateScore = updateScore;
exports.getScore = getScore;
exports.updateScoreArticle = updateScoreArticle;
exports.getScoreArticle = getScoreArticle;
exports.getTopPlayersNewsQ = getTopPlayersNewsQ;
exports.getTopPlayersArtQ = getTopPlayersArtQ;
