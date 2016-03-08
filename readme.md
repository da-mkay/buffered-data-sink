# BufferedDataSink (for NodeJS)

A sink for nodejs that buffers data, queues these buffers and prevents the reader from loading too much data into memory. Wow, that isn't very informative, right? So check out this example:

Consider you want to read a huge amount of data-records and store them in a database. Instead of inserting each record at a time into the database, you will probably want to wait until you collected multiple records and insert them at once. And while the database is processing your request you can continue reading more data. The next bunch of records is queued, and you keep on reading. But at some point you may want to pause reading and wait for the database to catch up.

This is what `BufferedDataSink` allows you to do very easily. It buffers the data you give to it and once the buffer is full, it is handed over to a handler-function to process it (for example: insert records into a database). While processing, the `BufferedDataSink` still accepts new data, which is put into new buffers. All these buffers are queued. If the queue limit is reached then the reader is paused so that it does not push more data to the sink. Once the queue is not full anymore the reader is resumed.

The `BufferedDataSink` plays nicely with node's `readline`:

    function onDone() {
      console.log('All data read and inserted!');
    }

    function insertIntoDatabase(buffer, clb) {
      // Insert data-records of the buffer into the database.
      // Call clb when done.
    }

    var reader = require('readline').createInterface({ input: fs.createReadStream('some_file')})

    var sink = new BufferedDataSink(reader, /*bufferSize=*/100000, /*queueLimit*/1, insertIntoDatabase, onDone)

    reader.on('line', function(line) {
      var data = ... // generate some data based on the line
      sink.push(data);
    });

Here we read `some_file` line by line using node's `readline`. Each line is turned into some data-record that is pushed to the sink. If we have pushed 100000 data-records, the `insertIntoDatabase`-function will be called with the buffer containing all the 100000 data-records. The `reader` continues with reading more lines. After adding another 100000 data-records the `BufferedDataSink` will queue the current buffer (assuming that `insertIntoDatabase` has not finished processing yet). Since the `queueLimit` is set to `1`, the queue is full now. Thus `BufferedDataSink` will tell the `reader` that it should pause, so that no more lines are read. When the processing is finished, the next buffer in the queue is handed over to `insertIntoDatabase`. This means that we have free space in the queue and `BufferedDataSink` will resume the `reader`. Once the `reader` is closed the remaining (maybe not full) buffer is also queued. After all buffers were processed the callback `onDone` is called.

# Spec for the `reader`
It must implement two methods: `pause` and `resume`.
Moreover it must provide the `close`-event.
Just like node's [readline](https://nodejs.org/api/readline.html).
