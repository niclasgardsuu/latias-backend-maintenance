var app = require('express')('192.168.1.150');
var nodemailer = require('nodemailer');

const Database = require('better-sqlite3');
const db = new Database('database.db', { verbose: console.log });

/** 
 * CORS is a mechanism which restricts us from hosting both the client and the server.
 * The package cors allows us the bypass this
 * */ 
var cors = require('cors');
app.use(cors());

/// Creates an HTTP server using ExpressJS
var http = require('http').createServer(app);
const PORT = 8080;
/// The cors: ... is also required to bypass the restriction stated above
var client = require('socket.io')(http, {cors: {origin:"*"}});

/// Starts listening on the chosen port
http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

/// Determines the behaviour for when a client connects to our socket.
client.on('connection', (socket) => {
    console.log("new client connected");
    socket.emit('connection');
    socket.on('register', (username, password, email) => {
        if(clientRegister(username, password, email)) socket.emit('registerSuccess');
        else socket.emit('registerFailure');
    });
    socket.on('login', (username, password) => {
        if(clientLogin(username, password)) socket.emit('loginSuccess');
        else socket.emit('loginFailure');
    });
    socket.on('resetPass', (email) => {
        if(checkMail(email)) { 
            var code = generateCode(8);
            insertCode(code, email);
            sendMail(code, email);
            socket.emit('emailSuccess');
        } else {
            socket.emit('emailFailure');       
        }
    })
    socket.on('submitCode', (code, email) => {
        if(checkCode(code, email)) socket.emit('codeSuccess');
        else socket.emit('codeFailure');
    })
    socket.on('updatePass', (email, password) => {updatePassword(password, email)});
    
    setInterval(() =>{
        socket.emit("timeLeft", stringifySeconds(counter))
        }, 1000);
});

function clientRegister(username, password, email) {
    //This should only be necessary while testing as the table SHOULD exist already
    const table = db.prepare('CREATE TABLE IF NOT EXISTS users (username VARCHAR(255), password VARCHAR(255), email varchar(255), resetcode varchar(255))');
    table.run();

    const checkUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    var user = checkUser.get(username, email);

    if(user !== undefined) return false; //If username is busy, return false

    const addUser = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)'); //resetcode not generated yet
    addUser.run(username, password, email);

    return true;
}

function clientLogin(username, password) {
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
    var user = checkUser.get(username, password);

    return user !== undefined;
}

function addQuestion(question, answers) {
    if(answers.length !== 4) return;
    const table = db.prepare('CREATE TABLE IF NOT EXISTS questions (question varchar(255), A1 varchar(255), A2 varchar(255), A3 varchar(255), A4 varchar(255))');
    table.run();

    const addQuestion = db.prepare('INSERT INTO questions (question, A1, A2, A3, A4) VALUES (?, ?, ?, ?, ?)');
    addQuestion.run(question, answers[0], answers[1], answers[2], answers[3]);
}


function sendMail(code, email) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'TheRealDeal.reset@gmail.com',
          pass: 'Brf5mBLxAw5LZg2h'
        }
      });
      
      var mailOptions = {
        from: 'TheRealDeal.reset@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `Hello!\n\nWe wanted to let you know that your password in the Real Deal has been reset.\nHere is your reset code: ${code}\nIf you did not perform this action, please reset your password in the Real Deal application.`
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log(error);
            else console.log(info);
      });
}

function generateCode(length) {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for ( let i = 0; i < length; i++ ) {
        //Might give non integer value, so we floor the value
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

function insertCode(code, email) {
    const insertCode = db.prepare(`UPDATE users SET resetcode = ? WHERE email = ?`);
    insertCode.run(code, email);
}

function checkCode(code, email) {
    const checkCode = db.prepare(`SELECT * FROM users WHERE resetcode = ? AND email = ?`);
    var user = checkCode.get(code, email);
    return user !== undefined;
}

function updatePassword(password, email) {
    const updatePassword = db.prepare(`UPDATE users SET password = ? WHERE email = ?`);
    updatePassword.run(password, email);
}

function checkMail(email) {
    const checkMail = db.prepare(`SELECT * FROM users WHERE email = ?`);
    var mail = checkMail.get(email);
    return mail !== undefined;
}

var counter = 604800;
var countDown = setInterval(function(){
    counter--;
    if (counter === 0) {
        //TODO: when counter is done, open up the quiz!
        console.log("counter done");
        clearInterval(countDown);
    }
}, 1000);

function stringifySeconds(counter) {
    var day = 86400; //A day in seconds
    var hour = 3600; //An hour in seconds
    var minute = 60; //A minute in seconds
    // Figure out better solution for calculating this.
    days = Math.floor(counter/day);
    hours = Math.floor((counter%day)/hour);
    minutes = Math.floor(((counter%day)%hour)/minute)
    seconds = Math.floor(((counter%day)%hour)%minute);
    return "days: " + days + " hours: " + hours + " minutes: " + minutes + " seconds: " + seconds;
}