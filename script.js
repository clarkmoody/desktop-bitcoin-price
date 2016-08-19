const {remote, shell} = require('electron')

/* Order Book sync steps:
  1. Subscribe to WebSocket for updates, start caching messages
  2. Wait until first message is received
  3. Fetch the full order book
  4. Discard cached live messages with timestamps before order book stamp
  5. Apply cached messages after book stamp
  6. Stop caching and apply new messages to book
*/

const socket = new Pusher('de504dc5763aeef9ff52')
socket.connection.bind('state_change', handleState)

const channel = socket.subscribe('diff_order_book')
channel.bind('data', handleBookDiff)

const lastQuote = {
  bid: {
    price: 0,
    amount: 0
  },
  ask: {
    price: 0,
    amount: 0
  }
}
const book = {
  ts: 0,
  bids: [],
  asks: []
}

let sync = true
let loading = false
const cache = []

/* data:
{
  timestamp: "1470000000".
  bids: [
    ["price","amount"], ...
  ],
  asks: [
    ["price","amount"], ...
  ]
}*/
function handleBookDiff(data) {
  if(sync) {
    cache.push(data)
    if(!loading) {
      loadBook()
      loading = true
    }
    return
  }

  const ts = parseInt(data.timestamp)
  if(ts <= book.ts)
    return
  book.ts = ts

  for(let i=0; i<data.bids.length; i++) {
    let bid = data.bids[i]
    let price = parseFloat(bid[0])
    for(let j=0; j<book.bids.length; j++) {
      let bPrice = parseFloat(book.bids[j][0])
      if(bid[0] == bPrice) {
        // Same price as existing bid
        if(parseFloat(bid[1]) < 1e-10) {
          // Remove bid (zero amount)
          book.bids.splice(j,1)
        } else {
          // Update amount
          book.bids[j][1] = bid[1]
        }
        break
      } else if(price > bPrice) {
        // Slot in before an existing bid
        if(parseFloat(bid[1]) > 0) {
          book.bids.splice(j,0,bid)
        }
        break
      }
    }
  }

  for(let i=0; i<data.asks.length; i++) {
    let ask = data.asks[i]
    let price = parseFloat(ask[0])
    for(let j=0; j<book.asks.length; j++) {
      let bPrice = parseFloat(book.asks[j][0])
      if(ask[0] == bPrice) {
        // Same price as existing ask
        if(parseFloat(ask[1]) < 1e-10) {
          // Remove ask (zero amount)
          book.asks.splice(j,1)
        } else {
          // Update amount
          book.asks[j][1] = ask[1]
        }
        break
      } else if(price < bPrice) {
        // Slot in before an existing ask
        if(parseFloat(ask[1]) > 0) {
          book.asks.splice(j,0,ask)
        }
        break
      }
    }
  }

  processQuote(quote())
}

function quote() {
  return {
    bid: {
      price: book.bids.length > 0 ? parseFloat(book.bids[0][0]) : NaN,
      amount: book.bids.length > 0 ? parseFloat(book.bids[0][1]) : NaN
    },
    ask: {
      price: book.asks.length > 0 ? parseFloat(book.asks[0][0]) : NaN,
      amount: book.asks.length > 0 ? parseFloat(book.asks[0][1]) : NaN
    }
  }
}

function processQuote(q) {
  function blank(id) {
    document.getElementById(id).innerHTML = '&mdash;'
  }
  function setVal(id,val,prec) {
    document.getElementById(id).innerHTML = val.toFixed(prec)
  }
  if(isNaN(q.bid.price)) {
    blank('bid-price')
    blank('bid-amount')
  } else {
    setVal('bid-price',q.bid.price,2)
    setVal('bid-amount',q.bid.amount,5)
    if(q.bid.price > lastQuote.bid.price) {
      flashClass('bid-price','up','dn',2500)
    } else if(q.bid.price < lastQuote.bid.price) {
      flashClass('bid-price','dn','up',2500)
    }
    if(q.bid.amount > lastQuote.bid.amount) {
      flashClass('bid-amount','up','dn',2500)
    } else if(q.bid.amount < lastQuote.bid.amount) {
      flashClass('bid-amount','dn','up',2500)
    }
  }
  if(isNaN(q.ask.price)) {
    blank('ask-price')
    blank('ask-amount')
  } else {
    setVal('ask-price',q.ask.price,2)
    setVal('ask-amount',q.ask.amount,5)
    if(q.ask.price > lastQuote.ask.price) {
      flashClass('ask-price','up','dn',2500)
    } else if(q.ask.price < lastQuote.ask.price) {
      flashClass('ask-price','dn','up',2500)
    }
    if(q.ask.amount > lastQuote.ask.amount) {
      flashClass('ask-amount','up','dn',2500)
    } else if(q.ask.amount < lastQuote.ask.amount) {
      flashClass('ask-amount','dn','up',2500)
    }
  }

  lastQuote.bid.price = q.bid.price
  lastQuote.bid.amount = q.bid.amount
  lastQuote.ask.price = q.ask.price
  lastQuote.ask.amount = q.ask.amount
}

function loadBook() {
  getJSON('https://www.bitstamp.net/api/v2/order_book/btcusd/').then((result) => {
    book.bids = result.bids
    book.asks = result.asks
    book.ts = parseInt(result.timestamp)

    sync = false
    loading = false

    while(cache.length > 0) {
      handleBookDiff(cache.splice(0,1)[0])
    }
  }, (err) => {

  })
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'json'
    xhr.onload = function(e) {
      if (this.status == 200) {
        resolve(this.response)
      } else {
        reject()
      }
    }
    xhr.onerror = reject
    xhr.send()
  })
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

const fids = {}
function flashClass(id,add,rem,duration) {
  const el = document.getElementById(id)
  if(typeof el === 'undefined')
    return
  el.classList.remove(rem)
  el.classList.add(add)
  if(fids[id])
    window.clearTimeout(fids[id])
  fids[id] = window.setTimeout(() => {
    el.classList.remove(add)
  }, duration)
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
