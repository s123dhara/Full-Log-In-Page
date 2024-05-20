const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")
.then(res => {
    console.log("Database Connection sucessful")
}).catch(err => {
    console.log("no connection")
})

const userSchema = mongoose.Schema({
   username : String, 
   email : String, 
   password : String,
   posts : [ {type : mongoose.Schema.Types.ObjectId, ref : "post"}]
})

module.exports = mongoose.model('Users', userSchema)