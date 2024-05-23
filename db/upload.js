const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")
.then(res => {
    console.log("Database Connection sucessful for Upload")
}).catch(err => {
    console.log("no connection")
})

const UploadSchema = mongoose.Schema({

    user : {
        type : mongoose.Schema.Types.ObjectId, 
        ref : "conn"
    },
    profile : String,
    signature : String
   
})

module.exports = mongoose.model('upload', UploadSchema)