const electron = require('electron');
const url = require('url');
const path = require('path');
const pie = require('puppeteer-in-electron');
const mongoose = require('mongoose');
const { run } = require('./bot');
const { app, BrowserWindow, Menu, ipcMain } = electron;

// DB Config
const db = require('./config/keys').mongoURI;

// Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true ,useUnifiedTopology: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const obj = {
    name: '',
    email: '',
    tel: '',
    address: '',
    zip: '',
    creditCard: '',
    cvv: '',
    keyWords: [],
    month: '',
    year: '',
    refreshDelay: 1000,
    checkoutDelay: 3000
}

// process.env.NODE_ENV = 'production';

let mainWindow;
let addWindow;

// Listen for app to be ready
app.on('ready', async function() {
    // Create new window
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    // Load html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, './views/mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Quit app when closed
    mainWindow.on('closed', function() {
        app.quit();
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu
    Menu.setApplicationMenu(mainMenu);
});

// Handle create add window
function createAddWindow() {
    // Create new window
    addWindow = new BrowserWindow({
        width: 700,
        height: 700,
        title: 'Add Item',
        webPreferences: {
            nodeIntegration: true
        }
    });
    // Load html into window
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, './views/addWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Garbage collection handle to make it run faster
    addWindow.on('close', function() {
        addWindow = null
    })
}

const initializePuppeteer = async () => {
    await pie.initialize(app);
};

initializePuppeteer();

ipcMain.on('run-bot', function(e, params) {
    run(params);
});

ipcMain.on('register', function(e, formData) {
    console.log(formData);
});

// Create menu template
const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open Puppeteer',
                click() {
                    run(obj);
                }
            },
            {
                label: 'Add Item',
                click() {
                    createAddWindow();
                }
            },
            {
                label: 'Clear Items',
                click() {
                    mainWindow.webContents.send('item:clear');
                }
            },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    }
];

// If mac, add empty object to menu
if (process.platform == 'darwin') {
    mainMenuTemplate.unshift({
        label: 'Electron'
    });
}

// Add dev tools item if not in production
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Dev tools',
        submenu: [
            {
                label: 'Toggle dev tools',
                accelerator: 'CmdOrCtrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}