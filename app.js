const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
const dbPath = path.join(__dirname, "userData.db");
app.use(express.json());
let db = null;
const initializeDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBServer();
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send("User created successfully");
    }
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT username, password FROM user WHERE username = '${username}'`;
  const dbUserCheck = await db.get(selectUserQuery);
  console.log(dbUserCheck);
  if (dbUserCheck === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const hisPasswordDecryption = await bcrypt.compare(
      password,
      dbUserCheck.password
    );
    if (hisPasswordDecryption === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//User Password Change API
app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT username, password FROM user WHERE username = '${username}'`;
  const dbUserCheck = await db.get(selectUserQuery);
  if (dbUserCheck === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidOldPassword = await bcrypt.compare(
      oldPassword,
      dbUserCheck.password
    );
    if (isValidOldPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptNewPassword = await bcrypt.hash(
          request.body.newPassword,
          10
        );
        const setNewPasswordQuery = `
        UPDATE user
        SET password='${encryptNewPassword}'
        WHERE username = '${username}';`;
        await db.run(setNewPasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
