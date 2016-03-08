/*
  BufferedDataSink
  Copyright (C) 2016  da-mkay (https://github.com/da-mkay)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * A sink that passes buffered data to the bufferedDataHandler and pauses the
 * specified reader if the queue is full.
 *
 * Use the push() method to add some data to the buffer. If the buffer is full
 * (see bufferSize) then the buffer is passed to the bufferedDataHandler
 * function. You may continue to push() data while the bufferedDataHandler has
 * not finished yet. However the bufferedDataHandler is only called once at a
 * time. Buffers are queued before handed over to the bufferedDataHandler. If
 * the queueLimit is exceeded, then the given reader is paused. This avoids
 * loading too much data into memory. When the reader is closed and all buffers
 * were handed over to the dataHandler then the callback clb is called.
 */
var BufferedDataSink = function (reader, bufferSize, queueLimit,
	bufferedDataHandler, clb) {

  var bufferQueue = []
    , curBuffer = []
    , running = false
    , closed = false

  function next () {
    if (bufferQueue.length == 0) {
      if (closed) {
        clb()
      }
      return
    }
    if ((running && bufferQueue.length >= queueLimit) ||
        (!running && bufferQueue.length > queueLimit)) {
      reader.pause()
    } else {
      reader.resume()
    }
    if (running) {
      return
    }
    running = true
    var nextBuffer = bufferQueue.shift()
    bufferedDataHandler(nextBuffer, function() {
      running = false
      next()
    })
  }

  function onClose () {
    closed = true
    if (curBuffer.length > 0) {
      bufferQueue.push(curBuffer)
      next()
      return
    }
    if (!running) {
      clb()
    } // else: next() will be called again
      // --> calls clb() at end because of closed-flag
  }

  this.push = function push (data) {
    curBuffer.push(data)
    if (curBuffer.length == bufferSize) {
      bufferQueue.push(curBuffer)
      curBuffer = []
      next()
    }
  }

  reader.on('close', onClose)
}

module.exports = BufferedDataSink