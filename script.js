const {remote, shell} = require('electron')

const socket = new Pusher('de504dc5763aeef9ff52')
const channel = socket.subscribe('live_trades')
let lastPrice = 0
channel.bind('trade', handleTrade)
socket.connection.bind('state_change', handleState)

function handleTrade(trade) {
  const price = parseFloat(trade.price)
  const el = document.getElementById('price')
  el.innerHTML = price.toFixed(2)
  const c0 = '#fffdec'
  const h1 = document.getElementsByTagName('h1')[0]
  if(price > lastPrice) {
    // Color UP
    flashClass(h1,'up',2500)
  } else if(price < lastPrice) {
    // Color DOWN
    flashClass(h1,'dn',2500)
  }
  lastPrice = price
}

function handleState(states) {
  // states = {previous: 'oldState', current: 'newState'}
  // console.log(states)
  let s = states.current
  if(typeof s === 'undefined' || s.length == 0)
    return
  s = [s[0].toUpperCase(), s.slice(1)].join('')
  document.getElementById('conn-status').innerHTML = s
}

let fid = -1
let last = ''
function flashClass(el,c,duration) {
  if(last != c)
    el.className = c
  window.clearTimeout(fid)
  fid = window.setTimeout(() => {
    el.classList.remove(c)
  }, duration)
  last = c
}

function close() {
  let win = remote.getCurrentWindow()
  win.close()
}

document.getElementById('close').addEventListener('click', close)
document.getElementsByClassName('close')[0].addEventListener('click', close)

document.getElementById('ext-link').addEventListener('click', (e) => {
  e.preventDefault()
  shell.openExternal('https://clarkmoody.com/')
})