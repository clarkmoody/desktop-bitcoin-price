"use strict"

const {app, BrowserWindow, Menu} = require('electron')

let win

function createWindow() {
	win = new BrowserWindow({
		width: 500, 
		height: 150,
		resizable: false,
		title: 'Bitcoin Price'
	})

	// win.webContents.openDevTools()

	win.loadURL(`file:///${__dirname}/index.html`)

	win.on('closed', () => {
		// Dereference window on close
		win = null
	})


	app.setApplicationMenu(null)
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
	// Keep the menu bar open on MacOS
	if(process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
 	if(win == null) {
 		createWindow()
 	}
})