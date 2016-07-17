require('babel-register');
const child_process = require('child_process');
const electron = require('electron');
const path = require('path');

const app = electron.app;
const protocol = electron.protocol;
const BrowserWindow = electron.BrowserWindow;

const backend_db = require('./backend/db');
const backend_proto = require('./backend/protocols');
const backend_server = require('./backend/server');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let python_server = null;

console.log('Hello world!');

// Initialize the database so that we can initialize everything else downstream.
const dataPath = path.join(app.getPath('userData'), 'reversechrono.db');
const db = backend_db.initializeDatabase(dataPath);

// Initialize the protocol handlers for images and the like.
backend_proto.registerProtocols(db);
backend_server.startServer(db);

function startPythonServer() {
  // Here we go.
  if (python_server === null) {
    console.log('Database file is: ' + dataPath);

    console.log('Starting server...');
    const venv = `${__dirname}/venv`;
    python_server = child_process.spawn(
      'venv/bin/python',
      ['-m', 'sociallists'],
      {
        cwd: __dirname,
        env: {
          VIRTUAL_ENV: venv,
          DB_CONNECTION_STRING: 'sqlite:///' + dataPath,
          PYTHONPATH: __dirname,
        },
      });

    python_server.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    python_server.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    python_server.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }
}

function createWindow() {
  if (mainWindow === null) {
    startPythonServer();

    mainWindow = new BrowserWindow({width: 800, height: 600});
    mainWindow.loadURL(`file://${__dirname}/ui/index.html`);
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('quit', function() {
  if (python_server !== null) {
    console.log('Shutting down server...');
    python_server.kill();
  }
})
