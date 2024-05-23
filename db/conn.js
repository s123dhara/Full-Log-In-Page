const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")
.then(res => {
    console.log("Database Connection sucessful")
}).catch(err => {
    console.log("no connection")
})

const UserSchema = mongoose.Schema({
   username : String, 
   email : String, 
   password : String,
   posts : [ {type : mongoose.Schema.Types.ObjectId, ref : "post"}],
   upload : {type : mongoose.Schema.Types.ObjectId, ref : "upload"}

})

module.exports = mongoose.model('users', UserSchema)