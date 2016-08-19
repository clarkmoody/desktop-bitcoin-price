"use strict"

const {app, BrowserWindow, Menu} = require('electron')

let win

function createWindow() {
	const options = {
		width: 500, 
		height: 150,
		resizable: false,
		title: 'Bitcoin Price'
	}
	if(process.platform === 'darwin') {
		options.titleBarStyle = 'hidden'
	} else {
		options.frame = false
	}
	win = new BrowserWindow(options)

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
