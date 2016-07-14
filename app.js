const electron = require('electron');
const child_process = require('child_process');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let python_server = null;

console.log('Hello world!');

function startPythonServer() {
  // Here we go.
  if (python_server === null) {
    const venv = `${__dirname}/venv`;
    python_server = child_process.spawn(
      'venv/bin/python',
      ['-m', 'sociallists'],
      {
        cwd: __dirname,
        env: {
          VIRTUAL_ENV: venv,
          DB_CONNECTION_STRING: "postgresql:///sociallists",
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
