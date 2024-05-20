const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")
.then(res => {
    console.log("connection succesful Post")
}).catch(err => {
    console.log("no connection ")
})

const postSchema = mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "conn"
    },
    
    date : {
        type : Date,
        default : Date.now
    },

    content : String,
    
    likes : [
        {type : mongoose.Schema.Types.ObjectId, ref : "conn"}
    ]
})


module.exports = mongoose.model('post', postSchema)